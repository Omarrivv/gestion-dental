import {
  Controller, Post, Get, Patch, Delete, Body, Param,
  Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  IsDateString, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAppointmentCommand } from '../../../application/commands/CreateAppointment.command';
import { CancelAppointmentCommand } from '../../../application/commands/CancelAppointment.command';
import { GetAvailableSlotsQuery } from '../../../application/queries/GetAvailableSlots.query';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';

class CreateAppointmentDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsNotEmpty()
  @IsString()
  treatmentType!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsInt()
  @Min(5)
  @Max(480)
  @Type(() => Number)
  durationMins: number = 30;

  @IsOptional()
  @IsString()
  reason?: string;
}

class CancelAppointmentDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /appointments — Create a new appointment.
   * The doctor conflict check is enforced in the command handler.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    return this.commandBus.execute(
      new CreateAppointmentCommand(
        req.user.orgId,
        dto.branchId,
        dto.patientId,
        dto.doctorId,
        dto.treatmentType,
        new Date(dto.scheduledAt),
        dto.durationMins,
        dto.reason,
        req.user.sub,
      ),
    );
  }

  /**
   * GET /appointments/calendar — daily view for a branch.
   * Returns appointments with patient and doctor info.
   */
  @Get('calendar')
  async calendar(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        organizationId: req.user.orgId,
        branchId,
        scheduledAt: { gte: start, lte: end },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * GET /appointments/slots — available booking slots for a doctor/branch/day
   */
  @Get('slots')
  async availableSlots(
    @Query('branchId') branchId: string,
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('duration') duration = '30',
    @Query('timezone') timezone = 'America/El_Salvador',
  ) {
    return this.queryBus.execute(
      new GetAvailableSlotsQuery(
        branchId,
        doctorId,
        new Date(date),
        Number(duration),
        timezone,
      ),
    );
  }

  /**
   * GET /appointments/:id
   */
  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    return this.prisma.appointment.findFirstOrThrow({
      where: { id, organizationId: req.user.orgId },
      include: {
        patient: true,
        doctor: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true, city: true } },
        clinicalRecord: true,
        reminders: true,
      },
    });
  }

  /**
   * PATCH /appointments/:id/cancel
   */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @Req() req: any,
  ) {
    await this.commandBus.execute(
      new CancelAppointmentCommand(id, req.user.orgId, dto.reason, req.user.sub),
    );
  }

  /**
   * PATCH /appointments/:id/confirm
   */
  @Patch(':id/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirm(@Param('id') id: string, @Req() req: any) {
    // Direct status update — simple enough not to warrant a full command
    await this.prisma.appointment.updateMany({
      where: { id, organizationId: req.user.orgId, status: 'PENDING' },
      data: { status: 'CONFIRMED', updatedAt: new Date() },
    });
  }

  /**
   * PATCH /appointments/:id/complete
   */
  @Patch(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async complete(@Param('id') id: string, @Req() req: any) {
    await this.prisma.appointment.updateMany({
      where: { id, organizationId: req.user.orgId, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() },
    });
  }
}
