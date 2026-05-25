import { Module } from '@nestjs/common';
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { ReportsController } from './interface/http/controllers/ReportsController';

@Module({
  controllers: [ReportsController],
  providers: [PrismaService],
})
export class AppModule {}
