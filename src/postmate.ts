/**
 * The type of messages our frames our sending
 * @type {String}
 */
import { ChildAPIConstructor, ParentAPIConstructor, PostmateConstructor, SanitizeMessage } from './interfaces';

export const messageType = 'application/x-postmate-v1+json';

/**
 * The maximum number of attempts to send a handshake request to the parent
 * @type {Number}
 */
export const maxHandshakeRequests = 5;

/**
 * A unique message ID that is used to ensure responses are sent to the correct requests
 * @type {Number}
 */
let _messageId = 0;

/**
 * Increments and returns a message ID
 * @return {Number} A unique ID for a message
 */
export const generateNewMessageId = (): number => ++_messageId;

/**
 * Postmate logging function that enables/disables via config
 */
export const log = (...args: any[]): void => Postmate.debug ? console.log(...args) : null; // eslint-disable-line no-console

/**
 * Takes a URL and returns the origin
 * @param  {String} url The full URL being requested
 * @return {String}     The URLs origin
 */
export const resolveOrigin = (url: string): string => {
  const a = document.createElement('a');
  a.href = url;
  const protocol = a.protocol.length > 4 ? a.protocol : window.location.protocol;
  const host = a.host.length ? ((a.port === '80' || a.port === '443') ? a.hostname : a.host) : window.location.host;
  return a.origin || `${protocol}//${host}`;
};

const messageTypes: any = {
  handshake: 1,
  'handshake-reply': 1,
  call: 1,
  emit: 1,
  reply: 1,
  request: 1,
};

/**
 * Ensures that a message is safe to interpret
 * @param  {Object} message The postmate message being sent
 * @param  {String|Boolean} allowedOrigin The whitelisted origin or false to skip origin check
 * @return {Boolean}
 */
export const sanitize = (message: SanitizeMessage, allowedOrigin?: string): boolean => {
  if (typeof allowedOrigin === 'string' && message.origin !== allowedOrigin) {
    return false;
  }
  if (!message.data) {
    return false;
  }
  if (typeof message.data === 'object' && !('postmate' in message.data)) {
    return false;
  }
  if (message.data.type !== messageType) {
    return false;
  }
  if (!messageTypes[message.data.postmate]) {
    return false;
  }
  return true;
};

/**
 * Takes a model, and searches for a value by the property
 * @param  {Object} model     The dictionary to search against
 * @param  {String} property  A path within a dictionary (i.e. 'window.location.href')

 * @return {Promise}
 */
export const resolveValue = (model: Record<string, any>, property: string): Promise<any> => {
  const unwrappedContext = typeof model[property] === 'function' ? model[property]() : model[property];
  return Postmate.Promise.resolve(unwrappedContext);
};

/**
 * Composes an API to be used by the parent
 * @param {Object} info Information on the consumer
 */
export class ParentAPI {
  parent: any;
  frame: any;
  child: any;
  childOrigin: string;
  events: any = {};
  listener: any;

  constructor (info: ParentAPIConstructor) {
    this.parent = info.parent;
    this.frame = info.frame;
    this.child = info.child;
    this.childOrigin = info.childOrigin;

    log('Parent: Registering API');
    log('Parent: Awaiting messages...');

    this.listener = (e: any) => {
      if (!sanitize(e, this.childOrigin)) {
        return false;
      }

      /**
       * the assignments below ensures that e, data, and value are all defined
       */
      const { data, name } = (((e || {}).data || {}).value || {});

      if (e.data.postmate === 'emit') {
        log(`Parent: Received event emission: ${name}`);

        if (name in this.events) {
          this.events[name].forEach((callback: any) => {
            callback.call(this, data);
          });
        }
      }
    };

    this.parent.addEventListener('message', this.listener, false);
    log('Parent: Awaiting event emissions from Child');
  }

  /**
   * Retrieves a value by property name from the child's model object.
   *
   * @param key The string property to lookup in the child's model
   * @returns child model property value
   */
  get (key: string): Promise<any> {
    return new Postmate.Promise((resolve) => {
      // Extract data from response and kill listeners
      const uid = generateNewMessageId();
      const transact = (e: any) => {
        if (e.data.uid === uid && e.data.postmate === 'reply') {
          this.parent.removeEventListener('message', transact, false);
          resolve(e.data.value);
        }
      };

      // Prepare for response from Child...
      this.parent.addEventListener('message', transact, false);

      // Then ask child for information
      this.child.postMessage({
        postmate: 'request',
        type: messageType,
        key,
        uid,
      }, this.childOrigin);
    });
  }

  /**
   * Calls a function on the child's model
   *
   * @param key The string property to lookup in the child's model
   * @param data The optional data to send to the child function
   */
  call (key: string, data?: Record<any, any>): void {
    // Send information to the child
    this.child.postMessage({
      postmate: 'call',
      type: messageType,
      key,
      data,
    }, this.childOrigin);
  }

  /**
   * Listen to a particular event from the child
   *
   * @param eventName the name of the event
   * @param callback the event handler function
   */
  on (eventName: string, callback: (data?: any) => void): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  /**
   * Removes the iFrame element and destroys any message event listeners
   */
  destroy (): void {
    log('Parent: Destroying Postmate instance');
    window.removeEventListener('message', this.listener, false);
    this.frame.parentNode.removeChild(this.frame);
  }
}

/**
 * Composes an API to be used by the child
 * @param {Object} info Information on the consumer
 */
export class ChildAPI {
  model: any;
  parent: any;
  parentOrigin: string;
  child: any;

  constructor (info: ChildAPIConstructor) {
    this.model = info.model;
    this.parent = info.parent;
    this.parentOrigin = info.parentOrigin;
    this.child = info.child;

    log('Child: Registering API');
    log('Child: Awaiting messages...');

    this.child.addEventListener('message', (e: any) => {
      if (!sanitize(e, this.parentOrigin)) {
        return;
      }

      log('Child: Received request', e.data);

      const { property, uid, data } = e.data;

      if (e.data.postmate === 'call') {
        if (property in this.model && typeof this.model[property] === 'function') {
          this.model[property](data);
        }
        return;
      }

      // Reply to Parent
      resolveValue(this.model, property)
        .then(value => e.source.postMessage({
          property,
          postmate: 'reply',
          type: messageType,
          uid,
          value,
        }, e.origin));
    });
  }

  emit (name: string, data?: Record<any, any>): void {

    log(`Child: Emitting Event "${name}"`, data);

    this.parent.postMessage({
      postmate: 'emit',
      type: messageType,
      value: {
        name,
        data,
      },
    }, this.parentOrigin);
  }
}

/**
 * The entry point of the Parent.
 * @type {Class}
 */
class Postmate {

  parent: Window;
  child: any;
  childOrigin: string;
  model: any;
  frame: HTMLIFrameElement;

  static debug = false; // eslint-disable-line no-undef

  // Internet Explorer craps itself
  static Promise = (() => {
    try {
      return window ? window.Promise : Promise;
    } catch (e) {
      return null;
    }
  })();

  static Model: { new (model: Record<any, any>): any; prototype: any };

  /**
   * Sets options related to the Parent
   * @return {Promise}
   */
  constructor (options: PostmateConstructor) {
    this.parent = window;
    this.frame = document.createElement('iframe');
    this.frame.name = name || '';
    if (options.classListArray.length > 0) { // check for IE 11. See issue#207
      this.frame.classList.add(...options.classListArray);
    }
    (options.container || document.body).appendChild(this.frame);
    // @ts-ignore
    this.child = this.frame.contentWindow || this.frame.contentDocument.parentWindow;
    this.model = options.model || {};

    // @ts-ignore
    return this.sendHandshake(url);
  }

  /**
   * Begins the handshake strategy
   * @param  {String} url The URL to send a handshake request to
   * @return {Promise}     Promise that resolves when the handshake is complete
   */
  sendHandshake (url: string): Promise<any> {
    const childOrigin = resolveOrigin(url);
    let attempt = 0;
    let responseInterval: any;
    return new Postmate.Promise((resolve, reject) => {
      const reply = (e: any) => {
        if (!sanitize(e, childOrigin)) {
          return false;
        }
        if (e.data.postmate === 'handshake-reply') {
          clearInterval(responseInterval);

          log('Parent: Received handshake reply from Child');
          this.parent.removeEventListener('message', reply, false);
          this.childOrigin = e.origin;
          log('Parent: Saving Child origin', this.childOrigin);

          return resolve(new ParentAPI(this));
        }

        // Might need to remove since parent might be receiving different messages
        // from different hosts
        log('Parent: Invalid handshake reply');

        return reject('Failed handshake');
      };

      this.parent.addEventListener('message', reply, false);

      const doSend = () => {
        if (++attempt > maxHandshakeRequests) {
          clearInterval(responseInterval);
          return reject('Handshake Timeout Reached');
        }

        log(`Parent: Sending handshake attempt ${attempt}`, { childOrigin });

        this.child.postMessage({
          postmate: 'handshake',
          type: messageType,
          model: this.model,
        }, childOrigin);
      };

      const loaded = () => {
        doSend();
        responseInterval = setInterval(doSend, 500);
      };

      // @ts-ignore
      if (this.frame.attachEvent) {
        // @ts-ignore
        this.frame.attachEvent('onload', loaded);
      } else {
        this.frame.addEventListener('load', loaded);
      }

      log('Parent: Loading frame', { url });

      this.frame.src = url;
    });
  }
}

/**
 * The entry point of the Child
 * @type {Class}
 */
Postmate.Model = class Model {
  child: Window;
  model: any;
  parent: any;
  parentOrigin: string;

  /**
   * Initializes the child, model, parent, and responds to the Parents handshake
   * @param {Object} model Hash of values, functions, or promises
   * @return {Promise}       The Promise that resolves when the handshake has been received
   */
  constructor (model: Record<any, any>) {
    this.child = window;
    this.model = model;
    this.parent = this.child.parent;
    // @ts-ignore
    return this.sendHandshakeReply();
  }

  /**
   * Responds to a handshake initiated by the Parent
   * @return {Promise} Resolves an object that exposes an API for the Child
   */
  sendHandshakeReply () {
    return new Postmate.Promise((resolve, reject) => {
      const shake = (e: any) => {
        if (!e.data.postmate) {
          return;
        }
        if (e.data.postmate === 'handshake') {
          log('Child: Received handshake from Parent');

          this.child.removeEventListener('message', shake, false);

          log('Child: Sending handshake reply to Parent');

          e.source.postMessage({
            postmate: 'handshake-reply',
            type: messageType,
          }, e.origin);
          this.parentOrigin = e.origin;

          // Extend model with the one provided by the parent
          const defaults = e.data.model;
          if (defaults) {
            Object.keys(defaults).forEach(key => {
              this.model[key] = defaults[key];
            });

            log('Child: Inherited and extended model from Parent');
          }

          log('Child: Saving Parent origin', this.parentOrigin);

          return resolve(new ChildAPI(this));
        }
        return reject('Handshake Reply Failed');
      };
      this.child.addEventListener('message', shake, false);
    });
  }
};

export { Postmate };
