<script lang="ts">
  import {
    ChevronRight,
    ChevronDown,
    Folder as FolderIcon,
    FolderOpen,
    FileText,
    Plus,
    Trash2,
    LayoutDashboard,
    User,
    Users,
    Share2,
    MoreVertical,
    Menu,
    Settings,
    Building2,
    Clock,
    Edit3
  } from 'lucide-svelte';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';
  import { profileStore } from '$lib/stores/profileStore.svelte';
  import type { Folder } from '@txtgrph/core';
  import FavoriteIcon from '$lib/components/ui/FavoriteIcon.svelte';

  interface Props {
    userEmail?: string;
    sidebarOpen?: boolean;
    favoriteIds?: Set<string>;
    organizations?: { id: string; name: string }[];
    onToggleSidebar?: () => void;
    onCreateFolder?: (name: string, parentId?: string | null) => void;
    onCreateDiagram?: (title: string, folderId?: string | null) => void;
    onRenameFolder?: (id: string, currentName: string) => void;
    onRenameDiagram?: (id: string, currentTitle: string) => void;
    onDeleteFolder?: (id: string) => void;
    onDeleteDiagram?: (id: string) => void;
    onOpenTrash?: () => void;
    onOpenSettings?: () => void;
    onOpenCreateOrg?: () => void;
    onOpenOrgSettings?: (id: string, orgName: string) => void;
    onShareFolder?: (folder: Folder) => void;
  }

  let {
    userEmail = '',
    sidebarOpen = true,
    favoriteIds = new Set<string>(),
    organizations = [] as { id: string; name: string }[],
    onToggleSidebar = () => {},
    onCreateFolder = () => {},
    onCreateDiagram = () => {},
    onRenameFolder = () => {},
    onRenameDiagram = () => {},
    onDeleteFolder = () => {},
    onDeleteDiagram = () => {},
    onOpenTrash = () => {},
    onOpenSettings = () => {},
    onOpenCreateOrg = () => {},
    onOpenOrgSettings = () => {},
    onShareFolder = () => {}
  }: Props = $props();

  let newFolderName = $state('');
  let isCreatingFolder = $state(false);
  let targetParentFolderId = $state<string | null>(null);

  let personalExpanded = $state(true);
  let activeMenuFolderId = $state<string | null>(null);
  let showPersonalMenu = $state(false);

  function handleCreateFolderSubmit() {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), targetParentFolderId);
      newFolderName = '';
      isCreatingFolder = false;
      targetParentFolderId = null;
    }
  }

  function openNewSubFolderInput(parentId: string | null = null) {
    targetParentFolderId = parentId;
    isCreatingFolder = true;
    newFolderName = '';
    if (parentId && !workspaceStore.expandedFolderIds.has(parentId)) {
      workspaceStore.toggleFolder(parentId);
    }
  }

  const initial = $derived(userEmail ? userEmail.charAt(0).toUpperCase() : 'U');
  const favoriteDiagrams = $derived(workspaceStore.diagrams.filter(d => !d.isDeleted && favoriteIds.has(d.id)));
</script>

<svelte:window onclick={() => {
  activeMenuFolderId = null;
  showPersonalMenu = false;
}} />

{#snippet folderTreeItem(folder: Folder, depth: number, orgId?: string | null)}
  {@const isExpanded = workspaceStore.expandedFolderIds.has(folder.id)}
  {@const isSelected = workspaceStore.activeFolderId === folder.id}
  {@const subFolders = workspaceStore.getChildFolders(folder.id, orgId)}
  {@const diagrams = workspaceStore.getFolderDiagrams(folder.id, orgId)}

  <div class="group relative flex items-center justify-between px-2.5 py-1.5 rounded-full cursor-pointer transition-all {isSelected ? 'bg-amber-500/15 text-amber-300 border border-amber-500/50 font-bold shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}">
    <button
      onclick={() => {
        workspaceStore.toggleFolder(folder.id);
        workspaceStore.selectFolder(folder.id);
      }}
      class="flex items-center gap-1.5 flex-1 truncate text-left"
    >
      {#if isExpanded}
        <ChevronDown size={13} class="shrink-0 text-white/50" />
        <FolderOpen size={13} class="shrink-0 text-amber-400" />
      {:else}
        <ChevronRight size={13} class="shrink-0 text-white/50" />
        <FolderIcon size={13} class="shrink-0 text-amber-400/80 group-hover:text-amber-400" />
      {/if}
      <span class="truncate font-medium">{folder.name}</span>
      {#if folder.isShared}
        <span class="ml-1 inline-flex items-center gap-0.5 rounded bg-sky-500/20 px-1 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-500/30 shrink-0" title="Shared folder">
          <Users size={10} />
        </span>
      {/if}
    </button>

    <div class="flex items-center gap-0.5 shrink-0">
      <button
        onclick={(e) => {
          e.stopPropagation();
          onShareFolder(folder);
        }}
        title="Share folder"
        class="p-0.5 rounded text-white/40 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Share2 size={12} />
      </button>

      <button
        onclick={(e) => {
          e.stopPropagation();
          activeMenuFolderId = activeMenuFolderId === folder.id ? null : folder.id;
        }}
        class="p-0.5 rounded text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical size={12} />
      </button>
    </div>

    {#if activeMenuFolderId === folder.id}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        role="presentation"
        class="absolute right-2 top-full mt-1 w-36 rounded-xl bg-[#141620] border border-white/20 shadow-2xl py-1 z-30 text-[11px]"
        onclick={(e) => e.stopPropagation()}
      >
        <button
          onclick={() => {
            activeMenuFolderId = null;
            onRenameFolder(folder.id, folder.name);
          }}
          class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-white"
        >
          <span>Rename</span>
          <Edit3 size={12} class="text-amber-400" />
        </button>
        <button
          onclick={() => {
            activeMenuFolderId = null;
            onCreateDiagram('Untitled Diagram', folder.id);
          }}
          class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-white"
        >
          <span>New diagram</span>
          <Plus size={12} />
        </button>
        <button
          onclick={() => {
            activeMenuFolderId = null;
            onShareFolder(folder);
          }}
          class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-white"
        >
          <span>Share folder</span>
          <Share2 size={12} class="text-sky-400" />
        </button>
        <button
          onclick={() => {
            activeMenuFolderId = null;
            openNewSubFolderInput(folder.id);
          }}
          class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-white"
        >
          <span>New subfolder</span>
          <FolderIcon size={12} />
        </button>
        <button
          onclick={() => {
            activeMenuFolderId = null;
            onDeleteFolder(folder.id);
          }}
          class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-red-500/20 text-red-400"
        >
          <span>Delete</span>
          <Trash2 size={12} />
        </button>
      </div>
    {/if}
  </div>

  {#if isExpanded}
    <div class="pl-3.5 space-y-0.5 border-l border-white/10 ml-2.5 my-0.5">
      {#if isCreatingFolder && targetParentFolderId === folder.id}
        <div class="px-2 py-1.5 flex items-center gap-1">
          <!-- svelte-ignore a11y_autofocus -->
          <input
            type="text"
            placeholder="Subfolder name..."
            bind:value={newFolderName}
            onkeydown={(e) => e.key === 'Enter' && handleCreateFolderSubmit()}
            class="flex-1 h-6 px-2 text-[11px] rounded-md bg-[#161824] border border-white/30 text-white focus:outline-none"
            autofocus
          />
          <button
            onclick={handleCreateFolderSubmit}
            class="px-2 py-0.5 text-[10px] rounded bg-white text-black font-semibold"
          >
            Add
          </button>
        </div>
      {/if}

      <!-- Recursive Subfolders -->
      {#each subFolders as childFolder (childFolder.id)}
        {@render folderTreeItem(childFolder, depth + 1, orgId)}
      {/each}

      <!-- Diagrams in folder -->
      {#each diagrams as diagram (diagram.id)}
        {@const isActive = workspaceStore.activeDiagramId === diagram.id}
        <div
          class="group flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition-colors {isActive ? 'bg-white/15 text-white font-bold border-l-2 border-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}"
        >
          <button
            onclick={() => workspaceStore.selectDiagram(diagram.id)}
            class="flex items-center gap-1.5 flex-1 truncate text-left"
          >
            <FileText size={13} class="shrink-0 {isActive ? 'text-white' : 'text-white/40'}" />
            <span class="truncate">{diagram.title}</span>
          </button>

          <div class="hidden group-hover:flex items-center gap-0.5">
            <button
              onclick={(e) => {
                e.stopPropagation();
                onRenameDiagram(diagram.id, diagram.title);
              }}
              title="Rename Diagram"
              class="p-0.5 rounded text-white/40 hover:text-amber-400 transition-colors"
            >
              <Edit3 size={11} />
            </button>
            <button
              onclick={(e) => {
                e.stopPropagation();
                onDeleteDiagram(diagram.id);
              }}
              title="Delete Diagram"
              class="p-0.5 rounded text-white/40 hover:text-red-400 transition-colors"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

<div class="flex flex-col h-full bg-[#000000] border-r border-white/10 select-none text-white/80 font-['Instrument_Sans',sans-serif]">
  <!-- Top Sidebar Header with Hamburger Icon & Logo -->
  <div class="h-14 px-4 border-b border-white/10 flex items-center gap-3 shrink-0">
    <button
      onclick={onToggleSidebar}
      title="Toggle Sidebar"
      class="p-1.5 -ml-1 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
    >
      <Menu size={18} />
    </button>

    <a href="/workspace" class="flex items-center gap-2.5">
      <div class="w-7 h-7 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1 shadow-sm">
        <img src="/assets/logo-short-dark.png" alt="TxtGrph Logo" class="w-full h-full object-contain" />
      </div>
      <span class="font-['Instrument_Sans',sans-serif] text-[16px] font-bold text-white tracking-tight">
        TxtGrph
      </span>
    </a>
  </div>

  <!-- Sidebar Body Navigation Links -->
  <div class="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6 text-[13px] custom-scrollbar">
    <!-- Section: YOUR SPACE -->
    <div class="space-y-1">
      <div class="px-2 py-1 text-[10.5px] font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
        Your space
      </div>

      <!-- Dashboard Root Link -->
      <button
        onclick={() => {
          workspaceStore.selectOrg(null);
          workspaceStore.selectFolder(null);
        }}
        class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-semibold {workspaceStore.activeOrgId === null && workspaceStore.activeDiagramId === null && workspaceStore.activeFolderId === null ? 'bg-white/15 text-white border border-white/20 shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'}"
      >
        <LayoutDashboard size={16} class={workspaceStore.activeOrgId === null && workspaceStore.activeDiagramId === null && workspaceStore.activeFolderId === null ? 'text-white' : 'text-white/50'} />
        <span>Dashboard</span>
      </button>

      <!-- Personal Expandable Folder Tree -->
      <div class="space-y-0.5">
        <div class="group relative flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 font-semibold cursor-pointer">
          <button
            onclick={() => (personalExpanded = !personalExpanded)}
            class="flex items-center gap-2 flex-1 text-left"
          >
            {#if personalExpanded}
              <ChevronDown size={15} class="text-white/50" />
            {:else}
              <ChevronRight size={15} class="text-white/50" />
            {/if}
            <User size={16} class="text-amber-400 shrink-0" />
            <span>Personal</span>
          </button>

          <button
            onclick={(e) => {
              e.stopPropagation();
              showPersonalMenu = !showPersonalMenu;
            }}
            class="p-1 rounded text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={14} />
          </button>

          {#if showPersonalMenu}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div
              role="presentation"
              class="absolute right-2 top-full mt-1 w-40 rounded-xl bg-[#141620] border border-white/20 shadow-2xl py-1.5 z-30 text-[11px]"
              onclick={(e) => e.stopPropagation()}
            >
              <button
                onclick={() => {
                  showPersonalMenu = false;
                  onCreateDiagram('Untitled Diagram', null);
                }}
                class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-white"
              >
                <span>New diagram</span>
                <Plus size={12} />
              </button>
              <button
                onclick={() => {
                  showPersonalMenu = false;
                  openNewSubFolderInput(null);
                }}
                class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-white"
              >
                <span>New folder</span>
                <FolderIcon size={12} />
              </button>
            </div>
          {/if}
        </div>

        <!-- Sub Folders & Diagrams Tree (Recursive) -->
        {#if personalExpanded}
          <div class="pl-4 space-y-0.5 border-l border-white/10 ml-5 my-1">
            {#if isCreatingFolder && targetParentFolderId === null}
              <div class="px-2 py-1.5 flex items-center gap-1">
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  type="text"
                  placeholder="Folder name..."
                  bind:value={newFolderName}
                  onkeydown={(e) => e.key === 'Enter' && handleCreateFolderSubmit()}
                  class="flex-1 h-6 px-2 text-[11px] rounded-md bg-[#161824] border border-white/30 text-white focus:outline-none"
                  autofocus
                />
                <button
                  onclick={handleCreateFolderSubmit}
                  class="px-2 py-0.5 text-[10px] rounded bg-white text-black font-semibold"
                >
                  Add
                </button>
              </div>
            {/if}

            <!-- Top-level Root Folders under Personal -->
            {#each workspaceStore.getChildFolders(null, null) as folder (folder.id)}
              {@render folderTreeItem(folder, 1, null)}
            {/each}

            <!-- Root Diagrams under Personal -->
            {#each workspaceStore.getFolderDiagrams(null, null) as diagram (diagram.id)}
              {@const isActive = workspaceStore.activeDiagramId === diagram.id}
              <div
                class="group flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition-colors {isActive ? 'bg-white/15 text-white font-bold border-l-2 border-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}"
              >
                <button
                  onclick={() => workspaceStore.selectDiagram(diagram.id)}
                  class="flex items-center gap-1.5 flex-1 truncate text-left"
                >
                  <FileText size={13} class="shrink-0 {isActive ? 'text-white' : 'text-white/40'}" />
                  <span class="truncate">{diagram.title}</span>
                </button>
                <button
                  onclick={() => onDeleteDiagram(diagram.id)}
                  title="Delete Diagram"
                  class="hidden group-hover:block p-0.5 rounded text-white/40 hover:text-red-400"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Shared with you -->
      <button class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors font-medium">
        <Share2 size={16} class="text-white/50" />
        <span>Shared with you</span>
      </button>

      <!-- Trash Bin -->
      <button
        onclick={onOpenTrash}
        class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors font-medium"
      >
        <div class="flex items-center gap-2.5">
          <Trash2 size={16} class="text-white/50" />
          <span>Trash Bin</span>
        </div>
        {#if workspaceStore.trashedCount > 0}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 font-['IBM_Plex_Mono',monospace]">
            {workspaceStore.trashedCount}
          </span>
        {/if}
      </button>
    </div>

    <!-- Section: FAVORITES -->
    <div class="space-y-2 pt-2 border-t border-white/10">
      <div class="px-2 py-1 text-[10.5px] font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
        Favorites
      </div>

      {#if favoriteDiagrams.length === 0}
        <div class="p-4 rounded-xl border border-dashed border-white/10 bg-[#090A0F] text-center space-y-1 text-white/40">
          <p class="text-[11px] leading-relaxed text-white/40">
            Items you mark with <FavoriteIcon active={true} size={11} class="inline" /> will appear here for quick access.
          </p>
        </div>
      {:else}
        <div class="space-y-0.5">
          {#each favoriteDiagrams as diagram (diagram.id)}
            <button
              onclick={() => workspaceStore.selectDiagram(diagram.id)}
              class="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors truncate text-xs font-medium"
            >
              <FavoriteIcon active={true} size={13} />
              <span class="truncate">{diagram.title}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Section: TEAM SPACES (Matching Reference Screenshots) -->
    <div class="space-y-2 pt-2 border-t border-white/10">
      <div class="px-2 py-1 text-[10.5px] font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
        Team spaces
      </div>

      {#each organizations as org (org.id)}
        {@const isActiveOrg = workspaceStore.activeOrgId === org.id}
        <div class="space-y-0.5">
          <div class="flex items-center justify-between px-3 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer group {isActiveOrg ? 'bg-amber-500/15 border border-amber-500/30 text-white shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'}">
            <button
              onclick={() => workspaceStore.selectOrg(org.id)}
              class="flex items-center gap-2 truncate flex-1 text-left cursor-pointer py-0.5"
            >
              <Building2 size={14} class={isActiveOrg ? 'text-amber-400' : 'text-white/40'} />
              <span class="truncate">{org.name}</span>
            </button>
            <button
              onclick={(e) => {
                e.stopPropagation();
                onOpenOrgSettings(org.id, org.name);
              }}
              title="Organization Settings"
              class="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <Settings size={13} />
            </button>
          </div>

          {#if isActiveOrg}
            <div class="pl-4 space-y-0.5 border-l border-amber-500/20 ml-5 my-1">
              <!-- Top-level Root Folders under active Org -->
              {#each workspaceStore.getChildFolders(null, org.id) as folder (folder.id)}
                {@render folderTreeItem(folder, 1, org.id)}
              {/each}

              <!-- Root Diagrams under active Org -->
              {#each workspaceStore.getFolderDiagrams(null, org.id) as diagram (diagram.id)}
                {@const isActive = workspaceStore.activeDiagramId === diagram.id}
                <div
                  class="group flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition-colors {isActive ? 'bg-white/15 text-white font-bold border-l-2 border-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}"
                >
                  <button
                    onclick={() => workspaceStore.selectDiagram(diagram.id)}
                    class="flex items-center gap-1.5 flex-1 truncate text-left"
                  >
                    <FileText size={13} class="shrink-0 {isActive ? 'text-white' : 'text-white/40'}" />
                    <span class="truncate">{diagram.title}</span>
                  </button>
                  <button
                    onclick={() => onDeleteDiagram(diagram.id)}
                    title="Delete Diagram"
                    class="hidden group-hover:block p-0.5 rounded text-white/40 hover:text-red-400"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              {/each}

              {#if workspaceStore.getChildFolders(null, org.id).length === 0 && workspaceStore.getFolderDiagrams(null, org.id).length === 0}
                <div class="px-2 py-1.5 text-[11px] text-white/40 italic">
                  No items in this team space.
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}

      <button
        onclick={onOpenCreateOrg}
        class="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
      >
        <Plus size={14} class="text-white/50" />
        <span>Create Organization</span>
      </button>
    </div>
  </div>

  <!-- Bottom User Profile Pill (Opens Settings Modal directly) -->
  <div class="p-3 border-t border-white/10 shrink-0">
    <button
      onclick={onOpenSettings}
      title="Open Settings"
      class="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/15 hover:border-white/30 hover:bg-white/10 transition-all text-left group cursor-pointer"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
          {profileStore.initials}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors leading-tight">
            {profileStore.displayName}
          </p>
          <span class="text-[10.5px] text-amber-400/80 block font-medium font-['Instrument_Sans',sans-serif] mt-0.5 truncate">
            {profileStore.headline || 'Diagram Architect'}
          </span>
        </div>
      </div>
      <Settings size={16} class="text-white/50 group-hover:text-white transition-colors shrink-0 ml-1" />
    </button>
  </div>
</div>
