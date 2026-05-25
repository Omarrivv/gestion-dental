import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { PatientsController } from './interface/http/controllers/PatientsController';

@Module({
  imports: [CqrsModule],
  controllers: [PatientsController],
  providers: [PrismaService],
})
export class AppModule {}
