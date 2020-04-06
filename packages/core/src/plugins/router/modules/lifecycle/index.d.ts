import Bluebird = require('bluebird');
import Extensions from '../../extensions';
export declare type ActionHandler = (...args: any[]) => any;
declare function moduleLifecycle(module: string, promiseFactory: ActionHandler, extensions: Extensions, args: any[], context?: any): Bluebird<any>;
export default moduleLifecycle;
