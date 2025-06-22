// @ts-ignore
import * as crypto from 'crypto';

export namespace io.github.yumika {

  export function objectHash(obj: any): string {
    const jsonString = JSON.stringify(obj, Object.keys(obj).sort());
    const hash = crypto.createHash('sha256');
    hash.update(jsonString);
    return hash.digest('hex');
  }
}