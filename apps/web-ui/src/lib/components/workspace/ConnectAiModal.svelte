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
    Loader2,
    KeyRound,
    AlertCircle
  } from 'lucide-svelte';

  interface Props {
    isOpen?: boolean;
  }

  let { isOpen = $bindable(false) }: Props = $props();

  let activeTab = $state<'chatgpt' | 'claude' | 'gemini' | 'cursor'>('gemini');
  let fullRawToken = $state<string>('');
  let isGeneratingToken = $state(false);
  let baseUrl = $state('http://localhost:5173');
  let copiedField = $state<string | null>(null);

  onMount(async () => {
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
    }
  });

  $effect(() => {
    if (isOpen && !fullRawToken) {
      generateFreshToken();
    }
  });

  async function generateFreshToken() {
    try {
      isGeneratingToken = true;
      const res = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'AI Platform Key' }),
      });
      const payload = await res.json();
      if (res.ok && payload.success) {
        fullRawToken = payload.data.rawToken;
      }
    } catch (err) {
      console.error('Failed to generate MCP token:', err);
    } finally {
      isGeneratingToken = false;
    }
  }

  function handleCopy(text: string, fieldId: string) {
    navigator.clipboard.writeText(text);
    copiedField = fieldId;
    setTimeout(() => {
      copiedField = null;
    }, 2000);
  }

  const tokenDisplay = $derived(fullRawToken || 'txtgrph_mcp_YOUR_FULL_UNTRUNCATED_SECRET_KEY');

  // Prompts & Configs with Full Un-truncated Tokens
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

  const geminiEndpointUrl = $derived(`${baseUrl}/api/v1/mcp`);

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
              Direct 1-click connectors & setup parameters for Gemini, ChatGPT, Claude, and Cursor.
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
          onclick={() => (activeTab = 'gemini')}
          class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 {activeTab === 'gemini' ? 'bg-amber-500/15 border-amber-400 text-white shadow-md' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}"
        >
          <div class="flex items-center justify-between">
            <Globe size={18} class={activeTab === 'gemini' ? 'text-amber-400' : 'text-white/40'} />
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Gemini Spark</span>
          </div>
          <span class="text-xs font-bold">Gemini</span>
        </button>

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
        {#if activeTab === 'gemini'}
          <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3 font-['IBM_Plex_Mono',monospace]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400">Gemini Spark Custom Connected App Setup</span>
              <a
                href="https://gemini.google.com/spark/apps"
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>Launch Gemini Spark Apps</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <p class="text-[11px] text-white/70 leading-relaxed font-['Instrument_Sans',sans-serif]">
              In Gemini Spark → <strong>Connected Apps</strong> → <strong>Set up a custom connected app</strong>, fill in the following parameters:
            </p>

            <div class="space-y-2.5">
              <!-- Field 1: Custom App Link -->
              <div class="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div class="flex items-center justify-between text-[11px] text-white/60">
                  <span>1. Add a custom app link:</span>
                  <button
                    onclick={() => handleCopy(geminiEndpointUrl, 'gemini_link')}
                    class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    {#if copiedField === 'gemini_link'}
                      <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                    {:else}
                      <Copy size={12} /> <span>Copy Link</span>
                    {/if}
                  </button>
                </div>
                <div class="text-[12px] text-amber-300 font-bold select-all break-all">{geminiEndpointUrl}</div>
              </div>

              <!-- Field 2: Client ID -->
              <div class="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div class="flex items-center justify-between text-[11px] text-white/60">
                  <span>2. Advanced Settings → Client ID:</span>
                  <button
                    onclick={() => handleCopy('txtgrph', 'gemini_client_id')}
                    class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    {#if copiedField === 'gemini_client_id'}
                      <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                    {:else}
                      <Copy size={12} /> <span>Copy Client ID</span>
                    {/if}
                  </button>
                </div>
                <div class="text-[12px] text-amber-300 font-bold select-all">txtgrph</div>
              </div>

              <!-- Field 3: Client Secret (Un-truncated Key) -->
              <div class="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div class="flex items-center justify-between text-[11px] text-white/60">
                  <span>3. Advanced Settings → Client Secret (Full Secret Key):</span>
                  <button
                    onclick={() => handleCopy(tokenDisplay, 'gemini_secret')}
                    class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    {#if copiedField === 'gemini_secret'}
                      <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied Full Key!</span>
                    {:else}
                      <Copy size={12} /> <span>Copy Secret Key</span>
                    {/if}
                  </button>
                </div>
                <div class="text-[11px] text-emerald-400 font-mono select-all break-all">{tokenDisplay}</div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'chatgpt'}
          <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3 font-['IBM_Plex_Mono',monospace]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400">ChatGPT Custom GPT / Action Connector</span>
              <a
                href="https://chatgpt.com/gpts"
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>Launch ChatGPT</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div class="space-y-2">
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

              <div class="flex items-center justify-between text-[11px] text-white/50 pt-1">
                <span>2. Full Un-truncated Bearer Key:</span>
                <button
                  onclick={() => handleCopy(tokenDisplay, 'chatgpt_key')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'chatgpt_key'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy Bearer Key</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-emerald-400 overflow-x-auto select-all break-all">{tokenDisplay}</pre>
            </div>
          </div>

        {:else if activeTab === 'claude'}
          <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3 font-['IBM_Plex_Mono',monospace]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400">Claude Desktop & Claude.ai Integration</span>
              <a
                href="https://claude.ai"
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>Launch Claude.ai</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-[11px] text-white/50">
                <span>Claude Desktop Config (claude_desktop_config.json):</span>
                <button
                  onclick={() => handleCopy(claudeDesktopConfig, 'claude_config')}
                  class="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {#if copiedField === 'claude_config'}
                    <Check size={12} class="text-emerald-400" /> <span class="text-emerald-400">Copied JSON!</span>
                  {:else}
                    <Copy size={12} /> <span>Copy JSON</span>
                  {/if}
                </button>
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] text-amber-300 overflow-x-auto select-all">{claudeDesktopConfig}</pre>
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
                  <Check size={13} /> <span>Copied mcp.json!</span>
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
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10 font-['IBM_Plex_Mono',monospace]">
        <div class="flex items-center gap-2">
          <button
            onclick={generateFreshToken}
            disabled={isGeneratingToken}
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {#if isGeneratingToken}
              <Loader2 size={13} class="animate-spin" /> <span>Generating Fresh Key...</span>
            {:else}
              <KeyRound size={13} /> <span>⚡ Generate Fresh Key</span>
            {/if}
          </button>
        </div>

        <button
          onclick={close}
          class="px-5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
