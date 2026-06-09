import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { generateToken } from '../../lib/crypto.js';

export const mfaService = {
  async setup(userId: string) {
    const secret = speakeasy.generateSecret({ name: 'Say IT', length: 20 });
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url ?? '');
    return { secret: secret.base32, qrCode };
  },

  verify(secret: string, token: string): boolean {
    return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
  },

  async enable(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new Error('MFA not initialized');
    if (!this.verify(user.mfaSecret, token)) throw new Error('Invalid TOTP code');

    const backupCodes = Array.from({ length: 8 }, () => generateToken().slice(0, 8));
    const hashedCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaBackupCodes: hashedCodes },
    });
    return { backupCodes };
  },

  async disable(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
    });
  },
};
