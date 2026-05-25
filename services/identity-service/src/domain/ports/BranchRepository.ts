import { IRepository } from '@dental/shared-kernel';
import { Branch } from '../entities/Branch';

export const BRANCH_REPOSITORY = Symbol('BRANCH_REPOSITORY');

export interface IBranchRepository extends IRepository<Branch> {
  findByOrganization(organizationId: string): Promise<Branch[]>;
  findByOrganizationAndId(organizationId: string, branchId: string): Promise<Branch | null>;
}
