import { Request } from '@hapi/hapi';
import { Microfleet } from '../../../../..';
export default function getHapiAdapter(actionName: string, service: Microfleet): (request: Request) => Promise<any>;
