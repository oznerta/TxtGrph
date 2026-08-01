<script lang="ts">
  import type { Diagram, Folder } from '$lib/stores/workspaceStore.svelte';
  import DiagramCard from './DiagramCard.svelte';
  import MultiExportModal from './MultiExportModal.svelte';
  import MultiMoveModal from './MultiMoveModal.svelte';
  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';
  import FavoriteIcon from '$lib/components/ui/FavoriteIcon.svelte';
  import {
    Plus,
    LayoutGrid,
    List,
    Search,
    ChevronDown,
    FolderOpen,
    Folder as FolderIcon,
    FolderPlus,
    FileText,
    Menu,
    ArrowLeft,
    MoreVertical,
    CheckSquare,
    Square,
    Trash2,
    Share2,
    Upload,
    Copy,
    Heart,
    Edit3,
    FolderInput,
    X,
    Clock,
    Sparkles,
    Building2,
    User,
    Users
  } from 'lucide-svelte';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';

  const scopeOptions: SelectOption[] = [
    { value: 'all', label: 'All files' },
    { value: 'recents', label: 'Recently opened' },
    { value: 'favorites', label: 'Favorites' },
    { value: 'shared', label: 'Shared with you' }
  ];

  const sortOptions: SelectOption[] = [
    { value: 'modified', label: 'Last modified' },
    { value: 'name', label: 'Name' }
  ];

  interface Props {
    diagrams?: Diagram[];
    folders?: Folder[];
    favoriteIds?: Set<string>;
    activeFolderId?: string | null;
    sidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    onSelectDiagram?: (id: string) => void;
    onSelectFolder?: (id: string | null) => void;
    onCreateDiagram?: (folderId?: string | null) => void;
    onCreateFolder?: (folderId?: string | null) => void;
    onOpenAiModal?: () => void;
    onToggleFavorite?: (id: string) => void;
    onShareDiagram?: (diagram: Diagram) => void;
    onRenameFolder?: (id: string, currentName: string) => void;
    onRenameDiagram?: (id: string, currentTitle: string) => void;
    onDeleteDiagram?: (id: string) => void;
    onDeleteFolder?: (id: string) => void;
    onDuplicateDiagrams?: (ids: string[]) => void;
    onMoveDiagrams?: (ids: string[], targetFolderId: string | null) => void;
    onMoveFolders?: (ids: string[], targetFolderId: string | null) => void;
    onShareFolder?: (folder: Folder) => void;
  }

  let {
    diagrams = [] as Diagram[],
    folders = [] as Folder[],
    favoriteIds = new Set<string>(),
    activeFolderId = null as string | null,
    sidebarOpen = true,
    onToggleSidebar = () => {},
    onSelectDiagram = () => {},
    onSelectFolder = () => {},
    onCreateDiagram = () => {},
    onCreateFolder = () => {},
    onOpenAiModal = () => {},
    onToggleFavorite = () => {},
    onShareDiagram = () => {},
    onRenameFolder = () => {},
    onRenameDiagram = () => {},
    onDeleteDiagram = () => {},
    onDeleteFolder = () => {},
    onDuplicateDiagrams = () => {},
    onMoveDiagrams = () => {},
    onMoveFolders = () => {},
    onShareFolder = () => {},
  }: Props = $props();

  let searchQuery = $state('');
  let activeOrg = $derived.by(() => {
    return workspaceStore.organizations.find((o) => o.id === workspaceStore.activeOrgId) || null;
  });
  let viewMode = $state<'grid' | 'list'>('grid');
  let filterScope = $state<'all' | 'recents' | 'favorites' | 'shared'>('all');
  let sortOption = $state<'modified' | 'name'>('modified');

  // Multi-Selection State (Folders + Diagrams)
  let selectedDiagramIds = $state<Set<string>>(new Set());
  let selectedFolderIds = $state<Set<string>>(new Set());

  let totalSelectedCount = $derived(selectedDiagramIds.size + selectedFolderIds.size);

  // Multi-Action Modals State
  let exportModalOpen = $state(false);
  let moveModalOpen = $state(false);

  // Current Active Folder Object
  let currentFolder = $derived.by(() => {
    if (!activeFolderId) return null;
    return folders.find((f) => f.id === activeFolderId && !f.isDeleted) || null;
  });

  // Derived Full Breadcrumb Chain for Nested Folders
  let folderBreadcrumbs = $derived.by(() => {
    const crumbs: Folder[] = [];
    let currentId = activeFolderId;

    while (currentId) {
      const f = folders.find((item) => item.id === currentId && !item.isDeleted);
      if (f) {
        crumbs.unshift(f);
        currentId = f.parentId;
      } else {
        break;
      }
    }

    return crumbs;
  });

  // Derived Subfolders inside current active folder and active space
  let subFolders = $derived.by(() => {
    const orgId = workspaceStore.activeOrgId;
    return folders.filter(
      (f) =>
        f.parentId === activeFolderId &&
        !f.isDeleted &&
        (orgId ? f.organizationId === orgId : !f.organizationId)
    );
  });

  // Derived Diagrams inside current active folder and active space
  let filteredDiagrams = $derived.by(() => {
    const orgId = workspaceStore.activeOrgId;
    let result = diagrams.filter(
      (d) =>
        !d.isDeleted &&
        (orgId ? d.organizationId === orgId : !d.organizationId)
    );

    if (filterScope === 'recents') {
      result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (filterScope === 'favorites') {
      result = result.filter((d) => favoriteIds.has(d.id));
    } else if (filterScope === 'shared') {
      result = result.filter((d) => d.isShared);
    } else {
      result = result.filter((d) => d.folderId === activeFolderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
    }

    if (sortOption === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  });

  // Multi-Selection Helper Functions
  function toggleSelectDiagram(id: string, e: MouseEvent) {
    e.stopPropagation();
    const next = new Set(selectedDiagramIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedDiagramIds = next;
  }

  function toggleSelectFolder(id: string, e: MouseEvent) {
    e.stopPropagation();
    const next = new Set(selectedFolderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedFolderIds = next;
  }

  function selectAllDiagrams() {
    if (selectedDiagramIds.size === filteredDiagrams.length) {
      selectedDiagramIds = new Set();
    } else {
      selectedDiagramIds = new Set(filteredDiagrams.map((d) => d.id));
    }
  }

  function formatTimeAgo(isoString: string): string {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  // Active Context Menu for Folder Cards
  let activeMenuFolderId = $state<string | null>(null);

  // Multi-Action Handlers
  function handleMultiDelete() {
    for (const id of selectedDiagramIds) {
      onDeleteDiagram(id);
    }
    for (const id of selectedFolderIds) {
      onDeleteFolder(id);
    }
    clearSelection();
  }

  function handleMultiDuplicate() {
    onDuplicateDiagrams(Array.from(selectedDiagramIds));
    clearSelection();
  }

  function handleConfirmMove(targetFolderId: string | null) {
    if (selectedDiagramIds.size > 0) {
      onMoveDiagrams(Array.from(selectedDiagramIds), targetFolderId);
    }
    if (selectedFolderIds.size > 0) {
      onMoveFolders(Array.from(selectedFolderIds), targetFolderId);
    }
    clearSelection();
  }

  function clearSelection() {
    selectedDiagramIds = new Set();
    selectedFolderIds = new Set();
  }
</script>

<svelte:window onclick={() => (activeMenuFolderId = null)} />

<div class="flex-1 min-h-0 flex flex-col overflow-y-auto bg-[#090A0F] p-6 sm:p-8 space-y-6 select-none relative font-['Instrument_Sans',sans-serif]">
  <!-- Top Hero Header Bar: Breadcrumb + Stats + Action Buttons -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
    <!-- Left: Navigation Breadcrumb & Stats -->
    <div class="flex items-center gap-3">
      {#if !sidebarOpen}
        <button
          onclick={onToggleSidebar}
          title="Open Sidebar"
          class="p-2 rounded-xl bg-white/5 text-white/80 border border-white/15 hover:bg-white/10 transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <Menu size={18} />
        </button>
      {/if}

      {#if activeFolderId && currentFolder}
        <button
          onclick={() => onSelectFolder(currentFolder.parentId)}
          class="p-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="Back to parent folder"
        >
          <ArrowLeft size={16} />
        </button>
      {/if}

      <div>
        <div class="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap tracking-tight">
          <button
            onclick={() => onSelectFolder(null)}
            class="text-white/60 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {#if activeOrg}
              <Building2 size={16} class="text-amber-400" />
              <span>{activeOrg.name}</span>
            {:else}
              <User size={16} class="text-white/40" />
              <span>Personal space</span>
            {/if}
          </button>
          {#each folderBreadcrumbs as crumb, i (crumb.id)}
            <span class="text-white/30">/</span>
            {#if i === folderBreadcrumbs.length - 1}
              <span class="text-white font-bold inline-flex items-center gap-1.5">
                <span>{crumb.name}</span>
                <button
                  onclick={() => onRenameFolder(crumb.id, crumb.name)}
                  title="Rename folder"
                  class="p-1 rounded-lg text-white/40 hover:text-amber-400 hover:bg-white/10 transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onclick={() => {
                    const currentFolder = folders.find((f) => f.id === crumb.id);
                    if (currentFolder) onShareFolder(currentFolder);
                  }}
                  title="Share folder"
                  class="ml-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Share2 size={13} />
                  <span>Share folder</span>
                </button>
              </span>
            {:else}
              <button
                onclick={() => onSelectFolder(crumb.id)}
                class="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                {crumb.name}
              </button>
            {/if}
          {/each}
        </div>
        <p class="text-xs text-white/40 mt-0.5 font-medium font-['IBM_Plex_Mono',monospace]">
          {filteredDiagrams.length} {filteredDiagrams.length === 1 ? 'diagram' : 'diagrams'} · {subFolders.length} {subFolders.length === 1 ? 'folder' : 'folders'}
        </p>
      </div>
    </div>

    <!-- Right: Primary Action Buttons -->
    <div class="flex items-center gap-2.5 shrink-0">
      {#if activeFolderId}
        {@const currentActiveFolder = folders.find((f) => f.id === activeFolderId)}
        {#if currentActiveFolder}
          <button
            onclick={() => onShareFolder(currentActiveFolder)}
            class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Share2 class="w-4 h-4 text-amber-400" />
            <span>Share folder</span>
          </button>
        {/if}
      {/if}

      <div class="inline-flex rounded-xl shadow-lg border border-white/20 overflow-hidden bg-white text-black">
        <button
          onclick={() => onCreateDiagram(activeFolderId)}
          class="px-4 py-2 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 border-r border-slate-300 cursor-pointer btn-premium"
        >
          <Plus class="w-4 h-4 text-black stroke-[3]" />
          <span>New diagram</span>
        </button>
        <button
          onclick={onOpenAiModal}
          title="Create with AI Assistant"
          class="px-3 py-2 hover:bg-slate-200 text-black transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles class="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
          <ChevronDown class="w-3.5 h-3.5 text-black/60" />
        </button>
      </div>

      <button
        onclick={() => onCreateFolder(activeFolderId)}
        class="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
      >
        <FolderPlus class="w-4 h-4 text-white/70" />
        <span>New folder</span>
      </button>
    </div>
  </div>

  <!-- Unified Search & Controls Toolbar -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
    <!-- Search Bar with Shortcut Badge -->
    <div class="relative flex-1 max-w-md">
      <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search diagrams or code content..."
        class="w-full pl-10 pr-9 py-2 text-xs rounded-xl border border-white/15 bg-[#0F1117] text-white placeholder-white/40 focus:outline-none focus:border-white/30 shadow-sm transition-all"
      />
      {#if searchQuery}
        <button
          onclick={() => (searchQuery = '')}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 rounded-md transition-colors"
        >
          <X size={13} />
        </button>
      {/if}
    </div>

    <!-- Filter Scope Pills & View Toggles -->
    <div class="flex items-center gap-3 shrink-0">
      <!-- Scope Filter Dropdown -->
      <div class="w-36">
        <CustomSelect
          options={scopeOptions}
          bind:value={filterScope}
        />
      </div>

      <!-- Sort Options Dropdown -->
      <div class="w-36">
        <CustomSelect
          options={sortOptions}
          bind:value={sortOption}
        />
      </div>

      <!-- Grid vs List View Toggle -->
      <div class="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
        <button
          onclick={() => (viewMode = 'grid')}
          title="Grid View"
          class="p-1.5 rounded-lg transition-colors cursor-pointer {viewMode === 'grid' ? 'bg-white text-black shadow-sm font-bold' : 'text-white/50 hover:text-white'}"
        >
          <LayoutGrid class="w-3.5 h-3.5" />
        </button>
        <button
          onclick={() => (viewMode = 'list')}
          title="List View"
          class="p-1.5 rounded-lg transition-colors cursor-pointer {viewMode === 'list' ? 'bg-white text-black shadow-sm font-bold' : 'text-white/50 hover:text-white'}"
        >
          <List class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>

  <!-- Multi-Selection Action Banner (when items selected) -->
  {#if totalSelectedCount > 0}
    <div class="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-white animate-in fade-in duration-150 shadow-xl">
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
          {totalSelectedCount}
        </div>
        <span class="text-xs font-semibold text-white">
          {totalSelectedCount} {totalSelectedCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>

      <div class="flex items-center gap-2 text-xs">
        {#if selectedDiagramIds.size > 0}
          <button
            onclick={() => (exportModalOpen = true)}
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
          >
            <Upload size={13} /> Export Batch
          </button>
          <button
            onclick={handleMultiDuplicate}
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
          >
            <Copy size={13} /> Duplicate
          </button>
          <button
            onclick={() => (moveModalOpen = true)}
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
          >
            <FolderInput size={13} /> Move
          </button>
        {/if}

        <button
          onclick={handleMultiDelete}
          class="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
        >
          <Trash2 size={13} /> Delete
        </button>

        <button
          onclick={clearSelection}
          class="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          title="Clear selection"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  {/if}

  <!-- Folders Section -->
  {#if subFolders.length > 0}
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
          Folders ({subFolders.length})
        </h3>
      </div>

      {#if viewMode === 'grid'}
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {#each subFolders as folder (folder.id)}
            {@const folderDiagramCount = diagrams.filter(d => d.folderId === folder.id && !d.isDeleted).length}
            {@const isFolderSelected = selectedFolderIds.has(folder.id)}
            <div
              role="button"
              tabindex="0"
              onclick={() => onSelectFolder(folder.id)}
              onkeydown={(e) => e.key === 'Enter' && onSelectFolder(folder.id)}
              class="group cursor-pointer rounded-2xl border border-white/15 bg-[#0F1117] p-4 hover:border-amber-500/50 hover:shadow-xl transition-all duration-200 flex items-center justify-between hover:-translate-y-0.5 {isFolderSelected ? 'border-amber-500 bg-amber-500/10' : ''} {activeMenuFolderId === folder.id ? 'z-[50] relative' : 'relative z-10'}"
            >
              <!-- Checkbox Overlay for Folder Multi-Select -->
              <button
                onclick={(e) => toggleSelectFolder(folder.id, e)}
                class="absolute top-3 left-3 z-20 p-1.5 rounded-lg bg-black/80 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity {isFolderSelected ? 'opacity-100 text-amber-400' : ''}"
                title="Select folder"
              >
                {#if isFolderSelected}
                  <CheckSquare size={15} class="text-amber-400 fill-amber-400/20" />
                {:else}
                  <Square size={15} />
                {/if}
              </button>

              <div class="flex items-center gap-3.5 min-w-0 pl-6">
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FolderIcon size={18} />
                </div>
                <div class="min-w-0 truncate">
                  <h4 class="font-semibold text-xs text-white truncate group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <span class="truncate">{folder.name}</span>
                    {#if folder.isShared}
                      <span class="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-500/30 shrink-0 font-['IBM_Plex_Mono',monospace]" title="Shared folder">
                        <Users size={10} /> Shared
                      </span>
                    {/if}
                  </h4>
                  <p class="text-[11px] text-white/40 mt-0.5 font-['IBM_Plex_Mono',monospace]">
                    {folderDiagramCount} {folderDiagramCount === 1 ? 'diagram' : 'diagrams'}
                  </p>
                </div>
              </div>

              <!-- Options Popup Menu -->
              <div class="relative shrink-0 flex items-center gap-1">
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    onShareFolder(folder);
                  }}
                  title="Share folder"
                  class="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Share2 size={14} />
                </button>

                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    activeMenuFolderId = activeMenuFolderId === folder.id ? null : folder.id;
                  }}
                  class="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <MoreVertical size={14} />
                </button>

                {#if activeMenuFolderId === folder.id}
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <div
                    role="presentation"
                    class="absolute right-0 top-full mt-1 w-36 rounded-xl bg-[#141620] border border-white/20 shadow-2xl py-1 z-30 text-[11px] font-['Instrument_Sans',sans-serif]"
                    onclick={(e) => e.stopPropagation()}
                  >
                    <button
                      onclick={() => {
                        activeMenuFolderId = null;
                        onRenameFolder(folder.id, folder.name);
                      }}
                      class="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10 text-white"
                    >
                      <Edit3 size={12} class="text-amber-400" /> Rename folder
                    </button>
                    <button
                      onclick={() => {
                        activeMenuFolderId = null;
                        onShareFolder(folder);
                      }}
                      class="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10 text-white"
                    >
                      <Share2 size={12} class="text-sky-400" /> Share folder
                    </button>
                    <button
                      onclick={() => {
                        activeMenuFolderId = null;
                        onSelectFolder(folder.id);
                      }}
                      class="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10 text-white"
                    >
                      <FolderOpen size={12} /> Open
                    </button>
                    <button
                      onclick={() => {
                        activeMenuFolderId = null;
                        onDeleteFolder(folder.id);
                      }}
                      class="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 size={12} /> Delete folder
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- List View for Folders -->
        <div class="border border-white/15 rounded-2xl overflow-hidden bg-[#0F1117] text-xs">
          <table class="w-full text-left">
            <thead class="bg-white/5 text-white/50 font-semibold border-b border-white/10">
              <tr>
                <th class="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedFolderIds.size === subFolders.length && subFolders.length > 0}
                    onchange={() => {
                      if (selectedFolderIds.size === subFolders.length) {
                        selectedFolderIds = new Set();
                      } else {
                        selectedFolderIds = new Set(subFolders.map((f) => f.id));
                      }
                    }}
                    class="rounded bg-black border-white/20"
                  />
                </th>
                <th class="py-3 px-4">Name</th>
                <th class="py-3 px-4">Items</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
              {#each subFolders as folder (folder.id)}
                {@const isFolderSelected = selectedFolderIds.has(folder.id)}
                {@const folderDiagramCount = diagrams.filter(d => d.folderId === folder.id && !d.isDeleted).length}
                <tr
                  onclick={() => onSelectFolder(folder.id)}
                  class="hover:bg-white/5 cursor-pointer transition-colors {isFolderSelected ? 'bg-amber-500/10' : ''}"
                >
                  <td class="py-3 px-4 w-10" onclick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isFolderSelected}
                      onchange={(e) => toggleSelectFolder(folder.id, e as unknown as MouseEvent)}
                      class="rounded bg-black border-white/20"
                    />
                  </td>
                  <td class="py-3 px-4 font-semibold text-white">
                    <div class="flex items-center gap-2.5">
                      <FolderIcon size={16} class="text-amber-400 shrink-0" />
                      <span>{folder.name}</span>
                      {#if folder.isShared}
                        <span class="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-500/30 shrink-0 font-['IBM_Plex_Mono',monospace]" title="Shared folder">
                          <Users size={10} /> Shared
                        </span>
                      {/if}
                    </div>
                  </td>
                  <td class="py-3 px-4 text-white/50 font-['IBM_Plex_Mono',monospace]">
                    {folderDiagramCount} items
                  </td>
                  <td class="py-3 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                    <div class="flex items-center justify-end gap-1">
                      <button
                        onclick={() => onShareFolder(folder)}
                        class="p-1 rounded-lg text-white/40 hover:text-sky-400 hover:bg-white/10 transition-colors"
                        title="Share folder"
                      >
                        <Share2 size={13} />
                      </button>
                      <button
                        onclick={() => onRenameFolder(folder.id, folder.name)}
                        class="p-1 rounded-lg text-white/40 hover:text-amber-400 hover:bg-white/10 transition-colors"
                        title="Rename folder"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onclick={() => onDeleteFolder(folder.id)}
                        class="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="Delete folder"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Files / Diagrams Section -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="text-xs font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
          Diagrams ({filteredDiagrams.length})
        </h3>
      </div>

      {#if filteredDiagrams.length > 0}
        <button
          onclick={selectAllDiagrams}
          class="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          {selectedDiagramIds.size === filteredDiagrams.length ? 'Deselect all' : 'Select all'}
        </button>
      {/if}
    </div>

    {#if filteredDiagrams.length > 0}
      {#if viewMode === 'grid'}
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {#each filteredDiagrams as diagram (diagram.id)}
            {@const isDiagramSelected = selectedDiagramIds.has(diagram.id)}
            <DiagramCard
              {diagram}
              isFavorite={favoriteIds.has(diagram.id)}
              onSelect={() => onSelectDiagram(diagram.id)}
              onToggleFavorite={() => onToggleFavorite(diagram.id)}
              onShare={() => onShareDiagram(diagram)}
              onRename={() => onRenameDiagram(diagram.id, diagram.title)}
              onDelete={(id: string) => onDeleteDiagram(id)}
            />
          {/each}
        </div>
      {:else}
        <!-- List View for Diagrams -->
        <div class="border border-white/15 rounded-2xl overflow-hidden bg-[#0F1117] text-xs">
          <table class="w-full text-left">
            <thead class="bg-white/5 text-white/50 font-semibold border-b border-white/10">
              <tr>
                <th class="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedDiagramIds.size === filteredDiagrams.length && filteredDiagrams.length > 0}
                    onchange={selectAllDiagrams}
                    class="rounded bg-black border-white/20"
                  />
                </th>
                <th class="py-3 px-4">Title</th>
                <th class="py-3 px-4">Last modified</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
              {#each filteredDiagrams as diagram (diagram.id)}
                {@const isDiagramSelected = selectedDiagramIds.has(diagram.id)}
                <tr
                  onclick={() => onSelectDiagram(diagram.id)}
                  class="hover:bg-white/5 cursor-pointer transition-colors {isDiagramSelected ? 'bg-amber-500/10' : ''}"
                >
                  <td class="py-3 px-4 w-10" onclick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isDiagramSelected}
                      onchange={(e) => toggleSelectDiagram(diagram.id, e as unknown as MouseEvent)}
                      class="rounded bg-black border-white/20"
                    />
                  </td>
                  <td class="py-3 px-4 font-semibold text-white">
                    <div class="flex items-center gap-2.5">
                      <FileText size={16} class="text-blue-400" />
                      <span>{diagram.title || 'Untitled diagram'}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-white/50 font-['IBM_Plex_Mono',monospace]">
                    {formatTimeAgo(diagram.updatedAt)}
                  </td>
                  <td class="py-3 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                    <div class="flex items-center justify-end gap-1">
                      <button
                        onclick={() => onRenameDiagram(diagram.id, diagram.title)}
                        class="p-1 rounded-lg text-white/40 hover:text-amber-400 hover:bg-white/10 transition-colors"
                        title="Rename diagram"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onclick={() => onToggleFavorite(diagram.id)}
                        class="p-1 rounded-lg text-white/40 hover:text-amber-400 hover:bg-white/10 transition-colors"
                        title="Toggle Favorite"
                      >
                        <FavoriteIcon active={favoriteIds.has(diagram.id)} size={14} />
                      </button>
                      <button
                        onclick={() => onShareDiagram(diagram)}
                        class="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        title="Share diagram"
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        onclick={() => onDeleteDiagram(diagram.id)}
                        class="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="Delete diagram"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {:else}
      <!-- Empty State -->
      <div class="p-12 rounded-2xl border border-dashed border-white/15 bg-[#0F1117] text-center space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
          <FileText size={22} />
        </div>
        <div class="space-y-1">
          <h4 class="text-sm font-bold text-white">No diagrams found</h4>
          <p class="text-xs text-white/50">
            {searchQuery ? 'No diagrams match your search query.' : 'Get started by creating your first Mermaid diagram.'}
          </p>
        </div>
        <button
          onclick={() => onCreateDiagram(activeFolderId)}
          class="px-4 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer btn-premium"
        >
          <Plus size={14} />
          <span>Create New Diagram</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- Multi-Action Modals -->
  <MultiExportModal
    open={exportModalOpen}
    selectedIds={selectedDiagramIds}
    diagrams={diagrams.filter((d) => selectedDiagramIds.has(d.id))}
    onclose={() => (exportModalOpen = false)}
  />

  <MultiMoveModal
    open={moveModalOpen}
    selectedCount={totalSelectedCount}
    folders={folders.filter((f) => !f.isDeleted)}
    excludedFolderIds={Array.from(selectedFolderIds)}
    onclose={() => (moveModalOpen = false)}
    onMove={handleConfirmMove}
  />
</div>
