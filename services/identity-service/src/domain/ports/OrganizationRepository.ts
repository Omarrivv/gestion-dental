import { IRepository } from '@dental/shared-kernel';
import { Organization } from '../entities/Organization';

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');

export interface IOrganizationRepository extends IRepository<Organization> {
  findBySlug(slug: string): Promise<Organization | null>;
  existsBySlug(slug: string): Promise<boolean>;
  findAll(page: number, limit: number): Promise<{ items: Organization[]; total: number }>;
}
