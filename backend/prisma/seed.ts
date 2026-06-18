import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Salary calculation helper ────────────────────────────────────────────────
// Rules agreed with HR:
//   Basic          = 60 % of gross  (rounded to nearest 100)
//   HRA            = 40 % of basic  (rounded to nearest 100)
//   Medical        = ₹ 1,250 fixed
//   Conveyance     = ₹ 1,600 fixed
//   Bonus          = 8.33 % of basic, only when basic ≤ ₹ 7,000 (Bonus Act)
//   Leave Allow.   = 0 in these samples (can be set later)
//   Other Allow.   = gross − (basic + hra + medical + conveyance + bonus + leaveAllowance)
function calcComponents(gross: number) {
  const basic = Math.round((gross * 0.6) / 100) * 100;
  const hra = Math.round((basic * 0.4) / 100) * 100;
  const medical = 1250;
  const conveyance = 1600;
  const leaveAllowance = 0;
  // Bonus Act: mandatory only when basic ≤ ₹ 7,000
  const bonus = basic <= 7000 ? Math.round(basic * 0.0833) : 0;
  const otherAllowance = gross - basic - hra - medical - conveyance - bonus - leaveAllowance;
  return { basic, hra, medical, conveyance, leaveAllowance, bonus, otherAllowance };
}

async function main() {
  console.log('🌱 Seeding database…');

  // ── Users ─────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@hrms.com' },
    update: {},
    create: {
      email: 'admin@hrms.com',
      password: await bcrypt.hash('Admin@123', 10),
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'hr@hrms.com' },
    update: {},
    create: {
      email: 'hr@hrms.com',
      password: await bcrypt.hash('Hr@123', 10),
      name: 'HR Manager',
      role: 'HR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'accounts@hrms.com' },
    update: {},
    create: {
      email: 'accounts@hrms.com',
      password: await bcrypt.hash('Accounts@123', 10),
      name: 'Accounts Manager',
      role: 'ACCOUNTS',
    },
  });

  // ── Company Settings ───────────────────────────────────────────────────────
  await prisma.companySettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      companyName: 'Your Company Ltd.',
      address: 'Mumbai, Maharashtra',
      state: 'MH',
      pfCeiling: 15000,
      esiCeiling: 21000,
    },
  });

  // ── Sites ──────────────────────────────────────────────────────────────────
  const siteHO = await prisma.site.upsert({
    where: { id: 'site-ho-mumbai' },
    update: {},
    create: {
      id: 'site-ho-mumbai',
      name: 'Head Office',
      city: 'Mumbai',
      state: 'MH',
      isActive: true,
    },
  });

  const sitePune = await prisma.site.upsert({
    where: { id: 'site-pune' },
    update: {},
    create: {
      id: 'site-pune',
      name: 'Pune Office',
      city: 'Pune',
      state: 'MH',
      isActive: true,
    },
  });

  console.log('  ✔ Sites seeded');

  // ── Designation Master ─────────────────────────────────────────────────────
  const designations = [
    // Skilled
    { designation: 'Senior Engineer',        skillLevel: 'SKILLED'     as const },
    { designation: 'Project Manager',        skillLevel: 'SKILLED'     as const },
    { designation: 'Site Supervisor',        skillLevel: 'SKILLED'     as const },
    { designation: 'Accounts Manager',       skillLevel: 'SKILLED'     as const },
    { designation: 'HR Manager',             skillLevel: 'SKILLED'     as const },
    // Semi-skilled
    { designation: 'HR Executive',           skillLevel: 'SEMI_SKILLED' as const },
    { designation: 'Operations Executive',   skillLevel: 'SEMI_SKILLED' as const },
    { designation: 'Accounts Executive',     skillLevel: 'SEMI_SKILLED' as const },
    { designation: 'Junior Engineer',        skillLevel: 'SEMI_SKILLED' as const },
    // Unskilled
    { designation: 'Office Assistant',       skillLevel: 'UNSKILLED'   as const },
    { designation: 'Housekeeping Staff',     skillLevel: 'UNSKILLED'   as const },
    { designation: 'Security Guard',         skillLevel: 'UNSKILLED'   as const },
  ];

  for (const d of designations) {
    await prisma.designationMaster.upsert({
      where: { designation: d.designation },
      update: { skillLevel: d.skillLevel },
      create: d,
    });
  }

  console.log('  ✔ Designation master seeded');

  // ── Minimum Wages (Maharashtra, effective 1 Jan 2024) ──────────────────────
  // Both sites are in Maharashtra → same wage schedule
  const mwEffFrom = new Date('2024-01-01');
  const wageMatrix = [
    { skillLevel: 'SKILLED'     as const, monthlyWage: 17000 },
    { skillLevel: 'SEMI_SKILLED' as const, monthlyWage: 14000 },
    { skillLevel: 'UNSKILLED'   as const, monthlyWage: 12000 },
  ];

  for (const site of [siteHO, sitePune]) {
    for (const w of wageMatrix) {
      await prisma.minimumWage.upsert({
        where: {
          siteId_skillLevel_effectiveFrom: {
            siteId: site.id,
            skillLevel: w.skillLevel,
            effectiveFrom: mwEffFrom,
          },
        },
        update: { monthlyWage: w.monthlyWage },
        create: {
          siteId: site.id,
          skillLevel: w.skillLevel,
          monthlyWage: w.monthlyWage,
          effectiveFrom: mwEffFrom,
          effectiveTo: null,
        },
      });
    }
  }

  console.log('  ✔ Minimum wages seeded');

  // ── Sample Employees ───────────────────────────────────────────────────────
  const employeeDefs = [
    {
      employeeCode: 'EMP001',
      firstName: 'Rahul',
      lastName: 'Sharma',
      sex: 'MALE'        as const,
      dateOfBirth: new Date('1990-05-15'),
      bloodGroup: 'B_POS' as const,
      fathersName: 'Ramesh Sharma',
      addressLine1: '12, Green Park',
      city: 'Mumbai',
      stateName: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      designation: 'Senior Engineer',
      type: 'ON_ROLLS'   as const,
      status: 'ACTIVE'   as const,
      dateOfJoining: new Date('2022-01-15'),
      siteId: siteHO.id,
      aadhaarNumber: '123456789012',
      panNumber: 'ABCDE1234F',
      epfNumber: 'MH/BOM/12345/001',
      uanNumber: '100123456789',
      taxRegime: 'NEW'   as const,
      ptState: 'MH',
      bankAccount: '12345678901',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      grossSalary: 82850,
    },
    {
      employeeCode: 'EMP002',
      firstName: 'Priya',
      lastName: 'Patel',
      sex: 'FEMALE'      as const,
      dateOfBirth: new Date('1992-08-22'),
      bloodGroup: 'A_POS' as const,
      fathersName: 'Prakash Patel',
      addressLine1: '45, Linking Road',
      city: 'Mumbai',
      stateName: 'Maharashtra',
      country: 'India',
      pincode: '400054',
      designation: 'Accounts Manager',
      type: 'ON_ROLLS'   as const,
      status: 'ACTIVE'   as const,
      dateOfJoining: new Date('2022-06-01'),
      siteId: siteHO.id,
      aadhaarNumber: '234567890123',
      panNumber: 'BCDEF2345G',
      epfNumber: 'MH/BOM/12345/002',
      uanNumber: '100234567890',
      taxRegime: 'NEW'   as const,
      ptState: 'MH',
      bankAccount: '23456789012',
      ifsc: 'SBIN0001234',
      bankName: 'State Bank of India',
      grossSalary: 57850,
    },
    {
      employeeCode: 'EMP003',
      firstName: 'Ankit',
      lastName: 'Singh',
      sex: 'MALE'        as const,
      dateOfBirth: new Date('1995-02-10'),
      bloodGroup: 'O_POS' as const,
      fathersName: 'Ajay Singh',
      addressLine1: '8, Andheri East',
      city: 'Mumbai',
      stateName: 'Maharashtra',
      country: 'India',
      pincode: '400069',
      designation: 'HR Executive',
      type: 'ON_ROLLS'   as const,
      status: 'PROBATION' as const,
      dateOfJoining: new Date('2023-03-10'),
      siteId: siteHO.id,
      aadhaarNumber: '345678901234',
      panNumber: 'CDEFG3456H',
      epfNumber: 'MH/BOM/12345/003',
      uanNumber: '100345678901',
      taxRegime: 'NEW'   as const,
      ptState: 'MH',
      bankAccount: '34567890123',
      ifsc: 'ICIC0001234',
      bankName: 'ICICI Bank',
      grossSalary: 35850,
    },
    {
      employeeCode: 'EMP004',
      firstName: 'Neha',
      lastName: 'Gupta',
      sex: 'FEMALE'      as const,
      dateOfBirth: new Date('1997-11-30'),
      bloodGroup: 'AB_POS' as const,
      fathersName: 'Naresh Gupta',
      addressLine1: '22, Borivali West',
      city: 'Mumbai',
      stateName: 'Maharashtra',
      country: 'India',
      pincode: '400092',
      designation: 'Operations Executive',
      type: 'ON_ROLLS'   as const,
      status: 'ACTIVE'   as const,
      dateOfJoining: new Date('2023-08-01'),
      siteId: sitePune.id,
      aadhaarNumber: '456789012345',
      panNumber: 'DEFGH4567I',
      epfNumber: 'MH/BOM/12345/004',
      uanNumber: '100456789012',
      esiNumber: '1001234567',
      taxRegime: 'NEW'   as const,
      ptState: 'MH',
      bankAccount: '45678901234',
      ifsc: 'UTIB0001234',
      bankName: 'Axis Bank',
      grossSalary: 30050,
    },
    {
      employeeCode: 'EMP005',
      firstName: 'Suresh',
      lastName: 'Kumar',
      sex: 'MALE'        as const,
      dateOfBirth: new Date('1988-07-04'),
      bloodGroup: 'O_NEG' as const,
      fathersName: 'Shankar Kumar',
      addressLine1: '5, Chembur Colony',
      city: 'Mumbai',
      stateName: 'Maharashtra',
      country: 'India',
      pincode: '400071',
      designation: 'Site Supervisor',
      type: 'ON_CONTRACT' as const,
      status: 'ACTIVE'   as const,
      dateOfJoining: new Date('2023-11-15'),
      siteId: sitePune.id,
      aadhaarNumber: '567890123456',
      panNumber: 'EFGHI5678J',
      epfNumber: 'MH/BOM/12345/005',
      uanNumber: '100567890123',
      esiNumber: '1001234568',
      taxRegime: 'NEW'   as const,
      ptState: 'MH',
      bankAccount: '56789012345',
      ifsc: 'PUNB0001234',
      bankName: 'Punjab National Bank',
      grossSalary: 23450,
    },
  ] as const;

  // Upsert employees (without salary or siteId fields)
  for (const { grossSalary: _g, siteId: _s, ...emp } of employeeDefs) {
    await prisma.employee.upsert({
      where: { employeeCode: emp.employeeCode },
      update: {},   // keep other fields stable on re-seed
      create: emp,
    });
  }

  console.log('  ✔ Employees seeded');

  // ── Employee site assignments ──────────────────────────────────────────────
  for (const empDef of employeeDefs) {
    const employee = await prisma.employee.findUnique({ where: { employeeCode: empDef.employeeCode } });
    if (!employee) continue;
    // Upsert primary site assignment (idempotent)
    await prisma.employeeSite.upsert({
      where: { employeeId_siteId: { employeeId: employee.id, siteId: empDef.siteId } },
      update: {},
      create: { employeeId: employee.id, siteId: empDef.siteId, isPrimary: true },
    });
  }

  console.log('  ✔ Employee site assignments seeded');

  // ── Salary Revisions ───────────────────────────────────────────────────────
  for (const empDef of employeeDefs) {
    const employee = await prisma.employee.findUnique({
      where: { employeeCode: empDef.employeeCode },
    });
    if (!employee) continue;

    // Only seed if no revision exists yet (avoid overwriting manual entries on re-seed)
    const existing = await prisma.salaryRevision.findFirst({
      where: { employeeId: employee.id },
    });
    if (existing) continue;

    const comps = calcComponents(empDef.grossSalary);
    await prisma.salaryRevision.create({
      data: {
        employeeId:    employee.id,
        effectiveFrom: employee.dateOfJoining ?? new Date('2022-01-01'),
        effectiveTo:   null,   // currently active
        grossSalary:   empDef.grossSalary,
        ...comps,
        remarks: 'Initial salary on joining',
      },
    });
  }

  console.log('  ✔ Salary revisions seeded');

  // ── Sample Dependents ──────────────────────────────────────────────────────
  const emp1 = await prisma.employee.findUnique({ where: { employeeCode: 'EMP001' } });
  if (emp1) {
    await prisma.dependent.upsert({
      where: { id: 'dep-001' },
      update: {},
      create: {
        id: 'dep-001',
        employeeId: emp1.id,
        firstName: 'Sunita',
        lastName: 'Sharma',
        sex: 'FEMALE',
        relationship: 'SPOUSE',
        dateOfBirth: new Date('1992-03-20'),
      },
    });
  }

  console.log('  ✔ Dependents seeded');

  console.log('\n✅ Seeding complete!');
  console.log('   admin@hrms.com    / Admin@123');
  console.log('   hr@hrms.com       / Hr@123');
  console.log('   accounts@hrms.com / Accounts@123\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
