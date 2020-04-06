import { TransportTypes } from '../../types';
import { Router } from './factory';
/**
 * Verifies if it's possible to attach router for specific transport.
 * @param  router - Existing router instance.
 * @param  transportName - Transport name to attach handler to.
 */
export declare function verifyAttachPossibility(router: Router, transportName: TransportTypes): void;
