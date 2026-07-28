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
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]"
    role="presentation"
    onclick={onclose}
  >
    <!-- Modal Card -->
    <div
      class="flex h-[560px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0F1117] shadow-2xl transition-all text-white"
      role="dialog"
      tabindex="-1"
      aria-labelledby="trash-modal-title"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-white/10 p-5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <Trash2 class="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 id="trash-modal-title" class="text-base font-bold text-white tracking-tight">
              Trash Bin
            </h3>
            <p class="text-xs text-white/50">
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
              class="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition-colors cursor-pointer"
            >
              <AlertTriangle class="h-3.5 w-3.5" />
              <span>Empty Trash</span>
            </button>
          {/if}
          <button
            type="button"
            onclick={onclose}
            class="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X class="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="border-b border-white/10 px-5 py-3 shrink-0">
        <div class="relative">
          <Search class="absolute left-3.5 top-2.5 h-4 w-4 text-white/30" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search trashed folders and diagrams..."
            class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      <!-- Scrollable Items List Region -->
      <div class="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
        {#if errorMessage}
          <div class="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-300 border border-red-500/30">
            <ShieldAlert class="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        {/if}

        {#if filteredTrashedItems.length === 0}
          <!-- Empty State -->
          <div class="flex h-full flex-col items-center justify-center text-center text-white/40 py-12">
            <div class="rounded-2xl bg-white/5 p-4 mb-3 border border-white/10">
              <Trash2 class="h-8 w-8 text-white/30" />
            </div>
            <p class="text-sm font-semibold text-white/70">
              {searchQuery ? 'No matching trashed items found' : 'Trash Bin is empty'}
            </p>
            <p class="mt-1 text-xs text-white/40">
              Soft-deleted folders and diagrams will appear here
            </p>
          </div>
        {:else}
          <!-- Active List -->
          <div class="space-y-2">
            {#each filteredTrashedItems as { type, item } (item.id)}
              <div class="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-white/20 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="rounded-xl bg-white/5 p-2 text-white/60 shrink-0 border border-white/10">
                    {#if type === 'folder'}
                      <FolderIcon class="h-4 w-4 text-amber-400" />
                    {:else}
                      <FileText class="h-4 w-4 text-blue-400" />
                    {/if}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-white truncate">
                      {type === 'folder' ? (item as Folder).name : (item as Diagram).title}
                    </p>
                    <p class="text-[11px] text-white/40">
                      {type === 'folder' ? 'Folder' : 'Diagram'} · Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => handleRestore(type, item.id)}
                    disabled={isProcessing}
                    class="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <RotateCcw class="h-3.5 w-3.5 text-white/70" />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => handlePurge(type, item.id)}
                    disabled={isProcessing}
                    class="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
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
      <div class="flex justify-end border-t border-white/10 p-4 shrink-0">
        <button
          type="button"
          onclick={onclose}
          class="rounded-xl border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
