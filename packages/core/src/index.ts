import { z } from 'zod';

/**
 * Core Diagram metadata & schema definition
 */
export const DiagramSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  code: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Diagram = z.infer<typeof DiagramSchema>;

export const CoreVersion = '0.1.0';
