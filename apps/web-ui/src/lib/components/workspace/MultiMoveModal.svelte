<script lang="ts">
  import type { Folder } from '@txtgrph/core';
  import { X, Folder as FolderIcon, Check, FolderInput } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    folders?: Folder[];
    selectedCount?: number;
    onMove?: (targetFolderId: string | null) => void;
    onclose?: () => void;
  }

  let {
    open = false,
    folders = [] as Folder[],
    selectedCount = 0,
    onMove = () => {},
    onclose = () => {}
  }: Props = $props();

  let targetFolderId = $state<string | null>(null);

  let activeFolders = $derived.by(() => {
    return folders.filter((f) => !f.isDeleted);
  });

  function handleConfirmMove() {
    onMove(targetFolderId);
    onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      role="presentation"
      class="w-full max-w-md rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-hidden text-white p-6 space-y-5"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <FolderInput size={18} />
          </div>
          <h3 class="text-base font-bold text-white tracking-tight">Move {selectedCount} items</h3>
        </div>
        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Target Folder Selector List -->
      <div class="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        <!-- Option: Personal Root -->
        <button
          onclick={() => (targetFolderId = null)}
          class="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer {targetFolderId === null ? 'bg-white/15 border-white/30 text-white' : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/10'}"
        >
          <div class="flex items-center gap-2.5">
            <FolderIcon size={16} class="text-amber-400" />
            <span>Personal Root (No folder)</span>
          </div>
          {#if targetFolderId === null}
            <Check size={16} class="text-emerald-400" />
          {/if}
        </button>

        <!-- Option: Subfolders -->
        {#each activeFolders as folder (folder.id)}
          <button
            onclick={() => (targetFolderId = folder.id)}
            class="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer {targetFolderId === folder.id ? 'bg-white/15 border-white/30 text-white' : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/10'}"
          >
            <div class="flex items-center gap-2.5">
              <FolderIcon size={16} class="text-white/40" />
              <span>{folder.name}</span>
            </div>
            {#if targetFolderId === folder.id}
              <Check size={16} class="text-emerald-400" />
            {/if}
          </button>
        {/each}
      </div>

      <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
        <button
          onclick={onclose}
          class="px-4 py-2 text-xs font-semibold rounded-xl border border-white/15 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={handleConfirmMove}
          class="px-5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md cursor-pointer"
        >
          Move Items
        </button>
      </div>
    </div>
  </div>
{/if}
