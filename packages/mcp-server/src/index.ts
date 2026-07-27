import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { TOOL_DEFINITIONS, handleMcpToolCall } from './tools.js';

export { TOOL_DEFINITIONS, handleMcpToolCall };

export function createTxtGrphMcpServer(supabaseUrl: string, supabaseAnonKey: string, userId: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const server = new Server(
    {
      name: 'txtgrph-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await handleMcpToolCall(name, args, supabase, userId);
  });

  return server;
}

// Stdio CLI Entrypoint if invoked directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js')) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  const userId = process.env.TXTGRPH_USER_ID;

  if (!supabaseUrl || !supabaseAnonKey || !userId) {
    console.error(
      'Error: SUPABASE_URL, SUPABASE_ANON_KEY, and TXTGRPH_USER_ID environment variables are required to run txtgrph-mcp in stdio mode.'
    );
    process.exit(1);
  }

  const server = createTxtGrphMcpServer(supabaseUrl, supabaseAnonKey, userId);
  const transport = new StdioServerTransport();
  server.connect(transport).catch((err) => {
    console.error('MCP Stdio Server Error:', err);
    process.exit(1);
  });
}
