import { prisma } from '../../../config/database.js';
import { getLLMProvider } from '../providers/index.js';
import { conversationsService } from '../../conversations/conversations.service.js';
import { meetingsService } from '../../meetings/meetings.service.js';

export const summarizationService = {
  async summarizeConversation(userId: string, conversationId: string, messageLimit = 100) {
    await conversationsService.assertMember(conversationId, userId);

    const messages = await prisma.message.findMany({
      where: { conversationId, isDeleted: false, parentMessageId: null },
      include: { sender: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: messageLimit,
    });

    const transcript = messages
      .reverse()
      .map((m) => `${m.sender.displayName}: ${m.content ?? '[deleted]'}`)
      .join('\n');

    const provider = getLLMProvider();
    const prompt = `Summarize the key discussion points and decisions from this conversation.
Format as: Main Topics | Key Decisions | Action Items

Conversation:
${transcript}`;

    return provider.generate(prompt);
  },

  async summarizeMeeting(userId: string, meetingId: string) {
    const meeting = await meetingsService.get(meetingId, userId);
    const notes = meeting.notes?.content ?? '';

    const provider = getLLMProvider();
    const prompt = `Extract from these meeting notes:
1. Meeting purpose and attendees
2. Key discussion points (bullet points)
3. Decisions made
4. Action items with owners
5. Follow-up items

Meeting: ${meeting.title}
Notes:
${notes}`;

    return provider.generate(prompt);
  },
};
