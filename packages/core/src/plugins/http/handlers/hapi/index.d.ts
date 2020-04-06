import { Plugin } from '@hapi/hapi';
import { Microfleet } from '../../../..';
import { PluginInterface } from '../../../../types';
export interface HapiPlugin {
    plugin: string | Plugin<any>;
    options?: any;
    once?: boolean;
}
declare function createHapiServer(config: any, service: Microfleet): PluginInterface;
export default createHapiServer;
