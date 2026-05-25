import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { addHours, startOfDay, endOfDay, eachHourOfInterval, addMinutes, isBefore, isAfter } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { IAppointmentRepository, APPOINTMENT_REPOSITORY } from '../../domain/ports/AppointmentRepository';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export class GetAvailableSlotsQuery {
  constructor(
    public readonly branchId: string,
    public readonly doctorId: string,
    public readonly date: Date,
    public readonly durationMins: number,
    public readonly timezone: string,
  ) {}
}

export interface AvailableSlot {
  startAt: string; // ISO
  endAt: string;
  available: boolean;
}

@QueryHandler(GetAvailableSlotsQuery)
export class GetAvailableSlotsHandler implements IQueryHandler<GetAvailableSlotsQuery, AvailableSlot[]> {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly repo: IAppointmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetAvailableSlotsQuery): Promise<AvailableSlot[]> {
    const { branchId, doctorId, date, durationMins, timezone } = query;
    const dayOfWeek = toZonedTime(date, timezone).getDay();

    // Load doctor schedule for that day at that branch
    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: { doctorId_branchId_dayOfWeek: { doctorId, branchId, dayOfWeek } },
    });

    if (!schedule || !schedule) return [];

    // Build all possible slot times in UTC
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    const dayInTz = toZonedTime(date, timezone);
    const workStart = fromZonedTime(
      new Date(dayInTz.getFullYear(), dayInTz.getMonth(), dayInTz.getDate(), startHour, startMin),
      timezone,
    );
    const workEnd = fromZonedTime(
      new Date(dayInTz.getFullYear(), dayInTz.getMonth(), dayInTz.getDate(), endHour, endMin),
      timezone,
    );

    // Load existing appointments for that day
    const existingAppointments = await this.repo.findByDoctorAndDateRange(
      doctorId,
      startOfDay(workStart),
      endOfDay(workEnd),
    );

    const slots: AvailableSlot[] = [];
    let cursor = workStart;

    while (isBefore(addMinutes(cursor, durationMins), workEnd) || addMinutes(cursor, durationMins).getTime() === workEnd.getTime()) {
      const slotEnd = addMinutes(cursor, durationMins);
      const isBooked = existingAppointments.some(
        (appt) =>
          appt.timeSlot.startAt < slotEnd &&
          appt.timeSlot.endAt > cursor &&
          appt.status !== 'CANCELLED' &&
          appt.status !== 'NO_SHOW',
      );

      slots.push({
        startAt: cursor.toISOString(),
        endAt: slotEnd.toISOString(),
        available: !isBooked,
      });

      cursor = addMinutes(cursor, schedule.slotMinutes);
    }

    return slots;
  }
}
