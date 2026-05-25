import { IRepository } from '@dental/shared-kernel';
import { User } from '../entities/User';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository extends IRepository<User> {
  findByEmail(organizationId: string, email: string): Promise<User | null>;
  findByOrganization(organizationId: string, page: number, limit: number): Promise<{ items: User[]; total: number }>;
  existsByEmail(organizationId: string, email: string): Promise<boolean>;
}
