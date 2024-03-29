import { AssertionError } from 'node:assert'
import type { KeyLike, Verify, Hmac } from 'node:crypto'
import { HttpSignature } from 'http-signature'

import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-router'
import { SignedRequest } from './signed-request'

export type Config = {
  headers?: string[];
  clockSkew?: number;
}

export interface CredentialsStore {
  getKey(key: string): Promise<KeyLike>
  getCredentials<RT extends Record<string, any> = any>(key: string, ...args: any[]): Promise<RT>
}

export type RequestInfo = {
  headers: Record<string, any>;
  hash: string;
  algorithm: string;
  parsedSignature: HttpSignature;
  payloadSignature: Verify | Hmac;
  signKey: KeyLike;
}

export function assertRequestInitialized(req?: RequestInfo): asserts req is RequestInfo {
  if (!req) {
    throw new AssertionError({
      message: 'req should be initialized'
    })
  }
}

declare module '@microfleet/core-types' {
  interface Microfleet {
    credentialsStore: CredentialsStore
  }

  interface ConfigurationOptional {
    signedRequest: Config
  }
}

declare module '@microfleet/plugin-router' {
  interface ServiceRequest {
    signature?: SignedRequest
  }
}

declare module '@hapi/hapi' {
  export interface PluginsStates {
    signature?: SignedRequest,
  }
}

declare module 'restify' {
  export interface Request {
    signature?: SignedRequest,
  }
}

