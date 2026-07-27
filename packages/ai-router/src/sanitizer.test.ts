import { describe, it, expect } from 'vitest';
import { sanitizeMermaidOutput } from './sanitizer.js';

describe('sanitizeMermaidOutput', () => {
  it('strips markdown mermaid code blocks', () => {
    const raw = '```mermaid\nflowchart TD\n    A --> B\n```';
    expect(sanitizeMermaidOutput(raw)).toBe('flowchart TD\n    A --> B');
  });

  it('strips plain markdown code blocks', () => {
    const raw = '```\nsequenceDiagram\n    Alice->>Bob: Hello\n```';
    expect(sanitizeMermaidOutput(raw)).toBe('sequenceDiagram\n    Alice->>Bob: Hello');
  });

  it('strips preamble text prior to Mermaid keyword', () => {
    const raw = 'Here is your diagram:\n\nflowchart TD\n    Start --> End';
    expect(sanitizeMermaidOutput(raw)).toBe('flowchart TD\n    Start --> End');
  });

  it('strips script and style tags', () => {
    const raw = 'flowchart TD\n    A --> B<script>alert("hack")</script>';
    expect(sanitizeMermaidOutput(raw)).toBe('flowchart TD\n    A --> B');
  });
});
