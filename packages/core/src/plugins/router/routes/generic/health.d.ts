import { Microfleet } from '../../../..';
import { ServiceRequest } from '../../../../types';
declare function genericHealthCheck(this: Microfleet, request: ServiceRequest): Promise<{
    data: import("../../../../utils/pluginHealthStatus").HealthStatus;
}>;
declare namespace genericHealthCheck {
    var transports: ("amqp" | "http" | "internal" | "socketIO")[];
}
export default genericHealthCheck;
