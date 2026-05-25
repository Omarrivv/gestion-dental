import { IRepository } from '@dental/shared-kernel';
import { Appointment } from '../entities/Appointment';
import { AppointmentStatus } from '../value-objects/AppointmentStatus';

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');

export interface IAppointmentRepository extends IRepository<Appointment> {
  findByBranchAndDateRange(
    branchId: string,
    from: Date,
    to: Date,
  ): Promise<Appointment[]>;

  findByDoctorAndDateRange(
    doctorId: string,
    from: Date,
    to: Date,
  ): Promise<Appointment[]>;

  findByPatient(
    organizationId: string,
    patientId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Appointment[]; total: number }>;

  findOverlapping(
    doctorId: string,
    branchId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<Appointment[]>;

  findByStatus(
    organizationId: string,
    status: AppointmentStatus,
    page: number,
    limit: number,
  ): Promise<{ items: Appointment[]; total: number }>;
}
