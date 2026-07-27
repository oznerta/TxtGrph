<script lang="ts">
  import {
    ChevronRight,
    ChevronDown,
    Folder as FolderIcon,
    FolderOpen,
    FileText,
    Plus,
    Trash2,
    Search
  } from 'lucide-svelte';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';
  import type { Folder, Diagram } from '@txtgrph/core';

  let {
    onCreateFolder = (name: string, parentId?: string | null) => {},
    onCreateDiagram = (title: string, folderId?: string | null) => {},
    onDeleteFolder = (id: string) => {},
    onDeleteDiagram = (id: string) => {}
  } = $props();

  let newFolderName = $state('');
  let isCreatingRootFolder = $state(false);
  let activeCreateFolderId = $state<string | null>(null);

  function handleCreateFolderSubmit(parentId: string | null = null) {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), parentId);
      newFolderName = '';
      isCreatingRootFolder = false;
      activeCreateFolderId = null;
    }
  }
</script>

<div class="flex flex-col h-full bg-[var(--color-surface-card)] border-r border-[var(--color-border-default)] select-none">
  <!-- Search & Action Bar -->
  <div class="p-3 border-b border-[var(--color-border-default)] space-y-2 shrink-0">
    <div class="relative flex items-center">
      <Search size={14} class="absolute left-2.5 text-[var(--color-text-tertiary)]" />
      <input
        type="text"
        placeholder="Search diagrams..."
        bind:value={workspaceStore.searchQuery}
        class="w-full h-8 pl-8 pr-3 text-[12px] rounded-[5px] bg-[var(--color-surface-app)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brass)]"
      />
    </div>

    <div class="flex items-center justify-between text-[11px] font-medium text-[var(--color-text-secondary)] px-1 pt-1">
      <span>EXPLORER</span>
      <div class="flex items-center gap-1">
        <button
          onclick={() => { isCreatingRootFolder = true; }}
          title="New Folder"
          class="p-1 rounded hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <FolderIcon size={14} />
        </button>
        <button
          onclick={() => onCreateDiagram('Untitled Diagram', null)}
          title="New Diagram"
          class="p-1 rounded hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  </div>

  <!-- Root Folder Input -->
  {#if isCreatingRootFolder}
    <div class="px-3 py-2 border-b border-[var(--color-border-default)] flex items-center gap-1">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        placeholder="Folder name..."
        bind:value={newFolderName}
        onkeydown={(e) => e.key === 'Enter' && handleCreateFolderSubmit(null)}
        class="flex-1 h-7 px-2 text-[12px] rounded bg-[var(--color-surface-app)] border border-[var(--color-brass)] text-[var(--color-text-primary)] focus:outline-none"
        autofocus
      />
      <button
        onclick={() => handleCreateFolderSubmit(null)}
        class="px-2 py-1 text-[11px] rounded bg-[var(--color-ink)] text-[#FAF9F6] font-medium"
      >
        Add
      </button>
    </div>
  {/if}

  <!-- Tree View -->
  <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-[13px]">
    <!-- Root Level Diagrams & Folders -->
    {#each workspaceStore.getChildFolders(null) as folder (folder.id)}
      {@const isExpanded = workspaceStore.expandedFolderIds.has(folder.id)}
      <div class="group flex items-center justify-between px-2 py-1 rounded-[4px] cursor-pointer hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
        <button
          onclick={() => workspaceStore.toggleFolder(folder.id)}
          class="flex items-center gap-1.5 flex-1 truncate text-left"
        >
          {#if isExpanded}
            <ChevronDown size={14} class="shrink-0 text-[var(--color-text-tertiary)]" />
            <FolderOpen size={14} class="shrink-0 text-[var(--color-brass)]" />
          {:else}
            <ChevronRight size={14} class="shrink-0 text-[var(--color-text-tertiary)]" />
            <FolderIcon size={14} class="shrink-0 text-[var(--color-text-secondary)]" />
          {/if}
          <span class="truncate font-medium">{folder.name}</span>
        </button>

        <div class="hidden group-hover:flex items-center gap-1">
          <button
            onclick={() => onCreateDiagram('Untitled Diagram', folder.id)}
            title="Add Diagram to Folder"
            class="p-0.5 rounded hover:bg-[var(--color-surface-app)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <Plus size={12} />
          </button>
          <button
            onclick={() => onDeleteFolder(folder.id)}
            title="Delete Folder"
            class="p-0.5 rounded hover:bg-[var(--color-surface-app)] text-[var(--color-text-tertiary)] hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <!-- Folder Children -->
      {#if isExpanded}
        <div class="pl-4 space-y-0.5 border-l border-[var(--color-border-default)] ml-3 my-0.5">
          {#each workspaceStore.getFolderDiagrams(folder.id) as diagram (diagram.id)}
            {@const isActive = workspaceStore.activeDiagramId === diagram.id}
            <div
              class="group flex items-center justify-between px-2 py-1 rounded-[4px] cursor-pointer transition-colors {isActive ? 'bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] font-medium border-l-2 border-[var(--color-brass)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]'}"
            >
              <button
                onclick={() => workspaceStore.selectDiagram(diagram.id)}
                class="flex items-center gap-1.5 flex-1 truncate text-left"
              >
                <FileText size={14} class="shrink-0 {isActive ? 'text-[var(--color-brass)]' : 'text-[var(--color-text-tertiary)]'}" />
                <span class="truncate">{diagram.title}</span>
              </button>
              <button
                onclick={() => onDeleteDiagram(diagram.id)}
                title="Delete Diagram"
                class="hidden group-hover:block p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </div>
          {/each}
        </div>
      {/if}
    {/each}

    <!-- Root Level Diagrams (Unfoldered) -->
    {#each workspaceStore.getFolderDiagrams(null) as diagram (diagram.id)}
      {@const isActive = workspaceStore.activeDiagramId === diagram.id}
      <div
        class="group flex items-center justify-between px-2 py-1 rounded-[4px] cursor-pointer transition-colors {isActive ? 'bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] font-medium border-l-2 border-[var(--color-brass)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]'}"
      >
        <button
          onclick={() => workspaceStore.selectDiagram(diagram.id)}
          class="flex items-center gap-1.5 flex-1 truncate text-left"
        >
          <FileText size={14} class="shrink-0 {isActive ? 'text-[var(--color-brass)]' : 'text-[var(--color-text-tertiary)]'}" />
          <span class="truncate">{diagram.title}</span>
        </button>
        <button
          onclick={() => onDeleteDiagram(diagram.id)}
          title="Delete Diagram"
          class="hidden group-hover:block p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
    {/each}
  </div>
</div>
