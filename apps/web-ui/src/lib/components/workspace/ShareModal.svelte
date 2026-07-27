<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';
  import type { Diagram } from '@txtgrph/core';
  import { Share2, Copy, Check, RefreshCw, X, Link2, ShieldAlert } from 'lucide-svelte';

  interface Props {
    open: boolean;
    diagram: Diagram | null;
    onclose: () => void;
  }

  let { open = false, diagram = null, onclose }: Props = $props();

  const supabase = createSupabaseBrowserClient();

  let copied = $state(false);
  let isSaving = $state(false);
  let errorMessage = $state<string | null>(null);

  const shareUrl = $derived.by(() => {
    if (!diagram || !diagram.shareToken || !diagram.isShared) return '';
    if (typeof window === 'undefined') return `/share/${diagram.shareToken}`;
    return `${window.location.origin}/share/${diagram.shareToken}`;
  });

  async function handleToggleShare() {
    if (!diagram) return;
    isSaving = true;
    errorMessage = null;

    try {
      const nextIsShared = !diagram.isShared;
      let nextToken = diagram.shareToken;

      // If enabling sharing for the first time without a token, generate one
      if (nextIsShared && !nextToken) {
        nextToken = crypto.randomUUID();
      }

      const { error } = await supabase
        .from('diagrams')
        .update({
          is_shared: nextIsShared,
          share_token: nextToken,
          share_updated_at: new Date().toISOString()
        })
        .eq('id', diagram.id);

      if (error) throw error;

      workspaceStore.updateDiagramShareState(diagram.id, nextIsShared, nextToken);
    } catch (err: any) {
      console.error('Failed to toggle share state:', err);
      errorMessage = err?.message || 'Failed to update share settings';
    } finally {
      isSaving = false;
    }
  }

  async function handleRegenerateToken() {
    if (!diagram) return;
    isSaving = true;
    errorMessage = null;

    try {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from('diagrams')
        .update({
          share_token: newToken,
          share_updated_at: new Date().toISOString()
        })
        .eq('id', diagram.id);

      if (error) throw error;

      workspaceStore.updateDiagramShareState(diagram.id, diagram.isShared, newToken);
    } catch (err: any) {
      console.error('Failed to regenerate share token:', err);
      errorMessage = err?.message || 'Failed to regenerate link';
    } finally {
      isSaving = false;
    }
  }

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy share URL:', err);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && diagram}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    role="presentation"
    onclick={onclose}
  >
    <!-- Modal Card -->
    <div
      class="w-full max-w-lg overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl transition-all"
      role="dialog"
      aria-labelledby="share-modal-title"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
            <Share2 class="h-5 w-5" />
          </div>
          <div>
            <h3 id="share-modal-title" class="text-lg font-semibold text-slate-100">
              Share Diagram
            </h3>
            <p class="text-xs text-slate-400 truncate max-w-[280px]">
              {diagram.title}
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={onclose}
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          aria-label="Close modal"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="mt-5 space-y-5">
        {#if errorMessage}
          <div class="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            <ShieldAlert class="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        {/if}

        <!-- Toggle Public Access -->
        <div class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-4">
          <div>
            <div class="text-sm font-medium text-slate-200">Public Link Access</div>
            <div class="text-xs text-slate-400">
              {diagram.isShared
                ? 'Anyone with the link can view this diagram in read-only mode'
                : 'Only you can view and edit this diagram'}
            </div>
          </div>
          <button
            type="button"
            onclick={handleToggleShare}
            disabled={isSaving}
            class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              diagram.isShared ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={diagram.isShared}
          >
            <span
              class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                diagram.isShared ? 'translate-x-5' : 'translate-x-0'
              }`}
            ></span>
          </button>
        </div>

        <!-- Share URL Field (when enabled) -->
        {#if diagram.isShared}
          <div class="space-y-2 animate-in fade-in duration-200">
            <label for="share-url-input" class="block text-xs font-medium text-slate-300">
              Shareable Web Link
            </label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <input
                  id="share-url-input"
                  type="text"
                  readonly
                  value={shareUrl}
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-indigo-300 select-all focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-9"
                />
                <Link2 class="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
              </div>
              <button
                type="button"
                onclick={copyToClipboard}
                class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shrink-0"
              >
                {#if copied}
                  <Check class="h-4 w-4 text-green-300" />
                  <span>Copied</span>
                {:else}
                  <Copy class="h-4 w-4" />
                  <span>Copy</span>
                {/if}
              </button>
            </div>

            <!-- Revoke / Regenerate Token -->
            <div class="flex items-center justify-between pt-2">
              <span class="text-[11px] text-slate-500">
                Need to invalidate existing links?
              </span>
              <button
                type="button"
                onclick={handleRegenerateToken}
                disabled={isSaving}
                class="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <RefreshCw class={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>Regenerate Link Token</span>
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="mt-6 flex justify-end border-t border-slate-800 pt-4">
        <button
          type="button"
          onclick={onclose}
          class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
