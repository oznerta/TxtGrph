import { describe, it, expect } from 'vitest';
import { DiagramSchema, FolderSchema, SharedDiagramPayloadSchema } from './index.js';

describe('packages/core schemas', () => {
  it('validates a correct Diagram model with share and trash fields', () => {
    const validDiagram = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      folderId: null,
      title: 'Architecture Overview',
      code: 'graph TD\n  A --> B',
      config: {},
      isShared: true,
      shareToken: '123e4567-e89b-12d3-a456-426614174002',
      shareUpdatedAt: '2026-07-30T00:00:00.000Z',
      isDeleted: false,
      deletedAt: null,
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-30T00:00:00.000Z'
    };

    const parsed = DiagramSchema.parse(validDiagram);
    expect(parsed.title).toBe('Architecture Overview');
    expect(parsed.isShared).toBe(true);
    expect(parsed.isDeleted).toBe(false);
  });

  it('validates Folder model with soft delete fields', () => {
    const validFolder = {
      id: '123e4567-e89b-12d3-a456-426614174010',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      parentId: null,
      name: 'System Diagrams',
      isDeleted: false,
      deletedAt: null,
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z'
    };

    const parsed = FolderSchema.parse(validFolder);
    expect(parsed.name).toBe('System Diagrams');
    expect(parsed.isDeleted).toBe(false);
  });

  it('validates SharedDiagramPayload model', () => {
    const validPayload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      shareToken: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Shared Public Flowchart',
      code: 'flowchart TD\n  Start --> End',
      config: {},
      updatedAt: '2026-07-30T00:00:00.000Z'
    };

    const parsed = SharedDiagramPayloadSchema.parse(validPayload);
    expect(parsed.title).toBe('Shared Public Flowchart');
    expect(parsed.shareToken).toBe('123e4567-e89b-12d3-a456-426614174002');
  });
});
