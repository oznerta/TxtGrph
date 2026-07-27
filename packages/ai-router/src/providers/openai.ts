import type { BYOKConfig, GenerateDiagramOptions, StreamHandler } from '../types.js';
import { SYSTEM_PROMPT_CREATE, SYSTEM_PROMPT_REFINE } from '../prompts.js';
import { sanitizeMermaidOutput } from '../sanitizer.js';

export async function streamOpenAI(
  config: BYOKConfig,
  options: GenerateDiagramOptions,
  onChunk: StreamHandler,
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || 'gpt-4o';
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');

  const systemPrompt = options.currentCode ? SYSTEM_PROMPT_REFINE : SYSTEM_PROMPT_CREATE;
  const userContent = options.currentCode
    ? `Current Diagram Code:\n\`\`\`\n${options.currentCode}\n\`\`\`\n\nInstructions:\n${options.prompt}`
    : options.prompt;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    const errorMsg = `OpenAI API Error (${response.status}): ${errorText}`;
    onChunk({ type: 'error', error: errorMsg });
    throw new Error(errorMsg);
  }

  if (!response.body) {
    throw new Error('OpenAI response body is null');
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
        const token = json.choices?.[0]?.delta?.content;
        if (token) {
          fullText += token;
          onChunk({ type: 'token', token, fullText });
        }
      } catch {
        // ignore incomplete JSON chunk
      }
    }
  }

  const sanitizedCode = sanitizeMermaidOutput(fullText);
  onChunk({ type: 'complete', fullText, sanitizedCode });
  return sanitizedCode;
}
