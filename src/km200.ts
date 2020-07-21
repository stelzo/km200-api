'use strict';
import { HttpRequest } from './httpRequest';
import RijndaelBlock = require('rijndael-js');
import { randomBytes } from 'crypto';
import { buderusApi } from './dataTypes';

/*
    const plainText = Buffer.from('Here is my plain text', 'utf8');
    const encrypted = Buffer.from(this.cipher.encrypt(plainText, 128));
    const decrypted = Buffer.from(this.cipher.decrypt(encrypted, 128));

    console.log(plainText.toString('utf8'));
    console.log(encrypted.toString('utf8'));
    console.log(decrypted.toString('utf8'));
    console.log('Done');
 */

export class Km200 extends HttpRequest {
  private readonly key = randomBytes(32);
  private readonly cipher: RijndaelBlock;
  private iv = randomBytes(32);

  private options = {
    headers: {
      'Content-type': 'application/json',
      'User-Agent': 'TeleHeater/2.2.3',
    },
  };

  constructor(host: string, port: number, key: string) {
    super(host, port);
    this.key = Buffer.from(key, 'hex');
    this.cipher = new RijndaelBlock(this.key, 'ecb');
  }

  private static removeNonValidChars(data: string): string {
    return data
      .replace(/\\n/g, '\\n')
      .replace(/\\"/g, '\\"')
      .replace(/\\&/g, '\\&')
      .replace(/\\r/g, '\\r')
      .replace(/\\t/g, '\\t')
      .replace(/\\b/g, '\\b')
      .replace(/\\f/g, '\\f')
      .replace(/[\u0000-\u0019]+/g, '');
  }

  private decrypt(body: any): string {
    const enc = Buffer.from(body, 'base64');
    const plaintext = Buffer.from(this.cipher.decrypt(enc, '128', this.iv));
    return plaintext.toString();
  }

  public getKM200(command: string): Promise<any> {
    return this.get(command, this.options).then((body) => {
      if (body === null) return '';
      const decryptStr = this.decrypt(body);
      return JSON.parse(Km200.removeNonValidChars(decryptStr));
    });
  }

  public async printCompleteApi() {
    for (const api of buderusApi) {
      await this.getAllSubApis(api, 0);
    }
  }

  public async printSingleApi(api: string) {
    await this.getAllSubApis(api, 0);
  }

  private async getAllSubApis(api: string, lvl: number) {
    try {
      await this.getKM200(api).then(async (data) => {
        await this.printCurrentApiLine(data, lvl);
      });
    } catch (e) {
      console.log('.'.repeat(lvl) + ' --> No Json Response');
    }
  }

  private async printCurrentApiLine(data: any, lvl: number) {
    if (data.references) {
      console.log('.'.repeat(lvl) + ' ' + data.id);
    } else {
      console.log('.'.repeat(lvl) + ' ' + data.id + ': ' + data.value + ' ' + (data.unitOfMeasure?data.unitOfMeasure:''));
    }

    if (data.references) {
      for (const field of data.references) {
        await this.getAllSubApis(field.id, lvl + 1);
      }
    }
  }
}
