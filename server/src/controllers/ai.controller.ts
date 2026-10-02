import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import * as aiService from '../services/ai.service';

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { message, conversationId, location } = req.body;
  const result = await aiService.processAssistantMessage({
    message,
    conversationId,
    location,
  });
  return ok(res, result);
});

export const reset = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.body;
  aiService.clearConversation(conversationId);
  return ok(res, { cleared: true, conversationId });
});

export const insights = asyncHandler(async (_req: Request, res: Response) => {
  const data = await aiService.getMarketplaceInsights();
  return ok(res, data);
});
