import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { InvoicesController } from './interface/http/controllers/InvoicesController';

@Module({
  imports: [CqrsModule],
  controllers: [InvoicesController],
  providers: [PrismaService],
})
export class AppModule {}
