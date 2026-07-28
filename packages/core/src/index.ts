import { z } from 'zod';

/**
 * Core Folder Schema & Types
 */
export const FolderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Folder name cannot be empty').max(255),
  isDeleted: z.boolean().default(false),
  deletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Folder = z.infer<typeof FolderSchema>;

export const CreateFolderInputSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(255),
  parentId: z.string().uuid().nullable().optional(),
});

export type CreateFolderInput = z.infer<typeof CreateFolderInputSchema>;

/**
 * Core Diagram Schema & Types
 */
export const DiagramSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'Title cannot be empty').max(255),
  code: z.string(),
  config: z.record(z.unknown()).default({}),
  isShared: z.boolean().default(false),
  shareToken: z.string().uuid().nullable().optional(),
  shareUpdatedAt: z.string().datetime().nullable().optional(),
  isDeleted: z.boolean().default(false),
  deletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Diagram = z.infer<typeof DiagramSchema>;

export const CreateDiagramInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255).default('Untitled Diagram'),
  folderId: z.string().uuid().nullable().optional(),
  code: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export type CreateDiagramInput = z.infer<typeof CreateDiagramInputSchema>;

export const UpdateDiagramInputSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
  code: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  isShared: z.boolean().optional(),
  shareToken: z.string().uuid().nullable().optional(),
  shareUpdatedAt: z.string().datetime().nullable().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type UpdateDiagramInput = z.infer<typeof UpdateDiagramInputSchema>;

/**
 * Shared Diagram Payload Schema & Types
 */
export const SharedDiagramPayloadSchema = z.object({
  id: z.string().uuid(),
  shareToken: z.string().uuid(),
  title: z.string(),
  code: z.string(),
  config: z.record(z.unknown()).default({}),
  updatedAt: z.string().datetime(),
});

export type SharedDiagramPayload = z.infer<typeof SharedDiagramPayloadSchema>;

/**
 * Trash Item Type
 */
export type TrashItem =
  | { type: 'diagram'; data: Diagram }
  | { type: 'folder'; data: Folder; childCount: number };

export const CoreVersion = '0.3.0';

export * from './sanitizer.js';
