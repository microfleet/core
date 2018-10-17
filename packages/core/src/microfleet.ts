import * as MicrofleetES from './index';

const { Microfleet, ...statics } = MicrofleetES;

Object.assign(Microfleet, statics);

export = Microfleet;
