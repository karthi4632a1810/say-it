import { prisma } from '../../config/database.js';

export const usersRepository = {
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { department: true, skills: true, userRoles: { include: { role: true } } },
    });
  },

  updateProfile(id: string, data: Record<string, unknown>) {
    return prisma.user.update({
      where: { id },
      data,
      include: { department: true, skills: true, userRoles: { include: { role: true } } },
    });
  },

  searchDirectory(query: string, limit = 50) {
    return prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
          { jobTitle: { contains: query, mode: 'insensitive' } },
          { skills: { some: { skill: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      take: limit,
      include: { department: true, skills: true },
    });
  },

  listDepartments() {
    return prisma.department.findMany({ orderBy: { name: 'asc' } });
  },

  listDepartmentMembers(departmentId: string) {
    return prisma.user.findMany({
      where: { departmentId, isActive: true },
      include: { skills: true },
    });
  },

  updateSkills(userId: string, skills: string[]) {
    return prisma.$transaction([
      prisma.userSkill.deleteMany({ where: { userId } }),
      ...skills.map((skill) => prisma.userSkill.create({ data: { userId, skill } })),
    ]);
  },

  touchLastActive(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
      select: { id: true, lastActiveAt: true },
    });
  },

  getLastActiveMap(userIds: string[]) {
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, lastActiveAt: true },
    });
  },
};
