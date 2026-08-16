<script lang="ts">
  import { onMount } from 'svelte';
  import {
    KeyRound,
    Plus,
    Trash2,
    Copy,
    Check,
    Loader2,
    Server,
    Terminal,
    Code2,
    ShieldCheck,
    X,
    Sparkles,
    Globe,
    Cpu,
    ExternalLink,
    Info,
    CheckCircle2,
    FolderPlus,
    Zap,
    ArrowRight
  } from 'lucide-svelte';

  interface McpTokenRecord {
    id: string;
    name: string;
    token_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    expires_at: string | null;
    created_at: string;
  }

  let tokens = $state<McpTokenRecord[]>([]);
  let isLoading = $state(true);
  let errorMsg = $state('');

  // Host Base URL
  let baseUrl = $state('http://localhost:5173');

  // Modal State
  let isCreateModalOpen = $state(false);
  let newTokenName = $state('');
  let isCreating = $state(false);
  let createdRawToken = $state<string | null>(null);
  let isCopied = $state(false);

  // Platform Guide Snippet Tab State
  let activeGuideTab = $state<'claude' | 'cursor' | 'chatgpt' | 'gemini'>('claude');
  let isSnippetCopied = $state(false);

  async function fetchTokens() {
    try {
      isLoading = true;
      errorMsg = '';
      const res = await fetch('/api/v1/tokens');
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error?.message || 'Failed to load tokens');
      }
      tokens = payload.data || [];
    } catch (err: any) {
      errorMsg = err.message || 'Failed to load access tokens';
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
    }
    fetchTokens();
  });

  function openCreateModal() {
    newTokenName = 'MCP AI Token';
    createdRawToken = null;
    isCopied = false;
    isCreateModalOpen = true;
  }

  function closeCreateModal() {
    isCreateModalOpen = false;
    createdRawToken = null;
    fetchTokens();
  }

  async function handleCreateToken() {
    if (!newTokenName.trim()) return;

    try {
      isCreating = true;
      const res = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error?.message || 'Failed to create token');
      }

      createdRawToken = payload.data.rawToken;
    } catch (err: any) {
      alert(`Token Creation Error: ${err.message}`);
    } finally {
      isCreating = false;
    }
  }

  async function handleRevokeToken(id: string, name: string) {
    if (!confirm(`Are you sure you want to revoke the access token "${name}"? Any MCP servers using this key will immediately lose access.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/tokens?id=${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error?.message || 'Failed to revoke token');
      }

      tokens = tokens.filter((t) => t.id !== id);
    } catch (err: any) {
      alert(`Revoke Error: ${err.message}`);
    }
  }

  function copyTokenToClipboard() {
    if (!createdRawToken) return;
    navigator.clipboard.writeText(createdRawToken);
    isCopied = true;
    setTimeout(() => {
      isCopied = false;
    }, 2000);
  }

  let isQuickGenerating = $state(false);

  async function quickGenerateAndCopy() {
    try {
      isQuickGenerating = true;
      if (!createdRawToken) {
        const res = await fetch('/api/v1/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `${activeGuideTab.toUpperCase()} Integration Key` }),
        });
        const payload = await res.json();
        if (res.ok && payload.success && payload.data?.rawToken) {
          createdRawToken = payload.data.rawToken;
          await fetchTokens();
        }
      }
      setTimeout(() => {
        copySnippet();
      }, 50);
    } catch (err) {
      console.error('Quick generation error:', err);
    } finally {
      isQuickGenerating = false;
    }
  }

  const activeTokenDisplay = $derived(
    createdRawToken || (tokens.length > 0 ? `${tokens[0].token_prefix}...` : 'txtgrph_mcp_YOUR_API_KEY')
  );

  let claudeSnippet = $derived(`{
  "mcpServers": {
    "txtgrph": {
      "command": "npx",
      "args": ["-y", "@txtgrph/mcp-server"],
      "env": {
        "TXTGRPH_API_KEY": "${activeTokenDisplay}",
        "TXTGRPH_BASE_URL": "${baseUrl}"
      }
    }
  }
}`);

  let cursorSnippet = $derived(`{
  "mcpServers": {
    "txtgrph": {
      "url": "${baseUrl}/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer ${activeTokenDisplay}"
      }
    }
  }
}`);

  let chatGptSnippet = $derived(`OpenAPI Spec URL: ${baseUrl}/api/v1/openapi.json
Authentication Type: Bearer Token
Authorization Header: Bearer ${activeTokenDisplay}

Supported Actions:
- list_diagrams (List your diagrams & code)
- create_diagram (Generate new Mermaid diagram in a folder)
- update_diagram (Update existing diagram)
- list_folders / create_folder (Manage workspace structure)
- render_mermaid_svg (Validate & sanitize syntax)`);

  let geminiSnippet = $derived(`{
  "mcpServers": {
    "txtgrph": {
      "url": "${baseUrl}/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer ${activeTokenDisplay}"
      }
    }
  }
}`);

  function getCurrentSnippet() {
    switch (activeGuideTab) {
      case 'claude': return claudeSnippet;
      case 'cursor': return cursorSnippet;
      case 'chatgpt': return chatGptSnippet;
      case 'gemini': return geminiSnippet;
    }
  }

  function copySnippet() {
    navigator.clipboard.writeText(getCurrentSnippet());
    isSnippetCopied = true;
    setTimeout(() => {
      isSnippetCopied = false;
    }, 2500);
  }

  function formatDate(isoStr: string | null) {
    if (!isoStr) return 'Never';
    return new Date(isoStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
</script>

<div class="space-y-6 w-full font-['Instrument_Sans',sans-serif]">
  <!-- Tokens List Card -->
  <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-5 shadow-xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <KeyRound size={16} class="text-amber-400" />
          <span>Personal Access Tokens (MCP Keys)</span>
        </h3>
        <p class="text-xs text-white/50 mt-0.5">
          Generate API keys to connect Google Gemini, Claude Desktop, ChatGPT, Cursor, or AI coding assistants to TxtGrph.
        </p>
      </div>
      <button
        onclick={openCreateModal}
        class="px-4 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
      >
        <Plus size={14} />
        <span>Generate New Key</span>
      </button>
    </div>

    {#if isLoading}
      <div class="py-8 text-center text-xs text-amber-400/80 font-['IBM_Plex_Mono',monospace] flex items-center justify-center gap-2">
        <Loader2 size={16} class="animate-spin text-amber-400" />
        <span>Loading access tokens...</span>
      </div>
    {:else if errorMsg}
      <div class="p-4 text-xs rounded-2xl bg-red-500/10 text-red-300 border border-red-500/30">
        {errorMsg}
      </div>
    {:else if tokens.length === 0}
      <div class="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-2 bg-white/[0.01]">
        <div class="text-xs font-bold text-white">No Access Tokens Created</div>
        <p class="text-xs text-white/40 max-w-sm mx-auto">
          Create an API key to enable AI agents (Gemini, Claude, ChatGPT, Cursor) to view and create diagrams directly in your account.
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto border border-white/10 rounded-2xl bg-[#07080C]">
        <table class="w-full text-left text-xs font-['IBM_Plex_Mono',monospace]">
          <thead class="bg-white/[0.04] text-white/60 border-b border-white/10 font-bold">
            <tr>
              <th class="py-3 px-4">Key Description</th>
              <th class="py-3 px-4">Prefix</th>
              <th class="py-3 px-4">Created</th>
              <th class="py-3 px-4">Last Active</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            {#each tokens as token}
              <tr class="hover:bg-white/[0.02] transition-colors">
                <td class="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={14} class="text-amber-400 shrink-0" />
                  <span>{token.name}</span>
                </td>
                <td class="py-3 px-4 text-amber-400">{token.token_prefix}...</td>
                <td class="py-3 px-4 text-white/50">{formatDate(token.created_at)}</td>
                <td class="py-3 px-4 text-white/50">{formatDate(token.last_used_at)}</td>
                <td class="py-3 px-4 text-right">
                  <button
                    onclick={() => handleRevokeToken(token.id, token.name)}
                    class="text-xs text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                  >
                    Revoke Key
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Multi-Platform MCP Setup Guide -->
  <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-5 shadow-xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <Cpu size={18} class="text-amber-400 shrink-0" />
        <div>
          <h4 class="text-xs font-bold text-white uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">MCP & AI Platform Integration Setup</h4>
          <p class="text-[11px] text-white/50">Production-ready configurations for your favorite AI tools.</p>
        </div>
      </div>

      <!-- Platform Selector Tabs -->
      <div class="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 font-['IBM_Plex_Mono',monospace] overflow-x-auto">
        <button
          onclick={() => (activeGuideTab = 'gemini')}
          class="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 {activeGuideTab === 'gemini' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          Google Gemini / Agents
        </button>
        <button
          onclick={() => (activeGuideTab = 'claude')}
          class="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 {activeGuideTab === 'claude' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          Claude Desktop
        </button>
        <button
          onclick={() => (activeGuideTab = 'cursor')}
          class="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 {activeGuideTab === 'cursor' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          Cursor / VS Code
        </button>
        <button
          onclick={() => (activeGuideTab = 'chatgpt')}
          class="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 {activeGuideTab === 'chatgpt' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          ChatGPT GPTs
        </button>
      </div>
    </div>

    <!-- Code Snippet Container -->
    <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-white/60 font-['IBM_Plex_Mono',monospace]">
        <div class="flex items-center gap-2">
          <Terminal size={14} class="text-amber-400" />
          <span>
            {#if activeGuideTab === 'claude'}
              Config File: <code class="text-amber-300">claude_desktop_config.json</code>
            {:else if activeGuideTab === 'cursor'}
              Config File: <code class="text-amber-300">.cursor/mcp.json</code> or Settings
            {:else if activeGuideTab === 'chatgpt'}
              OpenAPI Action Config (<a href={`${baseUrl}/api/v1/openapi.json`} target="_blank" class="text-amber-400 underline inline-flex items-center gap-0.5">Open Spec <ExternalLink size={10} /></a>)
            {:else}
              Config File: <code class="text-amber-300">mcp.json</code> or Antigravity / Gemini CLI Config
            {/if}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick={quickGenerateAndCopy}
            disabled={isQuickGenerating}
            class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            title="Generate a fresh token and copy the complete configuration to clipboard"
          >
            {#if isQuickGenerating}
              <Loader2 size={13} class="animate-spin text-black" />
              <span>Generating...</span>
            {:else if isSnippetCopied}
              <Check size={13} class="text-black stroke-[3]" />
              <span>Ready & Copied!</span>
            {:else}
              <Zap size={13} class="text-black fill-black" />
              <span>Auto-Generate & Copy</span>
            {/if}
          </button>

          <button
            onclick={copySnippet}
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {#if isSnippetCopied}
              <Check size={13} class="text-emerald-400" />
              <span class="text-emerald-400">Copied!</span>
            {:else}
              <Copy size={13} />
              <span>Copy Config</span>
            {/if}
          </button>
        </div>
      </div>

      <pre class="text-[12px] leading-[22px] font-['IBM_Plex_Mono',monospace] text-amber-300 whitespace-pre font-mono p-4 rounded-xl bg-black/60 border border-white/5 select-all overflow-x-auto">{getCurrentSnippet()}</pre>
    </div>

    <!-- Instructions Banner -->
    <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-white/70 leading-relaxed space-y-1 font-['Instrument_Sans',sans-serif]">
      {#if activeGuideTab === 'claude'}
        <p><strong class="text-white">How to connect Claude Desktop:</strong> Open Claude Settings → Developer → Edit Config. Paste the JSON snippet above into your <code class="text-amber-300 font-mono">claude_desktop_config.json</code> file and restart Claude.</p>
      {:else if activeGuideTab === 'cursor'}
        <p><strong class="text-white">How to connect Cursor / VS Code / Windsurf:</strong> Add the MCP server configuration into your project's <code class="text-amber-300 font-mono">.cursor/mcp.json</code> or global Cursor MCP settings.</p>
      {:else if activeGuideTab === 'chatgpt'}
        <p><strong class="text-white">How to connect ChatGPT Custom GPTs:</strong> In ChatGPT GPT Builder → Actions → Import from URL, paste <code class="text-amber-300 font-mono">{baseUrl}/api/v1/openapi.json</code>. Set Authentication to Bearer API Token with your TxtGrph key.</p>
      {:else}
        <p><strong class="text-white">How to connect Gemini, Antigravity & AI Frameworks:</strong> Add the MCP server configuration to your Gemini CLI / Antigravity settings. You can also point your Python/Node agent to <code class="text-amber-300 font-mono">{baseUrl}/api/v1/mcp</code> using HTTP Bearer authorization headers.</p>
      {/if}
    </div>
  </div>

  <!-- How to Prompt Your AI (Folder & Diagram Creation Examples) -->
  <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-4 shadow-xl">
    <div class="flex items-center gap-2.5">
      <Sparkles size={18} class="text-amber-400 shrink-0" />
      <div>
        <h4 class="text-xs font-bold text-white uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
          How to Prompt Your AI (Example Workflows)
        </h4>
        <p class="text-[11px] text-white/50">
          Once connected, you can tell Gemini, Claude, or ChatGPT to organize and generate diagrams using natural language.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
      <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-2 hover:border-amber-400/30 transition-colors">
        <div class="flex items-center gap-2 text-xs font-bold text-amber-400">
          <FolderPlus size={14} />
          <span>Create Inside Folder</span>
        </div>
        <p class="text-xs text-white/80 leading-relaxed font-['IBM_Plex_Mono',monospace] bg-black/40 p-2.5 rounded-xl border border-white/5">
          "Create a folder named <strong>Payment Flow</strong> and generate a sequence diagram of Stripe checkout inside it."
        </p>
        <span class="text-[10px] text-white/40 block">Creates the folder automatically if it doesn't exist and adds the diagram into it.</span>
      </div>

      <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-2 hover:border-amber-400/30 transition-colors">
        <div class="flex items-center gap-2 text-xs font-bold text-amber-400">
          <Code2 size={14} />
          <span>Update Diagram</span>
        </div>
        <p class="text-xs text-white/80 leading-relaxed font-['IBM_Plex_Mono',monospace] bg-black/40 p-2.5 rounded-xl border border-white/5">
          "Find my diagram <strong>User Auth</strong> and add a 2FA email verification step to it."
        </p>
        <span class="text-[10px] text-white/40 block">Reads your existing diagram code, updates the Mermaid syntax, and saves it.</span>
      </div>

      <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-2 hover:border-amber-400/30 transition-colors">
        <div class="flex items-center gap-2 text-xs font-bold text-amber-400">
          <Terminal size={14} />
          <span>Inspect Workspace</span>
        </div>
        <p class="text-xs text-white/80 leading-relaxed font-['IBM_Plex_Mono',monospace] bg-black/40 p-2.5 rounded-xl border border-white/5">
          "List all my diagrams in my <strong>Architecture</strong> folder and summarize the design."
        </p>
        <span class="text-[10px] text-white/40 block">Lists diagrams and reads titles, code, and folder organization.</span>
      </div>
    </div>
  </div>
</div>

<!-- Generate Token Modal -->
{#if isCreateModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
    <div class="bg-[#0C0E14] border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl font-['Instrument_Sans',sans-serif]">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 class="text-sm font-bold text-white">
          {createdRawToken ? 'Access Token Generated' : 'Generate Personal Access Token'}
        </h3>
        <button onclick={closeCreateModal} class="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      {#if !createdRawToken}
        <div class="space-y-4">
          <div>
            <label for="token-name-input" class="block text-xs font-bold mb-1.5 text-white">
              Token Description / Label
            </label>
            <input
              id="token-name-input"
              type="text"
              bind:value={newTokenName}
              placeholder="e.g. Claude Desktop / Gemini Token"
              class="w-full px-4 py-3 text-xs rounded-2xl border border-white/15 bg-[#07080C] text-white focus:outline-none focus:border-amber-400 font-['IBM_Plex_Mono',monospace]"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <button
            onclick={closeCreateModal}
            class="px-4 py-2 text-xs font-bold rounded-xl border border-white/15 hover:bg-white/10 text-white/70 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onclick={handleCreateToken}
            disabled={isCreating || !newTokenName.trim()}
            class="px-5 py-2 text-xs rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {#if isCreating}
              <Loader2 size={14} class="animate-spin" />
              <span>Generating...</span>
            {:else}
              <KeyRound size={14} />
              <span>Generate Token</span>
            {/if}
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          <div class="p-4 rounded-2xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs space-y-1">
            <div class="font-bold flex items-center gap-1.5 text-amber-400">⚠️ Copy this token now</div>
            <p class="leading-relaxed">This secret raw token won't be shown again after closing this window.</p>
          </div>

          <div>
            <label for="token-raw-output" class="block text-xs font-bold mb-1.5 text-white">Your Secret Access Token</label>
            <div class="flex items-center gap-2">
              <input
                id="token-raw-output"
                type="text"
                readonly
                value={createdRawToken}
                class="w-full px-4 py-3 font-mono text-xs rounded-2xl border border-white/15 bg-[#07080C] text-emerald-400 select-all"
              />
              <button
                onclick={copyTokenToClipboard}
                class="px-4 py-3 rounded-2xl bg-white text-black font-bold text-xs shrink-0 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {#if isCopied}
                  <Check size={14} class="text-emerald-600" />
                  <span>Copied!</span>
                {:else}
                  <Copy size={14} />
                  <span>Copy</span>
                {/if}
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-white/10">
          <button
            onclick={closeCreateModal}
            class="px-6 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
