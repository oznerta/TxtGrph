import type { BYOKConfig, GenerateDiagramOptions, StreamHandler } from '../types.js';
import { SYSTEM_PROMPT_CREATE, SYSTEM_PROMPT_REFINE } from '../prompts.js';
import { sanitizeMermaidOutput } from '../sanitizer.js';

export async function streamGemini(
  config: BYOKConfig,
  options: GenerateDiagramOptions,
  onChunk: StreamHandler,
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || 'gemini-2.5-flash';
  const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');

  const systemPrompt = options.currentCode ? SYSTEM_PROMPT_REFINE : SYSTEM_PROMPT_CREATE;
  const userContent = options.currentCode
    ? `Current Diagram Code:\n\`\`\`\n${options.currentCode}\n\`\`\`\n\nInstructions:\n${options.prompt}`
    : options.prompt;

  const url = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    const errorMsg = `Gemini API Error (${response.status}): ${errorText}`;
    onChunk({ type: 'error', error: errorMsg });
    throw new Error(errorMsg);
  }

  if (!response.body) {
    throw new Error('Gemini response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const dataStr = trimmed.substring(5).trim();
      if (dataStr === '[DONE]') continue;

      try {
        const json = JSON.parse(dataStr);
        const token = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (token) {
          fullText += token;
          onChunk({ type: 'token', token, fullText });
        }
      } catch {
        // ignore partial JSON chunk
      }
    }
  }

  const sanitizedCode = sanitizeMermaidOutput(fullText);
  onChunk({ type: 'complete', fullText, sanitizedCode });
  return sanitizedCode;
}
