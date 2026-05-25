import {
  Controller, Post, Get, Patch, Body,
  Param, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  IsArray, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, IsUUID, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { PaymentMethod } from '../../../domain/entities/Payment';

class LineItemDto {
  @IsNotEmpty() @IsString() description!: string;
  @IsInt() @Min(1) @Type(() => Number) quantity!: number;
  @IsInt() @Min(0) @Type(() => Number) unitCents!: number;
}

class CreateInvoiceDto {
  @IsUUID() patientId!: string;
  @IsUUID() branchId!: string;
  @IsOptional() @IsUUID() appointmentId?: string;
  @IsArray() lineItems!: LineItemDto[];
  @IsOptional() @IsInt() discountCents?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() dueDate?: string;
}

class RegisterPaymentDto {
  @IsInt() @Min(1) @Type(() => Number) amountCents!: number;
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    const subtotal = dto.lineItems.reduce((s, li) => s + li.unitCents * li.quantity, 0);
    const discount = dto.discountCents ?? 0;
    const total = Math.max(0, subtotal - discount);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organizationId: req.user.orgId,
          branchId: dto.branchId,
          patientId: dto.patientId,
          appointmentId: dto.appointmentId,
          status: 'OPEN',
          subtotalCents: subtotal,
          discountCents: discount,
          totalCents: total,
          currency: 'USD',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
        },
      });

      await tx.invoiceLineItem.createMany({
        data: dto.lineItems.map((li) => ({
          invoiceId: invoice.id,
          description: li.description,
          quantity: li.quantity,
          unitCents: li.unitCents,
          totalCents: li.unitCents * li.quantity,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { lineItems: true, patient: { select: { firstName: true, lastName: true } } },
      });
    });
  }

  @Get()
  async listInvoices(
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      organizationId: req.user.orgId,
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { firstName: true, lastName: true, phone: true } },
          lineItems: true,
          payments: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, total };
  }

  @Get(':id')
  async getInvoice(@Param('id') id: string, @Req() req: any) {
    return this.prisma.invoice.findFirstOrThrow({
      where: { id, organizationId: req.user.orgId },
      include: { lineItems: true, payments: true, patient: true },
    });
  }

  /**
   * POST /invoices/:id/payments — Register a payment against an invoice.
   * Domain rule: amount cannot exceed outstanding balance.
   */
  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  async registerPayment(
    @Param('id') invoiceId: string,
    @Body() dto: RegisterPaymentDto,
    @Req() req: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirstOrThrow({
        where: { id: invoiceId, organizationId: req.user.orgId },
        include: { payments: true },
      });

      if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
        throw new Error(`Invoice is already ${invoice.status}`);
      }

      const paid = invoice.payments.reduce((s, p) => s + p.amountCents, 0);
      const balance = invoice.totalCents - paid;

      if (dto.amountCents > balance) {
        throw new Error(`Payment $${dto.amountCents / 100} exceeds balance due $${balance / 100}`);
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amountCents: dto.amountCents,
          method: dto.method as any,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      // Auto-close invoice if fully paid
      const newPaid = paid + dto.amountCents;
      if (newPaid >= invoice.totalCents) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'PAID', updatedAt: new Date() },
        });
      }

      return payment;
    });
  }

  /**
   * GET /invoices/summary — cash flow summary by branch/period
   */
  @Get('reports/summary')
  async summary(
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.prisma.$queryRaw<Array<{
      total_invoiced: bigint;
      total_paid: bigint;
      total_outstanding: bigint;
      invoice_count: bigint;
    }>>`
      SELECT
        SUM(i.total_cents) AS total_invoiced,
        SUM(COALESCE(p.paid, 0)) AS total_paid,
        SUM(i.total_cents - COALESCE(p.paid, 0)) AS total_outstanding,
        COUNT(i.id) AS invoice_count
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount_cents) AS paid
        FROM payments GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE i.organization_id = ${req.user.orgId}
        ${branchId ? `AND i.branch_id = '${branchId}'` : ''}
        ${from ? `AND i.created_at >= '${from}'` : ''}
        ${to ? `AND i.created_at <= '${to}'` : ''}
    `;

    return result[0];
  }
}
