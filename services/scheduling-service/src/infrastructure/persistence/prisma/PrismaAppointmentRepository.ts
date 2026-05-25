import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IAppointmentRepository } from '../../../domain/ports/AppointmentRepository';
import { Appointment, AppointmentProps } from '../../../domain/entities/Appointment';
import { TimeSlot } from '../../../domain/value-objects/TimeSlot';
import { AppointmentStatus } from '../../../domain/value-objects/AppointmentStatus';
import { Appointment as PrismaAppt } from '@prisma/client';

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: PrismaAppt): Appointment {
    return Appointment.reconstitute(
      {
        organizationId: row.organizationId,
        branchId: row.branchId,
        patientId: row.patientId,
        doctorId: row.doctorId,
        treatmentType: row.treatmentType,
        status: row.status as unknown as AppointmentStatus,
        timeSlot: TimeSlot.create(row.scheduledAt, row.durationMins),
        reason: row.reason ?? undefined,
        internalNotes: row.internalNotes ?? undefined,
        cancelledAt: row.cancelledAt ?? undefined,
        cancelReason: row.cancelReason ?? undefined,
        completedAt: row.completedAt ?? undefined,
        patientPhone: '',   // loaded via join when needed
        patientName: '',
        branchName: '',
        doctorName: '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } satisfies AppointmentProps,
      row.id,
    );
  }

  async findById(id: string): Promise<Appointment | null> {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByBranchAndDateRange(branchId: string, from: Date, to: Date): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        branchId,
        scheduledAt: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByDoctorAndDateRange(doctorId: string, from: Date, to: Date): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: from, lte: to },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByPatient(
    organizationId: string,
    patientId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Appointment[]; total: number }> {
    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where: { organizationId, patientId },
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
      }),
      this.prisma.appointment.count({ where: { organizationId, patientId } }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findOverlapping(
    doctorId: string,
    branchId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<Appointment[]> {
    const rows = await this.prisma.$queryRaw<PrismaAppt[]>`
      SELECT * FROM appointments
      WHERE doctor_id = ${doctorId}
        AND branch_id = ${branchId}
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND scheduled_at < ${endAt}
        AND (scheduled_at + (duration_mins * interval '1 minute')) > ${startAt}
        ${excludeId ? `AND id != '${excludeId}'` : ''}
    `;
    return rows.map((r) => this.toDomain(r));
  }

  async findByStatus(
    organizationId: string,
    status: AppointmentStatus,
    page: number,
    limit: number,
  ): Promise<{ items: Appointment[]; total: number }> {
    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where: { organizationId, status: status as unknown as any },
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.appointment.count({ where: { organizationId, status: status as unknown as any } }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async save(appt: Appointment): Promise<void> {
    await this.prisma.appointment.upsert({
      where: { id: appt.id },
      create: {
        id: appt.id,
        organizationId: appt.organizationId,
        branchId: appt.branchId,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        treatmentType: appt.treatmentType,
        status: appt.status as unknown as any,
        scheduledAt: appt.scheduledAt,
        durationMins: appt.timeSlot.durationMinutes,
        reason: appt.reason,
      },
      update: {
        status: appt.status as unknown as any,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.appointment.delete({ where: { id } });
  }
}
