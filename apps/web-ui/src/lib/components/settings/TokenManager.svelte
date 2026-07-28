<script lang="ts">
  import { onMount } from 'svelte';
  import { KeyRound, Plus, Trash2, Copy, Check, Loader2, Server, Terminal, Code2, ShieldCheck, X } from 'lucide-svelte';

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

  // Modal State
  let isCreateModalOpen = $state(false);
  let newTokenName = $state('');
  let isCreating = $state(false);
  let createdRawToken = $state<string | null>(null);
  let isCopied = $state(false);

  // Guide Snippet Tab State
  let activeGuideTab = $state<'claude' | 'cursor'>('claude');
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
    fetchTokens();
  });

  function openCreateModal() {
    newTokenName = 'Cursor / MCP Token';
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

  let claudeSnippet = $derived(`{
  "mcpServers": {
    "txtgrph": {
      "command": "npx",
      "args": ["-y", "@txtgrph/mcp-server"],
      "env": {
        "TXTGRPH_API_KEY": "${tokens[0]?.token_prefix || 'txtg_live_...'}",
        "TXTGRPH_BASE_URL": "http://localhost:5173"
      }
    }
  }
}`);

  let cursorSnippet = $derived(`{
  "mcp": {
    "servers": {
      "txtgrph": {
        "url": "http://localhost:5173/api/mcp",
        "headers": {
          "Authorization": "Bearer ${tokens[0]?.token_prefix || 'txtg_live_...'}"
        }
      }
    }
  }
}`);

  function copySnippet() {
    const text = activeGuideTab === 'claude' ? claudeSnippet : cursorSnippet;
    navigator.clipboard.writeText(text);
    isSnippetCopied = true;
    setTimeout(() => {
      isSnippetCopied = false;
    }, 2000);
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

<div class="space-y-6 w-full">
  <!-- Tokens List Card -->
  <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 class="text-sm font-bold text-white">Personal Access Tokens</h3>
        <p class="text-xs text-white/50 mt-0.5">
          Tokens grant access to REST API endpoints and Model Context Protocol (MCP) servers.
        </p>
      </div>
      <button
        onclick={openCreateModal}
        class="px-4 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
      >
        <Plus size={14} />
        <span>Generate New Token</span>
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
        <div class="text-xs font-bold text-white">No Personal Access Tokens Generated</div>
        <p class="text-xs text-white/40 max-w-sm mx-auto">
          Create an access token to connect Claude Desktop, Cursor, or your own agents to TxtGrph.
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto border border-white/10 rounded-2xl bg-[#07080C]">
        <table class="w-full text-left text-xs font-['IBM_Plex_Mono',monospace]">
          <thead class="bg-white/[0.04] text-white/60 border-b border-white/10 font-bold">
            <tr>
              <th class="py-3 px-4">Label</th>
              <th class="py-3 px-4">Prefix</th>
              <th class="py-3 px-4">Created</th>
              <th class="py-3 px-4">Last Used</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            {#each tokens as token}
              <tr class="hover:bg-white/[0.02] transition-colors">
                <td class="py-3 px-4 font-bold text-white">{token.name}</td>
                <td class="py-3 px-4 text-amber-400">{token.token_prefix}...</td>
                <td class="py-3 px-4 text-white/50">{formatDate(token.created_at)}</td>
                <td class="py-3 px-4 text-white/50">{formatDate(token.last_used_at)}</td>
                <td class="py-3 px-4 text-right">
                  <button
                    onclick={() => handleRevokeToken(token.id, token.name)}
                    class="text-xs text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Interactive MCP Setup Guide Card -->
  <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <Server size={18} class="text-amber-400" />
        <h4 class="text-xs font-bold text-white uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">MCP Agent Integration Snippets</h4>
      </div>

      <div class="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 font-['IBM_Plex_Mono',monospace]">
        <button
          onclick={() => (activeGuideTab = 'claude')}
          class="px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer {activeGuideTab === 'claude' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          Claude Desktop
        </button>
        <button
          onclick={() => (activeGuideTab = 'cursor')}
          class="px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer {activeGuideTab === 'cursor' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          Cursor / VS Code
        </button>
      </div>
    </div>

    <div class="p-4 rounded-2xl bg-[#07080C] border border-white/10 space-y-3">
      <div class="flex items-center justify-between text-xs text-white/60 font-['IBM_Plex_Mono',monospace]">
        <span>Config File: {activeGuideTab === 'claude' ? 'claude_desktop_config.json' : 'mcp.json'}</span>
        <button
          onclick={copySnippet}
          class="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
        >
          {#if isSnippetCopied}
            <Check size={13} class="text-emerald-400" />
            <span class="text-emerald-400">Copied!</span>
          {:else}
            <Copy size={13} />
            <span>Copy Snippet</span>
          {/if}
        </button>
      </div>

      <pre class="text-[12px] leading-[22px] font-['IBM_Plex_Mono',monospace] text-amber-300 whitespace-pre font-mono p-3.5 rounded-xl bg-black/60 border border-white/5 select-all overflow-x-auto">{activeGuideTab === 'claude' ? claudeSnippet : cursorSnippet}</pre>
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
              placeholder="e.g. Cursor MCP Token"
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
