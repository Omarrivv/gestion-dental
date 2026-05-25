import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';

/** Inline Prisma provider — reminders service only needs scheduled jobs */
const PrismaProvider = {
  provide: 'PRISMA',
  useFactory: async () => {
    const client = new PrismaClient();
    await client.$connect();
    return client;
  },
};

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PrismaProvider],
})
export class AppModule {}
