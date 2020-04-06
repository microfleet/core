import { Microfleet } from '../../../';
import { TransportTypes } from '../../../types';
import { RouteMap } from '../factory';
export interface Routes {
    [name: string]: string;
}
export interface RoutesConfig {
    directory: string;
    prefix: string;
    setTransportsAsDefault?: boolean;
    transports: TransportTypes[];
    enabled: {
        [route: string]: string;
    };
    enabledGenericActions: string[];
}
/**
 * @param config - Routes configuration object.
 * @param config.directory - Actions directory, will be glob scanned.
 * @param config.enabled - Enabled routes list, mapped key as filename to
 *  value as route name. If empty - loads all routes.
 * @param config.prefix - Routes prefix, useful for launching on a certain namespace.
 * @param config.setTransportsAsDefault - Set action transports from config transports,
 *  so they don't need to be specified.
 * @param config.transports - Enabled transports list.
 */
export declare function getRoutes(this: Microfleet, config: RoutesConfig): RouteMap;
