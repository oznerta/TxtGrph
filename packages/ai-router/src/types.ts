import { z } from 'zod';

export const AIProviderSchema = z.enum(['anthropic', 'openai', 'gemini', 'custom']);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const BYOKConfigSchema = z.object({
  provider: AIProviderSchema,
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url('Invalid Base URL').optional().or(z.literal('')),
  model: z.string().optional(),
});
export type BYOKConfig = z.infer<typeof BYOKConfigSchema>;

export const GenerateDiagramOptionsSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  currentCode: z.string().optional(),
  diagramType: z.string().optional(),
});
export type GenerateDiagramOptions = z.infer<typeof GenerateDiagramOptionsSchema>;

export interface StreamChunk {
  type: 'token' | 'complete' | 'error';
  token?: string;
  fullText?: string;
  sanitizedCode?: string;
  error?: string;
}

export type StreamHandler = (chunk: StreamChunk) => void;
