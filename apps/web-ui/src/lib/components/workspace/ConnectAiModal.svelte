<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Sparkles,
    Copy,
    Check,
    ExternalLink,
    X,
    Cpu,
    Server,
    Globe,
    Terminal,
    Bot,
    MessageSquare,
    Zap,
    Loader2
  } from 'lucide-svelte';

  interface Props {
    isOpen?: boolean;
  }

  let { isOpen = $bindable(false) }: Props = $props();

  let activeTab = $state<'chatgpt' | 'claude' | 'gemini' | 'cursor'>('chatgpt');
  let userToken = $state<string>('');
  let isLoadingToken = $state(false);
  let baseUrl = $state('http://localhost:5173');
  let copiedField = $state<string | null>(null);

  onMount(async () => {
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
    }
  });

  $effect(() => {
    if (isOpen && !userToken) {
      loadOrCreateToken();
    }
  });

  async function loadOrCreateToken() {
    try {
      isLoadingToken = true;
      const res = await fetch('/api/v1/tokens');
      const payload = await res.json();

      if (res.ok && payload.success && payload.data?.length > 0) {
        // Use existing token prefix or fetch raw if available
        userToken = payload.data[0].token_prefix + '...';
      } else {
        // Create default token
        const createRes = await fetch('/api/v1/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'AI Chat MCP Key' }),
        });
        const createPayload = await createRes.json();
        if (createRes.ok && createPayload.success) {
          userToken = createPayload.data.rawToken;
        }
      }
    } catch (err) {
      console.error('Failed to load MCP token for modal:', err);
    } finally {
      isLoadingToken = false;
    }
  }

  function handleCopy(text: string, fieldId: string) {
    navigator.clipboard.writeText(text);
    copiedField = fieldId;
    setTimeout(() => {
      copiedField = null;
    }, 2000);
  }

  const tokenDisplay = $derived(userToken || 'txtgrph_mcp_YOUR_API_KEY');

  // Prompts for Chat Platforms
  const chatGptOpenApiUrl = $derived(`${baseUrl}/api/v1/openapi.json`);
  const chatGptPrompt = $derived(`Connect TxtGrph MCP Action to create and edit Mermaid diagrams.
OpenAPI Action Spec URL: ${chatGptOpenApiUrl}
Authorization: Bearer ${tokenDisplay}

System Instruction: When I ask to create or update diagrams, use the TxtGrph MCP tools to store and render them directly in my TxtGrph workspace.`);

  const claudeDesktopConfig = $derived(`{
  "mcpServers": {
    "txtgrph": {
      "command": "npx",
      "args": ["-y", "@txtgrph/mcp-server"],
      "env": {
        "TXTGRPH_API_KEY": "${tokenDisplay}",
        "TXTGRPH_BASE_URL": "${baseUrl}"
      }
    }
  }
}`);

  const claudeChatPrompt = $derived(`You are integrated with TxtGrph MCP Server.
Endpoint: ${baseUrl}/api/v1/mcp
Authorization: Bearer ${tokenDisplay}

Please use TxtGrph tools (list_diagrams, create_diagram, update_diagram, render_mermaid_svg) whenever I ask you to design system architectures, flowcharts, or sequence diagrams.`);

  const geminiEndpointUrl = $derived(`${baseUrl}/api/v1/mcp`);
  const geminiChatPrompt = $derived(`You are connected to TxtGrph MCP (Model Context Protocol).
Server Endpoint: ${geminiEndpointUrl}
Authorization: Bearer ${tokenDisplay}

Use TxtGrph MCP tools to list, create, edit, and validate Mermaid syntax diagrams in my TxtGrph workspace.`);

  const cursorConfig = $derived(`{
  "mcpServers": {
    "txtgrph": {
      "url": "${baseUrl}/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer ${tokenDisplay}"
      }
    }
  }
}`);

  function close() {
    isOpen = false;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
    <div class="bg-[#0C0E14] border border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl font-['Instrument_Sans',sans-serif] text-white">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Zap size={20} />
          </div>
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <span>Connect AI Chat Assistants</span>
              <span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-400 text-black font-['IBM_Plex_Mono',monospace]">MCP Live</span>
            </h3>
            <p class="text-xs text-white/50">
              Direct 1-click connectors & prompts for ChatGPT, Claude, Gemini, and Cursor.
            </p>
          </div>
        </div>
        <button onclick={close} class="text-white/40 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer hover:bg-white/5">
          <X size={18} />
        </button>
      </div>

      <!-- Platform Selection Tabs -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-['IBM_Plex_Mono',monospace]">
        <button
          onclick={() => (activeTab = 'chatgpt')}
          class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 {activeTab === 'chatgpt' ? 'bg-amber-500/15 border-amber-400 text-white shadow-md' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}"
        >
          <div class="flex items-center justify-between">
            <Bot size={18} class={activeTab === 'chatgpt' ? 'text-amber-400' : 'text-white/40'} />
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">GPT Action</span>
          </div>
          <span class="text-xs font-bold">ChatGPT</span>
        </button>

        <button
          onclick={() => (activeTab = 'claude')}
          class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 {activeTab === 'claude' ? 'bg-amber-500/15 border-amber-400 text-white shadow-md' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}"
        >
          <div class="flex items-center justify-between">
            <Sparkles size={18} class={activeTab === 'claude' ? 'text-amber-400' : 'text-white/40'} />
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">Desktop / Web</span>
          </div>
          <span class="text-xs font-bold">Claude</span>
        </button>

        <button
          onclick={() => (activeTab = 'gemini')}
          class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 {activeTab === 'gemini' ? 'bg-amber-500/15 border-amber-400 text-white shadow-md' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}"
        >
          <div class="flex items-center justify-between">
            <Globe size={18} class={activeTab === 'gemini' ? 'text-amber-400' : 'text-white/40'} />
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Gemini AI</span>
          </div>
          <span class="text-xs font-bold">Gemini</span>
        </button>

        <button
          onclick={() => (activeTab = 'cursor')}
          class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 {activeTab === 'cursor' ? 'bg-amber-500/15 border-amber-400 text-white shadow-md' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}"
        >
          <div class="flex items-center justify-between">
            <Terminal size={18} class={activeTab === 'cursor' ? 'text-amber-400' : 'text-white/40'} />
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">IDE Extension</span>
          </div>
          <span class="text-xs font-bold">Cursor / VS Code</span>
        </button>
      </div>

      <!-- Tab Content & Launch Actions -->
      <div class="space-y-4">
        {#if activeTab === 'chatgpt'}
          <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400 font-['IBM_Plex_Mono',monospace]">ChatGPT Custom GPT / Action Connector</span>
              <a
                href="https://chatgpt.com/gpts"
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>Launch ChatGPT</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <p class="text-xs text-white/70 leading-relaxed">
              Import TxtGrph's live OpenAPI spec into ChatGPT to enable direct diagram creation & editing from your ChatGPT conversations.
            </p>

            <div class="space-y-2 pt-1 font-['IBM_Plex_Mono',monospace]">
              <div class="flex items-center justify-between text-[11px] text-white/50">
                <span>1. OpenAPI Spec URL:</span>
                <button
                  onclick={() => handleCopy(chatGptOpenApiUrl, 'chatgpt_openapi')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'chatgpt_openapi'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy Spec URL</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto select-all">{chatGptOpenApiUrl}</pre>

              <div class="flex items-center justify-between text-[11px] text-white/50 pt-2">
                <span>2. AI Prompt to Paste in Chat:</span>
                <button
                  onclick={() => handleCopy(chatGptPrompt, 'chatgpt_prompt')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'chatgpt_prompt'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy Prompt</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto whitespace-pre-wrap select-all">{chatGptPrompt}</pre>
            </div>
          </div>

        {:else if activeTab === 'claude'}
          <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400 font-['IBM_Plex_Mono',monospace]">Claude Desktop & Claude.ai Integration</span>
              <a
                href="https://claude.ai"
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>Launch Claude.ai</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div class="space-y-2 font-['IBM_Plex_Mono',monospace]">
              <div class="flex items-center justify-between text-[11px] text-white/50">
                <span>1. Claude Desktop Config (claude_desktop_config.json):</span>
                <button
                  onclick={() => handleCopy(claudeDesktopConfig, 'claude_config')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'claude_config'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied Config!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy JSON</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto select-all">{claudeDesktopConfig}</pre>

              <div class="flex items-center justify-between text-[11px] text-white/50 pt-2">
                <span>2. Claude Web Chat Prompt:</span>
                <button
                  onclick={() => handleCopy(claudeChatPrompt, 'claude_prompt')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'claude_prompt'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy Chat Prompt</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto whitespace-pre-wrap select-all">{claudeChatPrompt}</pre>
            </div>
          </div>

        {:else if activeTab === 'gemini'}
          <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400 font-['IBM_Plex_Mono',monospace]">Gemini AI & Google Agent Connector</span>
              <a
                href="https://gemini.google.com"
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>Launch Gemini AI</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div class="space-y-2 font-['IBM_Plex_Mono',monospace]">
              <div class="flex items-center justify-between text-[11px] text-white/50">
                <span>1. Gemini MCP Endpoint:</span>
                <button
                  onclick={() => handleCopy(geminiEndpointUrl, 'gemini_endpoint')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'gemini_endpoint'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy Endpoint</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto select-all">{geminiEndpointUrl}</pre>

              <div class="flex items-center justify-between text-[11px] text-white/50 pt-2">
                <span>2. Gemini Chat Prompt:</span>
                <button
                  onclick={() => handleCopy(geminiChatPrompt, 'gemini_prompt')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'gemini_prompt'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy Chat Prompt</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto whitespace-pre-wrap select-all">{geminiChatPrompt}</pre>
            </div>
          </div>

        {:else if activeTab === 'cursor'}
          <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3 font-['IBM_Plex_Mono',monospace]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400">Cursor / VS Code MCP Config</span>
              <button
                onclick={() => handleCopy(cursorConfig, 'cursor_config')}
                class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                {#if copiedField === 'cursor_config'}
                  <Check size={13} /> <span>Copied Config!</span>
                {:else}
                  <Copy size={13} /> <span>Copy mcp.json</span>
                {/if}
              </button>
            </div>
            <pre class="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto select-all">{cursorConfig}</pre>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-3 border-t border-white/10 font-['IBM_Plex_Mono',monospace]">
        <div class="text-[11px] text-white/50 flex items-center gap-1.5">
          <Server size={13} class="text-amber-400" />
          <span>Active Token: <strong class="text-amber-300">{tokenDisplay}</strong></span>
        </div>
        <button
          onclick={close}
          class="px-5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
