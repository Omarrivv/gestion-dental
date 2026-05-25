import {
  Controller, Get, Query, Req,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /reports/dashboard — top-level KPIs for org or branch
   */
  @Get('dashboard')
  async dashboard(
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = req.user.orgId;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const branchFilter = branchId ? { branchId } : {};
    const baseWhere = { organizationId: orgId, ...branchFilter };

    const [
      appointmentCounts,
      revenueSummary,
      noShowCount,
      newPatients,
      reminderStats,
    ] = await Promise.all([
      // Appointment counts by status
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          ...baseWhere,
          scheduledAt: { gte: fromDate, lte: toDate },
        },
        _count: { _all: true },
      }),

      // Revenue
      this.prisma.$queryRaw<Array<{ total_invoiced: bigint; total_paid: bigint }>>`
        SELECT SUM(i.total_cents) AS total_invoiced, COALESCE(SUM(p.paid), 0) AS total_paid
        FROM invoices i
        LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid FROM payments GROUP BY invoice_id) p
          ON p.invoice_id = i.id
        WHERE i.organization_id = ${orgId}
          ${branchId ? `AND i.branch_id = '${branchId}'` : ''}
          AND i.created_at BETWEEN ${fromDate} AND ${toDate}
      `,

      // No-show count
      this.prisma.appointment.count({
        where: { ...baseWhere, status: 'NO_SHOW', scheduledAt: { gte: fromDate, lte: toDate } },
      }),

      // New patients registered in period
      this.prisma.patient.count({
        where: { organizationId: orgId, createdAt: { gte: fromDate, lte: toDate } },
      }),

      // Reminder delivery stats
      this.prisma.reminder.groupBy({
        by: ['status'],
        where: {
          organizationId: orgId,
          scheduledFor: { gte: fromDate, lte: toDate },
        },
        _count: { _all: true },
      }),
    ]);

    const apptByStatus = Object.fromEntries(
      appointmentCounts.map((r) => [r.status, r._count._all]),
    );

    const reminderByStatus = Object.fromEntries(
      reminderStats.map((r) => [r.status, r._count._all]),
    );

    const totalAppts = Object.values(apptByStatus as Record<string, number>).reduce((s, v) => s + v, 0);
    const completedAppts = (apptByStatus as Record<string, number>).COMPLETED ?? 0;
    const noShow = noShowCount;

    return {
      period: { from: fromDate, to: toDate },
      appointments: {
        total: totalAppts,
        byStatus: apptByStatus,
        completionRate: totalAppts > 0 ? ((completedAppts / totalAppts) * 100).toFixed(1) : '0',
        noShowRate: totalAppts > 0 ? ((noShow / totalAppts) * 100).toFixed(1) : '0',
      },
      revenue: {
        totalInvoicedCents: Number(revenueSummary[0]?.total_invoiced ?? 0),
        totalPaidCents: Number(revenueSummary[0]?.total_paid ?? 0),
        totalOutstandingCents:
          Number(revenueSummary[0]?.total_invoiced ?? 0) -
          Number(revenueSummary[0]?.total_paid ?? 0),
      },
      patients: { newInPeriod: newPatients },
      reminders: { byStatus: reminderByStatus },
    };
  }

  /**
   * GET /reports/appointments/by-day — heatmap data for calendar views
   */
  @Get('appointments/by-day')
  async appointmentsByDay(
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = req.user.orgId;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    return this.prisma.$queryRaw`
      SELECT DATE(scheduled_at) AS day, COUNT(*) AS count
      FROM appointments
      WHERE organization_id = ${orgId}
        ${branchId ? `AND branch_id = '${branchId}'` : ''}
        AND scheduled_at BETWEEN ${fromDate} AND ${toDate}
      GROUP BY DATE(scheduled_at)
      ORDER BY day ASC
    `;
  }

  /**
   * GET /reports/revenue/by-branch — compare branch performance
   */
  @Get('revenue/by-branch')
  async revenueByBranch(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = req.user.orgId;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    return this.prisma.$queryRaw`
      SELECT
        b.id AS branch_id,
        b.name AS branch_name,
        SUM(i.total_cents) AS total_invoiced,
        COALESCE(SUM(p.paid), 0) AS total_paid,
        COUNT(i.id) AS invoice_count
      FROM invoices i
      JOIN branches b ON b.id = i.branch_id
      LEFT JOIN (SELECT invoice_id, SUM(amount_cents) AS paid FROM payments GROUP BY invoice_id) p
        ON p.invoice_id = i.id
      WHERE i.organization_id = ${orgId}
        AND i.created_at BETWEEN ${fromDate} AND ${toDate}
      GROUP BY b.id, b.name
      ORDER BY total_invoiced DESC
    `;
  }

  /**
   * GET /reports/doctors/performance — productivity per doctor
   */
  @Get('doctors/performance')
  async doctorPerformance(
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = req.user.orgId;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    return this.prisma.$queryRaw`
      SELECT
        u.id AS doctor_id,
        u.first_name || ' ' || u.last_name AS doctor_name,
        COUNT(a.id) AS total_appointments,
        SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN a.status = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_shows,
        SUM(CASE WHEN a.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
      FROM appointments a
      JOIN users u ON u.id = a.doctor_id
      WHERE a.organization_id = ${orgId}
        ${branchId ? `AND a.branch_id = '${branchId}'` : ''}
        AND a.scheduled_at BETWEEN ${fromDate} AND ${toDate}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY completed DESC
    `;
  }
}
