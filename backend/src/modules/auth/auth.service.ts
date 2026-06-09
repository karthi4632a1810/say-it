import { authRepository } from './auth.repository.js';
import { mfaService } from './mfa.service.js';
import { comparePassword, hashPassword, hashToken, generateToken } from '../../lib/crypto.js';
import { signAccessToken, signTempToken } from '../../config/jwt.js';
import { env } from '../../config/env.js';

type UserWithRoles = {
  userRoles: Array<{
    role: {
      name: string;
      rolePermissions: Array<{ permission: { resource: string; action: string } }>;
    };
  }>;
};

function extractPermissions(user: UserWithRoles) {
  const permissions = new Set<string>();
  const roles: string[] = [];
  for (const ur of user.userRoles) {
    roles.push(ur.role.name);
    for (const rp of ur.role.rolePermissions) {
      permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
    }
  }
  return { roles, permissions: [...permissions] };
}

function parseRefreshExpiry(): number {
  const match = env.JWT_REFRESH_EXPIRY.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const [, num, unit] = match;
  const n = parseInt(num!, 10);
  const multipliers: Record<string, number> = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return n * (multipliers[unit!] ?? 86400000);
}

function formatAuthUser(user: { id: string; username: string; email: string; fullName: string; displayName: string; avatarUrl: string | null }, roles: string[]) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    roles,
  };
}

export const authService = {
  async checkUsernameAvailable(username: string) {
    const taken = await authRepository.isUsernameTaken(username);
    return !taken;
  },

  async register(username: string, password: string, meta: { deviceName?: string; ip?: string; userAgent?: string }) {
    const taken = await authRepository.isUsernameTaken(username);
    if (taken) throw new Error('USERNAME_TAKEN');

    const passwordHash = await hashPassword(password);
    const user = await authRepository.createUser({ username, passwordHash });
    const { conversationsService } = await import('../conversations/conversations.service.js');
    await conversationsService.list(user.id);
    const { roles, permissions } = extractPermissions(user);

    const refreshToken = generateToken();
    const expiresAt = new Date(Date.now() + parseRefreshExpiry());
    await authRepository.createSession({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      deviceName: meta.deviceName,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions,
    });

    return {
      accessToken,
      refreshToken,
      user: formatAuthUser(user, roles),
    };
  },

  async login(username: string, password: string, meta: { deviceName?: string; ip?: string; userAgent?: string }) {
    const user = username.includes('@')
      ? await authRepository.findUserByEmail(username)
      : await authRepository.findUserByUsername(username);
    if (!user || !user.isActive) {
      throw new Error('INVALID_CREDENTIALS');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error('ACCOUNT_LOCKED');
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined;
      await authRepository.incrementLoginAttempts(user.id, lockedUntil);
      throw new Error('INVALID_CREDENTIALS');
    }
    await authRepository.resetLoginAttempts(user.id);

    const { roles, permissions } = extractPermissions(user);

    if (user.mfaEnabled && user.mfaSecret) {
      const tempToken = signTempToken({ userId: user.id, purpose: 'mfa' });
      return { mfaRequired: true, tempToken, user: null, accessToken: null, refreshToken: null };
    }

    const refreshToken = generateToken();
    const expiresAt = new Date(Date.now() + parseRefreshExpiry());
    await authRepository.createSession({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      deviceName: meta.deviceName,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions,
    });

    return {
      mfaRequired: false,
      accessToken,
      refreshToken,
      user: formatAuthUser(user, roles),
    };
  },

  async verifyMfa(tempToken: string, totpCode: string, meta: { deviceName?: string; ip?: string; userAgent?: string }) {
    const { verifyTempToken } = await import('../../config/jwt.js');
    const { prisma } = await import('../../config/database.js');
    const payload = verifyTempToken(tempToken);
    const fullUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
      },
    });
    if (!fullUser?.mfaSecret || !mfaService.verify(fullUser.mfaSecret, totpCode)) {
      throw new Error('INVALID_MFA');
    }

    const { roles, permissions } = extractPermissions(fullUser);
    const refreshToken = generateToken();
    const expiresAt = new Date(Date.now() + parseRefreshExpiry());
    await authRepository.createSession({
      userId: fullUser.id,
      refreshTokenHash: hashToken(refreshToken),
      deviceName: meta.deviceName,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: fullUser.id,
      email: fullUser.email,
      roles,
      permissions,
    });

    return {
      accessToken,
      refreshToken,
      user: formatAuthUser(fullUser, roles),
    };
  },

  async refresh(refreshToken: string) {
    const session = await authRepository.findSessionByHash(hashToken(refreshToken));
    if (!session || session.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH');
    }
    const user = await authRepository.findUserByEmail(session.user.email);
    if (!user) throw new Error('INVALID_REFRESH');

    const { roles, permissions } = extractPermissions(user);
    const newRefresh = generateToken();
    await authRepository.revokeSession(session.id);
    await authRepository.createSession({
      userId: user.id,
      refreshTokenHash: hashToken(newRefresh),
      deviceName: session.deviceName ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt: new Date(Date.now() + parseRefreshExpiry()),
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions,
    });

    return { accessToken, refreshToken: newRefresh };
  },

  async logout(refreshToken: string) {
    const session = await authRepository.findSessionByHash(hashToken(refreshToken));
    if (session) await authRepository.revokeSession(session.id);
  },

  listSessions(userId: string) {
    return authRepository.listSessions(userId);
  },

  revokeSession(userId: string, sessionId: string) {
    return authRepository.revokeSession(sessionId);
  },
};
