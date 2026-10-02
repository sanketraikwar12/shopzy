import { z } from 'zod';

export const assistantChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  conversationId: z.string().optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      area: z.string().max(100).optional(),
      city: z.string().max(100).optional(),
    })
    .optional(),
});

export const resetConversationSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
});
