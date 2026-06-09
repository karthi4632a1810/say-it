import { prisma } from '../../config/database.js';
import { conversationsRepository } from './conversations.repository.js';

async function ensurePublicChannelMembership(userId: string) {
  const publicChannels = await prisma.conversation.findMany({
    where: { type: 'CHANNEL', isPrivate: false, isArchived: false },
    select: { id: true },
  });
  for (const channel of publicChannels) {
    const existing = await conversationsRepository.findMember(channel.id, userId);
    if (!existing) {
      await conversationsRepository.addMember(channel.id, userId);
    }
  }
}

export const conversationsService = {
  async list(userId: string) {
    let conversations = await conversationsRepository.listForUser(userId);
    if (conversations.length === 0) {
      await ensurePublicChannelMembership(userId);
      conversations = await conversationsRepository.listForUser(userId);
    }
    return conversations;
  },

  async get(id: string, userId: string) {
    const member = await conversationsRepository.findMember(id, userId);
    if (!member) throw new Error('FORBIDDEN');
    return conversationsRepository.findById(id);
  },

  async createDirect(userId: string, otherUserId: string) {
    const existing = await conversationsRepository.findDirect(userId, otherUserId);
    if (existing) return existing;
    return conversationsRepository.create({
      type: 'DIRECT',
      createdBy: userId,
      memberIds: [userId, otherUserId],
    });
  },

  async createGroup(userId: string, name: string, description: string | undefined, memberIds: string[]) {
    const allMembers = [...new Set([userId, ...memberIds])];
    return conversationsRepository.create({
      type: 'GROUP',
      name,
      description,
      createdBy: userId,
      memberIds: allMembers,
    });
  },

  async createChannel(userId: string, data: { name: string; description?: string; departmentId: string; isPrivate: boolean }) {
    const deptMembers = await import('../users/users.repository.js').then((m) =>
      m.usersRepository.listDepartmentMembers(data.departmentId),
    );
    const memberIds = data.isPrivate ? [userId] : deptMembers.map((u) => u.id);
    if (!memberIds.includes(userId)) memberIds.push(userId);
    return conversationsRepository.create({
      type: 'CHANNEL',
      name: data.name,
      description: data.description,
      departmentId: data.departmentId,
      isPrivate: data.isPrivate,
      createdBy: userId,
      memberIds,
    });
  },

  async update(id: string, userId: string, data: { name?: string; description?: string }) {
    const member = await conversationsRepository.findMember(id, userId);
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) throw new Error('FORBIDDEN');
    return conversationsRepository.update(id, data);
  },

  async addMember(conversationId: string, userId: string, targetUserId: string) {
    const member = await conversationsRepository.findMember(conversationId, userId);
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) throw new Error('FORBIDDEN');
    return conversationsRepository.addMember(conversationId, targetUserId);
  },

  async removeMember(conversationId: string, userId: string, targetUserId: string) {
    const member = await conversationsRepository.findMember(conversationId, userId);
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) throw new Error('FORBIDDEN');
    return conversationsRepository.removeMember(conversationId, targetUserId);
  },

  async listMembers(conversationId: string, userId: string) {
    const member = await conversationsRepository.findMember(conversationId, userId);
    if (!member) throw new Error('FORBIDDEN');
    const conv = await conversationsRepository.findById(conversationId);
    return conv?.members ?? [];
  },

  async assertMember(conversationId: string, userId: string) {
    const member = await conversationsRepository.findMember(conversationId, userId);
    if (!member) throw new Error('FORBIDDEN');
    return member;
  },
};
