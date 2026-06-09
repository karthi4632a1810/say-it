import { prisma } from '../../config/database.js';

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const authRepository = {
  findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        department: true,
      },
    });
  },

  isUsernameTaken(username: string) {
    return prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
      select: { id: true },
    });
  },

  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        department: true,
      },
    });
  },

  createSession(data: {
    userId: string;
    refreshTokenHash: string;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return prisma.userSession.create({ data });
  },

  findSessionByHash(hash: string) {
    return prisma.userSession.findFirst({
      where: { refreshTokenHash: hash, isActive: true },
      include: { user: true },
    });
  },

  revokeSession(id: string) {
    return prisma.userSession.update({ where: { id }, data: { isActive: false } });
  },

  revokeAllSessions(userId: string) {
    return prisma.userSession.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
  },

  listSessions(userId: string) {
    return prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
    });
  },

  updateSessionLastUsed(id: string) {
    return prisma.userSession.update({ where: { id }, data: { lastUsedAt: new Date() } });
  },

  incrementLoginAttempts(userId: string, lockedUntil?: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: { increment: 1 }, lockedUntil },
    });
  },

  resetLoginAttempts(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: 0, lockedUntil: null },
    });
  },

  async createUser(data: { username: string; passwordHash: string }) {
    const username = normalizeUsername(data.username);
    return prisma.user.create({
      data: {
        username,
        email: `${username}@sayit.local`,
        passwordHash: data.passwordHash,
        fullName: data.username,
        displayName: data.username,
        userRoles: {
          create: {
            role: { connect: { name: 'MEMBER' } },
          },
        },
      },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
      },
    });
  },
};
