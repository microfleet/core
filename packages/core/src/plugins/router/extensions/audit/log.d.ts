import { ExtensionPlugin } from '..';
export declare type AuditLogExtensionParams = {
    disableLogErrorsForNames?: string[];
};
export declare type MetaLog = {
    headers: any;
    latency: number;
    method: string;
    params: any;
    query: any;
    route: string;
    transport: string;
    response?: any;
    err?: Error;
};
export default function auditLogFactory(params?: AuditLogExtensionParams): ExtensionPlugin[];
