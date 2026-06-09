import { usersRepository } from './users.repository.js';
import { getPresence } from '../../lib/presence.js';
import { env } from '../../config/env.js';
import { minioClient } from '../../config/minio.js';
import { v4 as uuid } from 'uuid';

export const usersService = {
  async getMe(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new Error('NOT_FOUND');
    return formatUser(user);
  },

  async updateProfile(userId: string, data: Record<string, unknown>) {
    const { skills, ...rest } = data;
    if (Array.isArray(skills)) {
      await usersRepository.updateSkills(userId, skills as string[]);
    }
    const user = await usersRepository.updateProfile(userId, rest);
    return formatUser(user);
  },

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const key = `avatars/${userId}/${uuid()}`;
    await minioClient.putObject(env.MINIO_BUCKET, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
    const avatarUrl = `/${env.MINIO_BUCKET}/${key}`;
    await usersRepository.updateProfile(userId, { avatarUrl });
    return { avatarUrl };
  },

  searchDirectory(query: string) {
    return usersRepository.searchDirectory(query);
  },

  async getProfile(id: string) {
    const user = await usersRepository.findById(id);
    if (!user || !user.isActive) throw new Error('NOT_FOUND');
    return formatUser(user);
  },

  async getPresence(userId: string) {
    return { userId, status: await getPresence(userId) };
  },

  listDepartments() {
    return usersRepository.listDepartments();
  },

  listDepartmentMembers(departmentId: string) {
    return usersRepository.listDepartmentMembers(departmentId);
  },
};

function formatUser(user: NonNullable<Awaited<ReturnType<typeof usersRepository.findById>>>) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    department: user.department,
    phone: user.phone,
    bio: user.bio,
    location: user.location,
    timezone: user.timezone,
    skills: user.skills.map((s) => s.skill),
    roles: user.userRoles.map((r) => r.role.name),
    mfaEnabled: user.mfaEnabled,
  };
}
