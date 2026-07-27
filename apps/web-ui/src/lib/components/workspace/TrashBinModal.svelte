<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';
  import type { Diagram, Folder } from '@txtgrph/core';
  import { Trash2, RotateCcw, X, Search, Folder as FolderIcon, FileText, AlertTriangle, ShieldAlert } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open = false, onclose }: Props = $props();

  const supabase = createSupabaseBrowserClient();

  let searchQuery = $state('');
  let isProcessing = $state(false);
  let errorMessage = $state<string | null>(null);

  const filteredTrashedItems = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();
    const trashedDiagrams = workspaceStore.trashedDiagrams;
    const trashedFolders = workspaceStore.trashedFolders;

    const list: Array<{ type: 'diagram' | 'folder'; item: Diagram | Folder }> = [
      ...trashedFolders.map((f) => ({ type: 'folder' as const, item: f })),
      ...trashedDiagrams.map((d) => ({ type: 'diagram' as const, item: d }))
    ];

    if (!query) return list;

    return list.filter((entry) => {
      if (entry.type === 'folder') {
        return (entry.item as Folder).name.toLowerCase().includes(query);
      } else {
        const d = entry.item as Diagram;
        return d.title.toLowerCase().includes(query) || d.code.toLowerCase().includes(query);
      }
    });
  });

  async function handleRestore(type: 'diagram' | 'folder', id: string) {
    isProcessing = true;
    errorMessage = null;

    try {
      if (type === 'diagram') {
        const { error } = await supabase
          .from('diagrams')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', id);

        if (error) throw error;
        workspaceStore.restoreDiagram(id);
      } else {
        const { error } = await supabase
          .from('folders')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', id);

        if (error) throw error;
        workspaceStore.restoreFolder(id);
      }
    } catch (err: any) {
      console.error('Restore item failed:', err);
      errorMessage = err?.message || 'Failed to restore item';
    } finally {
      isProcessing = false;
    }
  }

  async function handlePurge(type: 'diagram' | 'folder', id: string) {
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return;
    }

    isProcessing = true;
    errorMessage = null;

    try {
      if (type === 'diagram') {
        const { error } = await supabase.from('diagrams').delete().eq('id', id);
        if (error) throw error;
        workspaceStore.purgeDiagram(id);
      } else {
        const { error } = await supabase.from('folders').delete().eq('id', id);
        if (error) throw error;
        workspaceStore.purgeFolder(id);
      }
    } catch (err: any) {
      console.error('Purge item failed:', err);
      errorMessage = err?.message || 'Failed to purge item';
    } finally {
      isProcessing = false;
    }
  }

  async function handleEmptyTrash() {
    if (!confirm('Empty all items in the Trash Bin permanently? This cannot be undone.')) {
      return;
    }

    isProcessing = true;
    errorMessage = null;

    try {
      const trashedDiagramIds = workspaceStore.trashedDiagrams.map((d) => d.id);
      const trashedFolderIds = workspaceStore.trashedFolders.map((f) => f.id);

      if (trashedDiagramIds.length > 0) {
        const { error } = await supabase.from('diagrams').delete().in('id', trashedDiagramIds);
        if (error) throw error;
      }

      if (trashedFolderIds.length > 0) {
        const { error } = await supabase.from('folders').delete().in('id', trashedFolderIds);
        if (error) throw error;
      }

      workspaceStore.emptyTrash();
    } catch (err: any) {
      console.error('Empty trash failed:', err);
      errorMessage = err?.message || 'Failed to empty trash';
    } finally {
      isProcessing = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    role="presentation"
    onclick={onclose}
  >
    <!-- Modal Card -->
    <div
      class="flex h-[560px] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl transition-all"
      role="dialog"
      aria-labelledby="trash-modal-title"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 p-5 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="rounded-lg bg-red-500/10 p-2 text-red-400">
            <Trash2 class="h-5 w-5" />
          </div>
          <div>
            <h3 id="trash-modal-title" class="text-base font-semibold text-slate-100">
              Trash Bin
            </h3>
            <p class="text-xs text-slate-400">
              Items in trash can be restored or permanently purged
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if workspaceStore.trashedCount > 0}
            <button
              type="button"
              onclick={handleEmptyTrash}
              disabled={isProcessing}
              class="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <AlertTriangle class="h-3.5 w-3.5" />
              <span>Empty Trash</span>
            </button>
          {/if}
          <button
            type="button"
            onclick={onclose}
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="border-b border-slate-800/80 px-5 py-3 shrink-0">
        <div class="relative">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search trashed folders and diagrams..."
            class="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Scrollable Items List Region -->
      <div class="min-h-0 flex-1 overflow-y-auto p-5">
        {#if errorMessage}
          <div class="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            <ShieldAlert class="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        {/if}

        {#if filteredTrashedItems.length === 0}
          <!-- Empty State -->
          <div class="flex h-full flex-col items-center justify-center text-center text-slate-500 py-12">
            <div class="rounded-full bg-slate-800/60 p-4 mb-3">
              <Trash2 class="h-8 w-8 text-slate-600" />
            </div>
            <p class="text-sm font-medium text-slate-400">
              {searchQuery ? 'No matching trashed items found' : 'Trash Bin is empty'}
            </p>
            <p class="mt-1 text-xs text-slate-600">
              Soft-deleted folders and diagrams will appear here
            </p>
          </div>
        {:else}
          <!-- Active List -->
          <div class="space-y-2">
            {#each filteredTrashedItems as { type, item } (item.id)}
              <div class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3 hover:border-slate-700 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="rounded-lg bg-slate-800 p-2 text-slate-400 shrink-0">
                    {#if type === 'folder'}
                      <FolderIcon class="h-4 w-4 text-amber-400" />
                    {:else}
                      <FileText class="h-4 w-4 text-indigo-400" />
                    {/if}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-slate-200 truncate">
                      {type === 'folder' ? (item as Folder).name : (item as Diagram).title}
                    </p>
                    <p class="text-[11px] text-slate-500">
                      {type === 'folder' ? 'Folder' : 'Diagram'} · Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => handleRestore(type, item.id)}
                    disabled={isProcessing}
                    class="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw class="h-3.5 w-3.5 text-slate-400" />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => handlePurge(type, item.id)}
                    disabled={isProcessing}
                    class="flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end border-t border-slate-800 p-4 shrink-0">
        <button
          type="button"
          onclick={onclose}
          class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
