// Type declaration for multiformats/cid to resolve module resolution issues
declare module 'multiformats/cid' {
  export class CID {
    constructor(...args: any[])
    static parse(input: string): CID
    static decode(bytes: Uint8Array): CID
    toString(): string
    toJSON(): any
    bytes: Uint8Array
    code: number
    multihash: Uint8Array
    version: number
  }
}
