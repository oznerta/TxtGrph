/**
 * Sanitizes raw LLM text output into clean, safe Mermaid diagram syntax.
 */
export function sanitizeMermaidOutput(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText.trim();

  // 1. Strip markdown code fence blocks if present (```mermaid ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:mermaid)?[\r\n]+/i, '');
  cleaned = cleaned.replace(/[\r\n]+```$/i, '');
  cleaned = cleaned.replace(/```(?:mermaid)?([\s\S]*?)```/gi, '$1');

  // 2. Remove any preamble text before the first recognized Mermaid diagram keyword
  const mermaidKeywords = [
    'flowchart',
    'graph',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram-v2',
    'stateDiagram',
    'erDiagram',
    'gantt',
    'pie',
    'gitGraph',
    'architecture',
    'mindmap',
    'timeline',
    'zenuml',
    'C4Context',
  ];

  const firstKeywordIndex = Math.min(
    ...mermaidKeywords
      .map((kw) => {
        const idx = cleaned.toLowerCase().indexOf(kw.toLowerCase());
        return idx === -1 ? Infinity : idx;
      })
  );

  if (firstKeywordIndex > 0 && firstKeywordIndex !== Infinity) {
    cleaned = cleaned.substring(firstKeywordIndex);
  }

  // 3. Scrub dangerous HTML injection surface
  cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');

  return cleaned.trim();
}
