/**
 * The type of messages our frames our sending
 * @type {String}
 */
import { ChildAPIConstructor, ParentAPIConstructor, PostmateConstructor, SanitizeMessage } from './interfaces';
export declare const messageType = "application/x-postmate-v1+json";
/**
 * The maximum number of attempts to send a handshake request to the parent
 * @type {Number}
 */
export declare const maxHandshakeRequests = 5;
/**
 * Increments and returns a message ID
 * @return {Number} A unique ID for a message
 */
export declare const generateNewMessageId: () => number;
/**
 * Postmate logging function that enables/disables via config
 */
export declare const log: (...args: any[]) => void;
/**
 * Takes a URL and returns the origin
 * @param  {String} url The full URL being requested
 * @return {String}     The URLs origin
 */
export declare const resolveOrigin: (url: string) => string;
/**
 * Ensures that a message is safe to interpret
 * @param  {Object} message The postmate message being sent
 * @param  {String|Boolean} allowedOrigin The whitelisted origin or false to skip origin check
 * @return {Boolean}
 */
export declare const sanitize: (message: SanitizeMessage, allowedOrigin?: string) => boolean;
/**
 * Takes a model, and searches for a value by the property
 * @param  {Object} model     The dictionary to search against
 * @param  {String} property  A path within a dictionary (i.e. 'window.location.href')

 * @return {Promise}
 */
export declare const resolveValue: (model: Record<string, any>, property: string) => Promise<any>;
/**
 * Composes an API to be used by the parent
 * @param {Object} info Information on the consumer
 */
export declare class ParentAPI {
    parent: any;
    frame: any;
    child: any;
    childOrigin: string;
    events: any;
    listener: any;
    constructor(info: ParentAPIConstructor);
    /**
     * Retrieves a value by property name from the child's model object.
     *
     * @param key The string property to lookup in the child's model
     * @returns child model property value
     */
    get(key: string): Promise<any>;
    /**
     * Calls a function on the child's model
     *
     * @param key The string property to lookup in the child's model
     * @param data The optional data to send to the child function
     */
    call(key: string, data?: Record<any, any>): void;
    /**
     * Listen to a particular event from the child
     *
     * @param eventName the name of the event
     * @param callback the event handler function
     */
    on(eventName: string, callback: (data?: any) => void): void;
    /**
     * Removes the iFrame element and destroys any message event listeners
     */
    destroy(): void;
}
/**
 * Composes an API to be used by the child
 * @param {Object} info Information on the consumer
 */
export declare class ChildAPI {
    model: any;
    parent: any;
    parentOrigin: string;
    child: any;
    constructor(info: ChildAPIConstructor);
    emit(name: string, data?: Record<any, any>): void;
}
/**
 * The entry point of the Parent.
 * @type {Class}
 */
declare class Postmate {
    parent: Window;
    child: any;
    childOrigin: string;
    model: any;
    frame: HTMLIFrameElement;
    static debug: boolean;
    static Promise: PromiseConstructor;
    static Model: {
        new (model: Record<any, any>): any;
        prototype: any;
    };
    /**
     * Sets options related to the Parent
     * @return {Promise}
     */
    constructor(options: PostmateConstructor);
    /**
     * Begins the handshake strategy
     * @param  {String} url The URL to send a handshake request to
     * @return {Promise}     Promise that resolves when the handshake is complete
     */
    sendHandshake(url: string): Promise<any>;
}
export { Postmate };
