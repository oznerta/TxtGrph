import { describe, it, expect, vi } from 'vitest';
import { TOOL_DEFINITIONS, handleMcpToolCall } from './tools.js';

describe('MCP Server Tool Definitions & Execution', () => {
  it('defines 7 core MCP tools with valid schemas', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(7);
    const toolNames = TOOL_DEFINITIONS.map((t) => t.name);
    expect(toolNames).toContain('list_diagrams');
    expect(toolNames).toContain('get_diagram');
    expect(toolNames).toContain('create_diagram');
    expect(toolNames).toContain('update_diagram');
    expect(toolNames).toContain('delete_diagram');
    expect(toolNames).toContain('list_folders');
    expect(toolNames).toContain('render_mermaid_svg');
  });

  it('handles render_mermaid_svg tool call', async () => {
    const mockSupabase = { from: vi.fn() };
    const result = await handleMcpToolCall(
      'render_mermaid_svg',
      { code: 'flowchart TD\n  A --> B' },
      mockSupabase,
      'test-user-id'
    );

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
    expect(parsed.sanitizedCode).toContain('flowchart TD');
  });

  it('handles list_diagrams tool call', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq1 = vi.fn().mockReturnThis();
    const mockEq2 = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ id: 'd-1', title: 'Test Diagram', folder_id: null }],
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq1,
        order: mockOrder,
        limit: mockLimit,
      }),
    };

    const result = await handleMcpToolCall('list_diagrams', { limit: 10 }, mockSupabase, 'user-123');

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Test Diagram');
  });

  it('handles error for unknown tool call', async () => {
    const mockSupabase = { from: vi.fn() };
    const result = await handleMcpToolCall('non_existent_tool', {}, mockSupabase, 'user-123');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool name');
  });
});
