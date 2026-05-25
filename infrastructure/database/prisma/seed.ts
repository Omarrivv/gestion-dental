import { PrismaClient, SubscriptionPlan, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const BCRYPT_ROUNDS = 12;
  const superadminEmail = process.env.SUPERADMIN_EMAIL ?? 'superadmin@dentalos.io';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD ?? 'CHANGE_ME_NOW';

  // ── SuperAdmin ──────────────────────────────────────────────────────────────
  await prisma.superAdmin.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      email: superadminEmail,
      passwordHash: await bcrypt.hash(superadminPassword, BCRYPT_ROUNDS),
    },
  });
  console.log(`  ✅ SuperAdmin created: ${superadminEmail}`);

  // ── Demo Org 1: Dental Omar SV ───────────────────────────────────────────────
  const omarOrg = await prisma.organization.upsert({
    where: { slug: 'dental-omar-sv' },
    update: {},
    create: {
      name: 'Dental Omar SV',
      slug: 'dental-omar-sv',
      plan: SubscriptionPlan.PROFESSIONAL,
      primaryColor: '#2563EB',
    },
  });

  const santaAnaBranch = await prisma.branch.upsert({
    where: { id: 'seed-branch-santa-ana' },
    update: {},
    create: {
      id: 'seed-branch-santa-ana',
      organizationId: omarOrg.id,
      name: 'Sucursal Santa Ana',
      address: '4a Calle Oriente, Santa Ana',
      city: 'Santa Ana',
      phone: '+503 2440-0001',
    },
  });

  const ssvBranch = await prisma.branch.upsert({
    where: { id: 'seed-branch-san-salvador' },
    update: {},
    create: {
      id: 'seed-branch-san-salvador',
      organizationId: omarOrg.id,
      name: 'Sucursal San Salvador',
      address: 'Colonia Escalón, San Salvador',
      city: 'San Salvador',
      phone: '+503 2260-0001',
    },
  });

  // Omar — org admin
  const omar = await prisma.user.upsert({
    where: { id: 'seed-user-omar' },
    update: {},
    create: {
      id: 'seed-user-omar',
      organizationId: omarOrg.id,
      email: 'omar@dental-omar-sv.com',
      passwordHash: await bcrypt.hash('Omar1234!', BCRYPT_ROUNDS),
      firstName: 'Omar',
      lastName: 'García',
      role: UserRole.ORG_ADMIN,
    },
  });

  await prisma.userBranchAccess.createMany({
    skipDuplicates: true,
    data: [
      { userId: omar.id, branchId: santaAnaBranch.id },
      { userId: omar.id, branchId: ssvBranch.id },
    ],
  });

  // Doctor in Santa Ana
  const doctorAna = await prisma.user.upsert({
    where: { id: 'seed-doctor-ana' },
    update: {},
    create: {
      id: 'seed-doctor-ana',
      organizationId: omarOrg.id,
      email: 'ana@dental-omar-sv.com',
      passwordHash: await bcrypt.hash('Doctor1234!', BCRYPT_ROUNDS),
      firstName: 'Ana',
      lastName: 'Martínez',
      role: UserRole.DOCTOR,
    },
  });

  await prisma.userBranchAccess.createMany({
    skipDuplicates: true,
    data: [{ userId: doctorAna.id, branchId: santaAnaBranch.id }],
  });

  // Doctor schedule Mon–Fri 09:00–17:00
  for (let day = 1; day <= 5; day++) {
    await prisma.doctorSchedule.upsert({
      where: { doctorId_branchId_dayOfWeek: { doctorId: doctorAna.id, branchId: santaAnaBranch.id, dayOfWeek: day } },
      update: {},
      create: {
        doctorId: doctorAna.id,
        branchId: santaAnaBranch.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotMinutes: 30,
      },
    });
  }

  // Sample patient
  await prisma.patient.upsert({
    where: { id: 'seed-patient-juan' },
    update: {},
    create: {
      id: 'seed-patient-juan',
      organizationId: omarOrg.id,
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+503 7000-0001',
      email: 'juan.perez@example.com',
      bloodType: 'O+',
      allergies: ['Penicilina'],
      currentMeds: [],
    },
  });

  console.log('  ✅ Dental Omar SV seeded');
  console.log('\n🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
