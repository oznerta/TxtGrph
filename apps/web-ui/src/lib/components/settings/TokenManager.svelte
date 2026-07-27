<script lang="ts">
  import { onMount } from 'svelte';

  export interface McpTokenRecord {
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

  function formatDate(isoStr: string | null) {
    if (!isoStr) return 'Never';
    return new Date(isoStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<section class="p-6 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-base font-semibold text-[var(--color-text-primary)]">Public REST API & MCP Access Tokens</h2>
      <p class="text-xs text-[var(--color-text-secondary)] mt-1">
        Personal access tokens for connecting external AI coding tools (Claude Desktop, Cursor, Custom Agents) to your TxtGrph workspace.
      </p>
    </div>
    <button
      onclick={openCreateModal}
      class="px-3 py-1.5 text-xs font-medium rounded bg-[var(--color-brass)] text-white hover:opacity-90 self-start sm:self-auto shrink-0"
    >
      + Generate New Token
    </button>
  </div>

  {#if isLoading}
    <div class="py-6 text-center text-xs text-[var(--color-text-muted)] font-mono animate-pulse">
      Loading access tokens...
    </div>
  {:else if errorMsg}
    <div class="p-3 text-xs rounded bg-[var(--color-error-bg)] text-[var(--color-error-text)]">
      {errorMsg}
    </div>
  {:else if tokens.length === 0}
    <div class="p-8 text-center border border-dashed border-[var(--color-border-default)] rounded-lg space-y-2">
      <div class="text-sm font-medium text-[var(--color-text-secondary)]">No Personal Access Tokens Yet</div>
      <p class="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
        Generate a token to allow Cursor, Claude Desktop, or your own scripts to interact with your diagram library.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto border border-[var(--color-border-default)] rounded-lg">
      <table class="w-full text-left text-xs">
        <thead class="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-medium border-b border-[var(--color-border-default)]">
          <tr>
            <th class="py-2.5 px-3">Token Label</th>
            <th class="py-2.5 px-3 font-mono">Token Prefix</th>
            <th class="py-2.5 px-3">Created</th>
            <th class="py-2.5 px-3">Last Used</th>
            <th class="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border-default)]">
          {#each tokens as token}
            <tr class="hover:bg-[var(--color-surface-subtle)]/50">
              <td class="py-2.5 px-3 font-medium text-[var(--color-text-primary)]">{token.name}</td>
              <td class="py-2.5 px-3 font-mono text-[var(--color-text-muted)]">{token.token_prefix}...</td>
              <td class="py-2.5 px-3 text-[var(--color-text-secondary)]">{formatDate(token.created_at)}</td>
              <td class="py-2.5 px-3 text-[var(--color-text-secondary)]">{formatDate(token.last_used_at)}</td>
              <td class="py-2.5 px-3 text-right">
                <button
                  onclick={() => handleRevokeToken(token.id, token.name)}
                  class="text-xs text-[var(--color-error-text)] hover:underline font-medium"
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
</section>

<!-- Generate Token Modal -->
{#if isCreateModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-[var(--color-text-primary)]">
          {createdRawToken ? 'Access Token Generated' : 'Generate Personal Access Token'}
        </h3>
        <button onclick={closeCreateModal} class="text-[var(--color-text-muted)] hover:text-black">
          ✕
        </button>
      </div>

      {#if !createdRawToken}
        <div class="space-y-3 text-sm">
          <div>
            <label for="token-name-input" class="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">
              Token Description / Name
            </label>
            <input
              id="token-name-input"
              type="text"
              bind:value={newTokenName}
              placeholder="e.g. Cursor MCP Token"
              class="w-full px-3 py-2 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-default)]">
          <button
            onclick={closeCreateModal}
            class="px-4 py-2 text-xs rounded border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)]"
          >
            Cancel
          </button>
          <button
            onclick={handleCreateToken}
            disabled={isCreating || !newTokenName.trim()}
            class="px-4 py-2 text-xs rounded bg-[var(--color-brass)] text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isCreating ? 'Generating...' : 'Generate Token'}
          </button>
        </div>
      {:else}
        <div class="space-y-4 text-xs">
          <div class="p-3 rounded bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] space-y-1">
            <div class="font-semibold">⚠️ Copy this token now</div>
            <p>You won't be able to view or copy this access token again after closing this modal!</p>
          </div>

          <div>
            <label for="token-raw-output" class="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">Your Raw Access Token</label>
            <div class="flex items-center gap-2">
              <input
                id="token-raw-output"
                type="text"
                readonly
                value={createdRawToken}
                class="w-full px-3 py-2 font-mono text-xs rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] text-[var(--color-text-primary)] select-all"
              />
              <button
                onclick={copyTokenToClipboard}
                class="px-3 py-2 rounded bg-[var(--color-ink)] text-white font-medium shrink-0 hover:opacity-90"
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-[var(--color-border-default)]">
          <button
            onclick={closeCreateModal}
            class="px-4 py-2 text-xs rounded bg-[var(--color-brass)] text-white font-medium hover:opacity-90"
          >
            Done
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
