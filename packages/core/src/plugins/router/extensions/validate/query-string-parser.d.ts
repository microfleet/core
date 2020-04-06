import { ServiceRequest } from '../../../../types';
declare type QSParserAugmentedAction = ServiceRequest & {
    action: ServiceRequest['action'] & {
        transformQuery?: (...args: any[]) => any;
        transformOpts?: any;
    };
};
declare function preValidate(request: QSParserAugmentedAction): QSParserAugmentedAction;
declare const _default: {
    handler: typeof preValidate;
    point: "preValidate";
}[];
export default _default;
