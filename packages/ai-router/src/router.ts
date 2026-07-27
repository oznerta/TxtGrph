import type { BYOKConfig, GenerateDiagramOptions, StreamHandler } from './types.js';
import { streamAnthropic } from './providers/anthropic.js';
import { streamOpenAI } from './providers/openai.js';
import { streamGemini } from './providers/gemini.js';

export class AIRouter {
  /**
   * Stream diagram generation from the configured BYOK provider.
   */
  static async streamGenerate(
    config: BYOKConfig,
    options: GenerateDiagramOptions,
    onChunk: StreamHandler,
    signal?: AbortSignal
  ): Promise<string> {
    switch (config.provider) {
      case 'anthropic':
        return streamAnthropic(config, options, onChunk, signal);

      case 'openai':
      case 'custom':
        return streamOpenAI(config, options, onChunk, signal);

      case 'gemini':
        return streamGemini(config, options, onChunk, signal);

      default:
        throw new Error(`Unsupported AI provider: ${(config as any).provider}`);
    }
  }

  /**
   * Test connection to provider API with given key and options.
   */
  static async testConnection(config: BYOKConfig): Promise<{ success: boolean; message: string }> {
    try {
      let result = '';
      await this.streamGenerate(
        config,
        { prompt: 'Generate a flowchart with 2 nodes: A[Start] --> B[End]' },
        (chunk) => {
          if (chunk.type === 'complete' && chunk.sanitizedCode) {
            result = chunk.sanitizedCode;
          }
        }
      );

      if (result && result.length > 0) {
        return { success: true, message: 'Connection successful' };
      }
      return { success: true, message: 'Connected to API successfully' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed' };
    }
  }
}
