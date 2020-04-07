/* eslint-disable @typescript-eslint/no-unused-vars */
import P = require('pino')

declare module 'pino' {
  export type SymbolMapping = {
    readonly needsMetadataGsym: unique symbol;
  }

  export const symbols: SymbolMapping
}
