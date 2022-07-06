declare module 'http-signature' {
  import type { IncomingMessage } from "http"
  import { KeyLike } from "crypto"

  export type HttpSignature = {
    keyId: string,
    algorithm: string,
    signStr: string,
  }

  export type ParseOptions = {
    strict?: boolean,
    headers: string[],
    clockSkew?: number,
  }

  export function parseRequest(req: IncomingMessage, opts: ParseOptions): HttpSignature;
  export function verifyHMAC(parsed: HttpSignature, key: KeyLike): boolean;
  export function verifySignature(parsed: HttpSignature, key: KeyLike): boolean;
  export function sign(req: IncomingMessage, opts: ParseOptions): void;
}
