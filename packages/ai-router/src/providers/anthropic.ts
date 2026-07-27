import type { BYOKConfig, GenerateDiagramOptions, StreamHandler } from '../types.js';
import { SYSTEM_PROMPT_CREATE, SYSTEM_PROMPT_REFINE } from '../prompts.js';
import { sanitizeMermaidOutput } from '../sanitizer.js';

export async function streamAnthropic(
  config: BYOKConfig,
  options: GenerateDiagramOptions,
  onChunk: StreamHandler,
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || 'claude-3-5-sonnet-latest';
  const baseUrl = config.baseUrl || 'https://api.anthropic.com';

  const systemPrompt = options.currentCode ? SYSTEM_PROMPT_REFINE : SYSTEM_PROMPT_CREATE;
  const userContent = options.currentCode
    ? `Current Diagram Code:\n\`\`\`\n${options.currentCode}\n\`\`\`\n\nInstructions:\n${options.prompt}`
    : options.prompt;

  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    const errorMsg = `Anthropic API Error (${response.status}): ${errorText}`;
    onChunk({ type: 'error', error: errorMsg });
    throw new Error(errorMsg);
  }

  if (!response.body) {
    throw new Error('Anthropic response body is null');
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
        if (json.type === 'content_block_delta' && json.delta?.text) {
          const token = json.delta.text;
          fullText += token;
          onChunk({ type: 'token', token, fullText });
        }
      } catch {
        // ignore parse errors for partial chunks
      }
    }
  }

  const sanitizedCode = sanitizeMermaidOutput(fullText);
  onChunk({ type: 'complete', fullText, sanitizedCode });
  return sanitizedCode;
}
