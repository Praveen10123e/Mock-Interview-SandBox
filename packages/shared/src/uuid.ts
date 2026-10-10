import crypto from 'crypto';

export class UUIDHelper {
  static generate(): string {
    return crypto.randomUUID();
  }

  static isValid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
  }
}
