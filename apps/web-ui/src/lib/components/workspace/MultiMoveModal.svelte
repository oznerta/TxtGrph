<script lang="ts">
  import type { Folder } from '@txtgrph/core';
  import {
    X,
    Folder as FolderIcon,
    FolderOpen,
    Check,
    FolderInput,
    ChevronRight,
    ChevronDown,
    User,
    LayoutDashboard
  } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    folders?: Folder[];
    selectedCount?: number;
    excludedFolderIds?: string[];
    onMove?: (targetFolderId: string | null) => void;
    onclose?: () => void;
  }

  let {
    open = false,
    folders = [] as Folder[],
    selectedCount = 0,
    excludedFolderIds = [] as string[],
    onMove = () => {},
    onclose = () => {}
  }: Props = $props();

  let targetFolderId = $state<string | null>(null);
  let expandedFolderIds = $state<Set<string>>(new Set());

  // Reset expanded set on modal open so folders are collapsed by default
  $effect(() => {
    if (open) {
      expandedFolderIds = new Set<string>();
    }
  });

  function toggleExpand(folderId: string, e: MouseEvent) {
    e.stopPropagation();
    const next = new Set(expandedFolderIds);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    expandedFolderIds = next;
  }

  // Compute set of excluded IDs including all descendant children of excluded folders
  let invalidTargetIds = $derived.by(() => {
    const invalid = new Set<string>(excludedFolderIds);
    let added = true;

    // Iteratively resolve all nested descendants of excluded folders
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId && invalid.has(f.parentId) && !invalid.has(f.id)) {
          invalid.add(f.id);
          added = true;
        }
      }
    }

    return invalid;
  });

  function getDirectSubfolders(parentId: string | null = null): Folder[] {
    return folders.filter((f) => f.parentId === parentId && !f.isDeleted && !invalidTargetIds.has(f.id));
  }

  let rootFolders = $derived.by(() => getDirectSubfolders(null));
  let isRootSelected = $derived(targetFolderId === null);

  function handleConfirmMove() {
    onMove(targetFolderId);
    onclose();
  }
</script>

{#if open}
  <!-- Backdrop Overlay -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    role="presentation"
    class="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]"
    onclick={onclose}
  >
    <!-- Modal Card Container (Spacious max-w-xl width & UX) -->
    <div
      role="presentation"
      class="w-full max-w-xl sm:max-w-2xl rounded-3xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-visible text-white p-7 space-y-6 relative z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header Bar -->
      <div class="flex items-center justify-between border-b border-white/10 pb-5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <FolderInput size={20} />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white tracking-tight">
              Move {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
            </h3>
            <p class="text-xs text-white/50">Choose a destination folder from your space hierarchy</p>
          </div>
        </div>

        <button
          onclick={onclose}
          aria-label="Close modal"
          class="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Recursive Tree Snippet Definition -->
      {#snippet folderTreeNode(folder: Folder, depth: number)}
        {@const subFolders = getDirectSubfolders(folder.id)}
        {@const hasSubfolders = subFolders.length > 0}
        {@const isExpanded = expandedFolderIds.has(folder.id)}
        {@const isSelected = targetFolderId === folder.id}

        <div class="space-y-1">
          <!-- Folder Row Selector Button -->
          <div
            role="button"
            tabindex="0"
            onclick={() => (targetFolderId = folder.id)}
            onkeydown={(e) => e.key === 'Enter' && (targetFolderId = folder.id)}
            class="group w-full flex items-center justify-between p-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer {isSelected ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-lg ring-1 ring-amber-500/40' : 'bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white'}"
          >
            <div class="flex items-center gap-2.5 truncate min-w-0 pr-2">
              {#if hasSubfolders}
                <button
                  type="button"
                  onclick={(e) => toggleExpand(folder.id, e)}
                  title={isExpanded ? 'Collapse folder' : 'Expand folder'}
                  class="p-1 rounded-lg hover:bg-white/15 text-white/50 hover:text-white transition-colors shrink-0 cursor-pointer"
                >
                  {#if isExpanded}
                    <ChevronDown size={15} />
                  {:else}
                    <ChevronRight size={15} />
                  {/if}
                </button>
              {:else}
                <div class="w-6 shrink-0"></div>
              {/if}

              {#if isExpanded}
                <FolderOpen size={18} class="text-amber-400 shrink-0" />
              {:else}
                <FolderIcon size={18} class="text-amber-400/80 shrink-0 group-hover:text-amber-400" />
              {/if}

              <span class="truncate text-xs sm:text-sm font-semibold">{folder.name}</span>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              {#if hasSubfolders}
                <span class="text-[10.5px] font-medium text-white/40 font-['IBM_Plex_Mono',monospace] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {subFolders.length} {subFolders.length === 1 ? 'subfolder' : 'subfolders'}
                </span>
              {/if}

              {#if isSelected}
                <div class="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold shadow-md">
                  <Check size={14} class="stroke-[3]" />
                </div>
              {:else}
                <div class="w-5 h-5 rounded-full border border-white/20 group-hover:border-white/40 transition-colors"></div>
              {/if}
            </div>
          </div>

          <!-- Child Subfolders with Connecting Vertical Tree Line -->
          {#if hasSubfolders && isExpanded}
            <div class="border-l-2 border-white/15 ml-5 pl-4 space-y-1.5 my-1">
              {#each subFolders as childFolder (childFolder.id)}
                {@render folderTreeNode(childFolder, depth + 1)}
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}

      <!-- Scrollable Tree Viewport (Fixed Height) -->
      <div class="h-[360px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
        <!-- Root Space Option: Personal Root -->
        <div class="space-y-2">
          <div
            role="button"
            tabindex="0"
            onclick={() => (targetFolderId = null)}
            onkeydown={(e) => e.key === 'Enter' && (targetFolderId = null)}
            class="w-full flex items-center justify-between p-3.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer {isRootSelected ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-lg ring-1 ring-amber-500/40' : 'bg-[#141622] border-white/20 text-white hover:bg-white/10'}"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div>
                <span class="text-sm font-bold text-white block">Personal Root</span>
                <span class="text-[11px] text-white/50 font-normal font-['IBM_Plex_Mono',monospace]">Top-level space (no folder)</span>
              </div>
            </div>

            {#if isRootSelected}
              <div class="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold shadow-md">
                <Check size={14} class="stroke-[3]" />
              </div>
            {:else}
              <div class="w-5 h-5 rounded-full border border-white/20"></div>
            {/if}
          </div>

          <!-- Top Level Folders Tree -->
          {#if rootFolders.length > 0}
            <div class="border-l-2 border-white/15 ml-5 pl-4 space-y-2 mt-2">
              {#each rootFolders as rootFolder (rootFolder.id)}
                {@render folderTreeNode(rootFolder, 0)}
              {/each}
            </div>
          {:else}
            <div class="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center text-xs text-white/40 font-['IBM_Plex_Mono',monospace]">
              No custom folders created yet.
            </div>
          {/if}
        </div>
      </div>

      <!-- Action Buttons Footer -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
        <button
          type="button"
          onclick={onclose}
          class="px-5 py-2.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleConfirmMove}
          class="px-6 py-2.5 text-xs font-bold rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-lg cursor-pointer flex items-center gap-2"
        >
          <FolderInput size={15} />
          <span>Move Items Here</span>
        </button>
      </div>
    </div>
  </div>
{/if}
