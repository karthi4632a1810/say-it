import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PERMISSIONS, SYSTEM_ROLES } from '@say-it/shared';

const prisma = new PrismaClient();

async function main() {
  for (const perm of PERMISSIONS) {
    const [resource, action] = perm.split(':');
    await prisma.permission.upsert({
      where: { resource_action: { resource: resource!, action: action! } },
      create: { resource: resource!, action: action!, description: perm },
      update: {},
    });
  }

  const allPermissions = await prisma.permission.findMany();

  const roles = [
    { name: SYSTEM_ROLES.SUPER_ADMIN, description: 'Full system access', isSystem: true },
    { name: SYSTEM_ROLES.ADMIN, description: 'Administrator', isSystem: true },
    { name: SYSTEM_ROLES.DEPT_ADMIN, description: 'Department admin', isSystem: true },
    { name: SYSTEM_ROLES.MEMBER, description: 'Standard member', isSystem: true },
    { name: SYSTEM_ROLES.READONLY, description: 'Read-only access', isSystem: true },
  ];

  for (const role of roles) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: {},
    });

    const memberPermKeys = new Set([
      'users:read', 'conversations:create', 'files:upload', 'meetings:schedule',
      'ai:search', 'ai:summarize',
    ]);
    const deptAdminPermKeys = new Set([
      'users:read', 'channels:create', 'channels:manage', 'announcements:create',
      'meetings:schedule', 'meetings:manage', 'ai:search', 'ai:summarize', 'files:upload',
      'conversations:create', 'conversations:manage',
    ]);

    const permsToAssign =
      role.name === SYSTEM_ROLES.SUPER_ADMIN || role.name === SYSTEM_ROLES.ADMIN
        ? allPermissions
        : role.name === SYSTEM_ROLES.DEPT_ADMIN
          ? allPermissions.filter((p) => deptAdminPermKeys.has(`${p.resource}:${p.action}`))
          : role.name === SYSTEM_ROLES.MEMBER
            ? allPermissions.filter((p) => memberPermKeys.has(`${p.resource}:${p.action}`))
            : allPermissions.filter((p) => p.action === 'read');

    for (const perm of permsToAssign) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: r.id, permissionId: perm.id } },
        create: { roleId: r.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  const engineering = await prisma.department.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Engineering',
      description: 'Software engineering department',
    },
    update: {},
  });

  await prisma.department.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Human Resources',
      description: 'HR department',
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const adminRole = await prisma.role.findUnique({ where: { name: SYSTEM_ROLES.SUPER_ADMIN } });
  const memberRole = await prisma.role.findUnique({ where: { name: SYSTEM_ROLES.MEMBER } });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sayit.local' },
    create: {
      username: 'admin',
      email: 'admin@sayit.local',
      passwordHash,
      fullName: 'System Admin',
      displayName: 'Admin',
      jobTitle: 'Platform Administrator',
      departmentId: engineering.id,
      isActive: true,
    },
    update: { passwordHash, username: 'admin' },
  });

  const demo = await prisma.user.upsert({
    where: { email: 'demo@sayit.local' },
    create: {
      username: 'demo',
      email: 'demo@sayit.local',
      passwordHash,
      fullName: 'Demo User',
      displayName: 'Demo',
      jobTitle: 'Software Engineer',
      departmentId: engineering.id,
      isActive: true,
      skills: { create: [{ skill: 'TypeScript' }, { skill: 'React' }] },
    },
    update: { passwordHash, username: 'demo' },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      create: { userId: admin.id, roleId: adminRole.id },
      update: {},
    });
  }

  if (memberRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: demo.id, roleId: memberRole.id } },
      create: { userId: demo.id, roleId: memberRole.id },
      update: {},
    });
  }

  const generalChannel = await prisma.conversation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      type: 'CHANNEL',
      name: 'General',
      description: 'Engineering general channel',
      departmentId: engineering.id,
      isPrivate: false,
      createdBy: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: demo.id, role: 'MEMBER' },
        ],
      },
    },
    update: {},
  });

  await prisma.message.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      conversationId: generalChannel.id,
      senderId: admin.id,
      content: 'Welcome to Say IT! This is the Engineering #General channel.',
      contentType: 'TEXT',
    },
    update: {},
  });

  let directConv = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { members: { some: { userId: admin.id } } },
        { members: { some: { userId: demo.id } } },
      ],
    },
  });
  if (!directConv) {
    directConv = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        createdBy: admin.id,
        members: {
          create: [
            { userId: admin.id, role: 'MEMBER' },
            { userId: demo.id, role: 'MEMBER' },
          ],
        },
      },
    });
    await prisma.message.create({
      data: {
        conversationId: directConv.id,
        senderId: admin.id,
        content: 'Hey Demo — tap here to try direct messages!',
        contentType: 'TEXT',
      },
    });
  }

  console.log('Seed complete.');
  console.log('  admin / Admin123!');
  console.log('  demo / Admin123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
