import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { mfaService } from './mfa.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { env } from '../../config/env.js';
import { paramId } from '../../lib/params.js';

const REFRESH_COOKIE = 'refresh_token';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { username, password, deviceName } = req.body;
      const result = await authService.login(username, password, {
        deviceName,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      if (result.mfaRequired) {
        sendSuccess(res, { mfaRequired: true, tempToken: result.tempToken });
        return;
      }
      setRefreshCookie(res, result.refreshToken!);
      sendSuccess(res, { accessToken: result.accessToken, user: result.user, mfaRequired: false });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'ACCOUNT_LOCKED') sendError(res, 'ACCOUNT_LOCKED', 'Account temporarily locked', 423);
      else sendError(res, 'INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const result = await authService.register(username, password, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, { accessToken: result.accessToken, user: result.user }, 201);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'USERNAME_TAKEN') sendError(res, 'USERNAME_TAKEN', 'Username is already taken', 409);
      else sendError(res, 'REGISTER_FAILED', 'Registration failed', 400);
    }
  },

  async checkUsername(req: Request, res: Response) {
    const username = (req.query.username as string) ?? '';
    const available = await authService.checkUsernameAvailable(username);
    sendSuccess(res, { available, username: username.trim().toLowerCase() });
  },

  async verifyMfa(req: Request, res: Response) {
    try {
      const { tempToken, totpCode } = req.body;
      const result = await authService.verifyMfa(tempToken, totpCode, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, { accessToken: result.accessToken, user: result.user });
    } catch {
      sendError(res, 'INVALID_MFA', 'Invalid MFA code', 401);
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const token = req.cookies[REFRESH_COOKIE] as string | undefined;
      if (!token) {
        sendError(res, 'UNAUTHORIZED', 'No refresh token', 401);
        return;
      }
      const result = await authService.refresh(token);
      setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, { accessToken: result.accessToken });
    } catch {
      sendError(res, 'UNAUTHORIZED', 'Invalid refresh token', 401);
    }
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (token) {
      try {
        await authService.logout(token);
      } catch {
        // Best-effort session revoke
      }
    }
    clearRefreshCookie(res);
    sendSuccess(res, { loggedOut: true });
  },

  async sessions(req: Request, res: Response) {
    const sessions = await authService.listSessions(req.user!.userId);
    sendSuccess(res, sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
    })));
  },

  async revokeSession(req: Request, res: Response) {
    await authService.revokeSession(req.user!.userId, paramId(req.params.id));
    sendSuccess(res, { revoked: true });
  },

  async mfaSetup(req: Request, res: Response) {
    const result = await mfaService.setup(req.user!.userId);
    sendSuccess(res, result);
  },

  async mfaEnable(req: Request, res: Response) {
    try {
      const { totpCode } = req.body;
      const result = await mfaService.enable(req.user!.userId, totpCode);
      sendSuccess(res, result);
    } catch {
      sendError(res, 'INVALID_MFA', 'Invalid TOTP code', 400);
    }
  },

  async mfaDisable(req: Request, res: Response) {
    await mfaService.disable(req.user!.userId);
    sendSuccess(res, { disabled: true });
  },
};
