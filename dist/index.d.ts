/**
 * Created by stephen-ullom 9/5/2021
 * @file Torx templating engine. {@link http://torxjs.com}
 * @author Stephen Ullom
 * @project Torx
 */
/**
 * Callback for Express.
 * @callback expressCallback
 * @param {any} error
 * @param {string} response
 */
/**
 * Torx template engine for Express.
 * @param {string} filePath
 * @param {any} options
 * @param {expressCallback} callback
 */
export declare function express(filePath: string, options: any, callback: Function): void;
/**
 * Compile Torx template code
 * @param {string} torx - Torx template code
 * @param {any} [data] - optional values to pass into the template
 * @param {string} [filePath] - the path to the source file
 * @returns {Promise<string>}
 */
export declare function compile(torx: string, data?: {}, filePath?: string): Promise<string>;
