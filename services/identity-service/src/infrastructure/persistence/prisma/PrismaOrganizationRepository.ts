import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IOrganizationRepository } from '../../../domain/ports/OrganizationRepository';
import { Organization, OrganizationProps, OrganizationStatus, SubscriptionPlan } from '../../../domain/entities/Organization';
import { Organization as PrismaOrg } from '@prisma/client';

@Injectable()
export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: PrismaOrg): Organization {
    return Organization.reconstitute(
      {
        name: row.name,
        slug: row.slug,
        plan: row.plan as unknown as SubscriptionPlan,
        status: row.status as unknown as OrganizationStatus,
        logoUrl: row.logoUrl ?? undefined,
        primaryColor: row.primaryColor ?? undefined,
        trialEndsAt: row.trialEndsAt ?? undefined,
        subscriptionId: row.subscriptionId ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } satisfies OrganizationProps,
      row.id,
    );
  }

  async findById(id: string): Promise<Organization | null> {
    const row = await this.prisma.organization.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const row = await this.prisma.organization.findUnique({ where: { slug } });
    return row ? this.toDomain(row) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.organization.count({ where: { slug } });
    return count > 0;
  }

  async findAll(page: number, limit: number): Promise<{ items: Organization[]; total: number }> {
    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.organization.count(),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async save(org: Organization): Promise<void> {
    await this.prisma.organization.upsert({
      where: { id: org.id },
      create: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan as unknown as any,
        status: org.status as unknown as any,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
      },
      update: {
        name: org.name,
        plan: org.plan as unknown as any,
        status: org.status as unknown as any,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } });
  }
}
