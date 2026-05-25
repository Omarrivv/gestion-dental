import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IUserRepository } from '../../../domain/ports/UserRepository';
import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { Role, UserRole } from '../../../domain/value-objects/Role';
import { User as PrismaUser, UserBranchAccess } from '@prisma/client';

type UserWithBranches = PrismaUser & { branchAccess: UserBranchAccess[] };

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: UserWithBranches): User {
    return User.reconstitute(
      {
        organizationId: row.organizationId,
        email: Email.create(row.email),
        passwordHash: row.passwordHash,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone ?? undefined,
        avatarUrl: row.avatarUrl ?? undefined,
        role: Role.create(row.role as unknown as UserRole),
        isActive: row.isActive,
        lastLoginAt: row.lastLoginAt ?? undefined,
        branchIds: row.branchAccess.map((b) => b.branchId),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }

  private withBranchesInclude = { branchAccess: true } as const;

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: this.withBranchesInclude,
    });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(organizationId: string, email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email: email.toLowerCase() } },
      include: this.withBranchesInclude,
    });
    return row ? this.toDomain(row) : null;
  }

  async existsByEmail(organizationId: string, email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { organizationId, email: email.toLowerCase() },
    });
    return count > 0;
  }

  async findByOrganization(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<{ items: User[]; total: number }> {
    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { organizationId },
        include: this.withBranchesInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { organizationId } }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async save(user: User): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          organizationId: user.organizationId,
          email: user.emailValue,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.roleValue as unknown as any,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
        },
        update: {
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          updatedAt: new Date(),
        },
      });

      // Sync branch access
      await tx.userBranchAccess.deleteMany({ where: { userId: user.id } });
      if (user.branchIds.length > 0) {
        await tx.userBranchAccess.createMany({
          data: user.branchIds.map((branchId) => ({ userId: user.id, branchId })),
        });
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
