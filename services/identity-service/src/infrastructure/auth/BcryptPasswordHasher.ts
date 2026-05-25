import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../../domain/ports/PasswordHasher';

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
