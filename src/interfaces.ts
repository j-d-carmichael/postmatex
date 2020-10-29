export interface SanitizeMessage {
  data: {
    postmate: any,
    type: string,
    [key: string]: any
  },
  origin: string,
}

export interface ParentAPIConstructor {
  parent: any,
  frame: any,
  child: string,
  childOrigin: any
}

export interface ChildAPIConstructor {
  model: any
  parent: any
  parentOrigin: string
  child: any
}

export interface PostmateConstructor {
  /**
   * An element to append the iFrame to. Default: document.body
   */
  container?: HTMLElement | null;

  /**
   * An object literal to represent the default values of the child's model
   */
  model?: any;

  /**
   * A URL to load in the iFrame. The origin of this URL will also be used for securing message transport
   */
  url: string;

  /**
   * An Array to add classes to the iFrame. Useful for styling
   */
  classListArray?: string[];

  /**
   * A name which is used for the name attribute of the created iFrame
   */
  name?: string;
}
