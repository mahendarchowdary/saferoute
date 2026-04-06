const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    // Create School
    const school = await prisma.school.upsert({
      where: { email: 'school@test.com' },
      update: {},
      create: {
        name: 'Test School',
        email: 'school@test.com',
        phone: '+91 9876543200',
        address: 'Test Address',
      },
    });
    console.log('✅ School created:', school.name);

    // Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        name: 'School Admin',
        email: 'admin@test.com',
        password: adminPassword,
        role: 'ADMIN',
        schoolId: school.id,
      },
    });
    console.log('✅ Admin created:', admin.email);

    // Create Driver
    const driverPassword = await bcrypt.hash('driver123', 10);
    const driver = await prisma.user.upsert({
      where: { email: 'driver@test.com' },
      update: {},
      create: {
        name: 'Test Driver',
        email: 'driver@test.com',
        phone: '+91 9876543211',
        password: driverPassword,
        role: 'DRIVER',
        schoolId: school.id,
      },
    });
    console.log('✅ Driver created:', driver.email, 'Phone:', driver.phone);

    // Create Bus
    const bus = await prisma.bus.upsert({
      where: { plateNumber: 'TEST-001' },
      update: {},
      create: {
        plateNumber: 'TEST-001',
        model: 'Test Bus Model',
        capacity: 30,
        schoolId: school.id,
      },
    });
    console.log('✅ Bus created:', bus.plateNumber);

    // Assign driver
    await prisma.driverAssignment.upsert({
      where: { driverId: driver.id },
      update: { busId: bus.id },
      create: {
        driverId: driver.id,
        busId: bus.id,
        schoolId: school.id,
      },
    });
    console.log('✅ Driver assigned to bus');

    // Create Parent
    const parentPassword = await bcrypt.hash('parent123', 10);
    const parent = await prisma.user.upsert({
      where: { email: 'parent@test.com' },
      update: {},
      create: {
        name: 'Test Parent',
        email: 'parent@test.com',
        phone: '+91 9876543222',
        password: parentPassword,
        role: 'PARENT',
        schoolId: school.id,
      },
    });
    console.log('✅ Parent created:', parent.email, 'Phone:', parent.phone);

    // Create Student
    const student = await prisma.student.upsert({
      where: { id: 'test-student-1' },
      update: {},
      create: {
        id: 'test-student-1',
        name: 'Test Student',
        grade: '5',
        schoolId: school.id,
        parentId: parent.id,
      },
    });
    console.log('✅ Student created:', student.name);

    console.log('\n🎉 Test data seeded successfully!');
    console.log('\n📱 Login Credentials:');
    console.log('  Admin: admin@test.com / admin123');
    console.log('  Driver: +91 9876543211 / driver123');
    console.log('  Parent: +91 9876543222 / parent123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
