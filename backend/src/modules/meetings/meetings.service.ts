import { prisma } from '../../config/database.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { embeddingQueue } from '../../workers/queue.js';

export const meetingsService = {
  async list(userId: string) {
    return prisma.meeting.findMany({
      where: {
        OR: [
          { organizerId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        organizer: { select: { id: true, displayName: true } },
        participants: { include: { user: { select: { id: true, displayName: true } } } },
      },
      orderBy: { startsAt: 'asc' },
    });
  },

  async create(userId: string, data: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt: string;
    recurrenceType?: string;
    location?: string;
    meetingUrl?: string;
    departmentId?: string;
    participantIds: string[];
  }) {
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        description: data.description,
        organizerId: userId,
        departmentId: data.departmentId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        recurrenceType: (data.recurrenceType as 'ONCE') ?? 'ONCE',
        location: data.location,
        meetingUrl: data.meetingUrl,
        participants: {
          create: data.participantIds.map((pid) => ({ userId: pid })),
        },
        notes: { create: { content: '', createdBy: userId } },
      },
      include: { participants: true },
    });

    for (const p of data.participantIds) {
      if (p !== userId) {
        await notificationsService.create({
          userId: p,
          type: 'MEETING',
          title: 'Meeting invitation',
          body: data.title,
          data: { meetingId: meeting.id },
        });
      }
    }
    return meeting;
  },

  async get(id: string, userId: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, displayName: true } },
        participants: { include: { user: { select: { id: true, displayName: true } } } },
        notes: true,
      },
    });
    if (!meeting) throw new Error('NOT_FOUND');
    const isParticipant = meeting.organizerId === userId || meeting.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new Error('FORBIDDEN');
    return meeting;
  },

  async rsvp(meetingId: string, userId: string, status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') {
    return prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: { rsvpStatus: status, respondedAt: new Date() },
    });
  },

  async saveNotes(meetingId: string, userId: string, content: string) {
    const meeting = await this.get(meetingId, userId);
    if (meeting.organizerId !== userId) throw new Error('FORBIDDEN');
    const notes = await prisma.meetingNote.upsert({
      where: { meetingId },
      create: { meetingId, content, createdBy: userId },
      update: { content },
    });
    await embeddingQueue.add('ingest', {
      sourceType: 'MEETING_NOTE',
      sourceId: meetingId,
      text: content,
      metadata: { meetingId, title: meeting.title },
    });
    return notes;
  },

  async markAttendance(meetingId: string, userId: string, attendance: { userId: string; attended: boolean }[]) {
    const meeting = await this.get(meetingId, userId);
    if (meeting.organizerId !== userId) throw new Error('FORBIDDEN');
    for (const a of attendance) {
      await prisma.meetingParticipant.update({
        where: { meetingId_userId: { meetingId, userId: a.userId } },
        data: { attended: a.attended },
      });
    }
  },
};
