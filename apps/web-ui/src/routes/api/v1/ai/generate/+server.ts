import { createSupabaseServerClient } from '$lib/supabase/server';
import { AIRouter, type BYOKConfig, type GenerateDiagramOptions } from '@txtgrph/ai-router';
import type { RequestHandler } from './$types';

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized user session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { config: BYOKConfig; options: GenerateDiagramOptions };
  try {
    body = await event.request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { config, options } = body;
  if (!config || !config.provider || !config.apiKey || !options || !options.prompt) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required parameters: config (provider, apiKey) and options (prompt)' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Create ReadableStream to stream SSE back to client
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendChunk = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller might be closed
        }
      };

      try {
        await AIRouter.streamGenerate(
          config,
          options,
          (chunk) => {
            sendChunk(chunk);
          }
        );
        sendChunk({ type: 'done' });
      } catch (err: any) {
        sendChunk({ type: 'error', error: err?.message || 'Generation failed on AI server endpoint' });
      } finally {
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
