import {
  Controller, Post, Get, Put, Patch, Body,
  Param, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { ToothCondition, ToothSurface } from '../../../domain/value-objects/OdontogramEntry';

class CreatePatientDto {
  @IsNotEmpty() @IsString() firstName!: string;
  @IsNotEmpty() @IsString() lastName!: string;
  @IsNotEmpty() @IsString() phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() bloodType?: string;
  @IsOptional() @IsArray() allergies?: string[];
  @IsOptional() @IsArray() currentMeds?: string[];
}

class CreateRecordDto {
  @IsNotEmpty() @IsString() appointmentId!: string;
  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatmentDone?: string;
  @IsOptional() @IsString() prescription?: string;
  @IsOptional() @IsString() nextVisitNotes?: string;
}

class AddOdontogramEntryDto {
  @IsInt() @Type(() => Number) toothNumber!: number;
  @IsEnum(ToothCondition) condition!: ToothCondition;
  @IsOptional() @IsEnum(ToothSurface) surface?: ToothSurface;
  @IsOptional() @IsString() notes?: string;
}

@Controller('patients')
export class PatientsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPatient(@Body() dto: CreatePatientDto, @Req() req: any) {
    return this.prisma.patient.create({
      data: {
        organizationId: req.user.orgId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        bloodType: dto.bloodType,
        allergies: dto.allergies ?? [],
        currentMeds: dto.currentMeds ?? [],
      },
    });
  }

  @Get()
  async listPatients(
    @Req() req: any,
    @Query('search') search: string = '',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      organizationId: req.user.orgId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };
    const [patients, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({ where, skip, take: Number(limit), orderBy: { lastName: 'asc' } }),
      this.prisma.patient.count({ where }),
    ]);
    return { items: patients, total, page: Number(page), limit: Number(limit) };
  }

  @Get(':id')
  async getPatient(@Param('id') id: string, @Req() req: any) {
    return this.prisma.patient.findFirstOrThrow({
      where: { id, organizationId: req.user.orgId },
      include: {
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          include: {
            branch: { select: { name: true } },
          },
        },
        clinicalRecords: {
          orderBy: { createdAt: 'desc' },
          include: { toothEntries: true, files: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  @Post(':id/records')
  @HttpCode(HttpStatus.CREATED)
  async createRecord(
    @Param('id') patientId: string,
    @Body() dto: CreateRecordDto,
    @Req() req: any,
  ) {
    return this.prisma.clinicalRecord.create({
      data: {
        organizationId: req.user.orgId,
        patientId,
        appointmentId: dto.appointmentId,
        doctorId: req.user.sub,
        branchId: req.user.branchIds[0], // active branch from token
        chiefComplaint: dto.chiefComplaint,
        diagnosis: dto.diagnosis,
        treatmentDone: dto.treatmentDone,
        prescription: dto.prescription,
        nextVisitNotes: dto.nextVisitNotes,
      },
    });
  }

  @Post(':id/records/:recordId/odontogram')
  @HttpCode(HttpStatus.CREATED)
  async addOdontogramEntry(
    @Param('recordId') recordId: string,
    @Body() dto: AddOdontogramEntryDto,
    @Req() req: any,
  ) {
    // Upsert: one condition per tooth+surface per record
    return this.prisma.$executeRaw`
      INSERT INTO odontogram_entries (id, clinical_record_id, tooth_number, surface, condition, notes, recorded_at)
      VALUES (gen_random_uuid(), ${recordId}, ${dto.toothNumber}, ${dto.surface ?? null}, ${dto.condition}, ${dto.notes ?? null}, NOW())
      ON CONFLICT (clinical_record_id, tooth_number, surface)
      DO UPDATE SET condition = EXCLUDED.condition, notes = EXCLUDED.notes, recorded_at = NOW()
    `;
  }
}
