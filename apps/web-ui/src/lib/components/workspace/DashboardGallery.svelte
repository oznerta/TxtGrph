<script lang="ts">
  import type { Diagram, Folder } from '@txtgrph/core';
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
    Clock
  } from 'lucide-svelte';

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
    onDeleteDiagram?: (id: string) => void;
    onDeleteFolder?: (id: string) => void;
    onDuplicateDiagrams?: (ids: string[]) => void;
    onMoveDiagrams?: (ids: string[], targetFolderId: string | null) => void;
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
    onDeleteDiagram = () => {},
    onDeleteFolder = () => {},
    onDuplicateDiagrams = () => {},
    onMoveDiagrams = () => {},
  }: Props = $props();

  let searchQuery = $state('');
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

  // Derived Subfolders inside current active folder
  let subFolders = $derived.by(() => {
    return folders.filter((f) => f.parentId === activeFolderId && !f.isDeleted);
  });

  // Derived Top 4 Recently Opened Diagrams for Dashboard Landing
  let recentDiagrams = $derived.by(() => {
    return [...diagrams]
      .filter((d) => !d.isDeleted)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  });

  // Derived Diagrams inside current active folder
  let filteredDiagrams = $derived.by(() => {
    let result = diagrams.filter((d) => !d.isDeleted);

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
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (d) => d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
      );
    }

    return result;
  });

  // Context Menu State for Folder Cards
  let activeMenuFolderId = $state<string | null>(null);

  function formatTimeAgo(isoDateStr: string) {
    if (!isoDateStr) return '';
    const date = new Date(isoDateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'recently';
  }

  function toggleSelectDiagram(id: string, e?: Event) {
    if (e) e.stopPropagation();
    const next = new Set(selectedDiagramIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedDiagramIds = next;
  }

  function toggleSelectFolder(id: string, e?: Event) {
    if (e) e.stopPropagation();
    const next = new Set(selectedFolderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedFolderIds = next;
  }

  function selectAllItems() {
    const totalAvailable = subFolders.length + filteredDiagrams.length;
    if (totalSelectedCount === totalAvailable && totalAvailable > 0) {
      selectedDiagramIds = new Set();
      selectedFolderIds = new Set();
    } else {
      selectedDiagramIds = new Set(filteredDiagrams.map((d) => d.id));
      selectedFolderIds = new Set(subFolders.map((f) => f.id));
    }
  }

  function deleteSelectedItems() {
    selectedDiagramIds.forEach((id) => onDeleteDiagram(id));
    selectedFolderIds.forEach((id) => onDeleteFolder(id));
    clearSelection();
  }

  function duplicateSelectedDiagrams() {
    onDuplicateDiagrams(Array.from(selectedDiagramIds));
    clearSelection();
  }

  function handleConfirmMove(targetFolderId: string | null) {
    onMoveDiagrams(Array.from(selectedDiagramIds), targetFolderId);
    clearSelection();
  }

  function clearSelection() {
    selectedDiagramIds = new Set();
    selectedFolderIds = new Set();
  }
</script>

<svelte:window onclick={() => (activeMenuFolderId = null)} />

<div class="flex-1 min-h-0 flex flex-col overflow-y-auto bg-[var(--color-surface-app)] p-6 space-y-6 select-none relative">
  <!-- Top Navigation Breadcrumb Bar when inside a folder -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      {#if !sidebarOpen}
        <button
          onclick={onToggleSidebar}
          title="Open Sidebar"
          class="p-2 rounded-lg bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface-subtle)] transition-colors shrink-0 shadow-sm"
        >
          <Menu size={18} />
        </button>
      {/if}

      {#if activeFolderId && currentFolder}
        <button
          onclick={() => onSelectFolder(currentFolder.parentId)}
          class="p-1.5 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          title="Back to parent folder"
        >
          <ArrowLeft size={16} />
        </button>
      {/if}

      <div class="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 flex-wrap">
        <button
          onclick={() => onSelectFolder(null)}
          class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Personal files
        </button>
        {#each folderBreadcrumbs as crumb, i (crumb.id)}
          <span class="text-[var(--color-text-tertiary)]">/</span>
          {#if i === folderBreadcrumbs.length - 1}
            <span class="text-[var(--color-text-primary)] font-bold">{crumb.name}</span>
          {:else}
            <button
              onclick={() => onSelectFolder(crumb.id)}
              class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {crumb.name}
            </button>
          {/if}
        {/each}
      </div>
    </div>
  </div>

  <!-- Full-Width Top Search Bar (Matching Reference Layout) -->
  <div class="relative w-full">
    <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search"
      class="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] shadow-sm"
    />
  </div>

  <!-- Dashboard Hero Section: Recently Opened Diagrams (Compact List Layout) -->
  {#if !activeFolderId && !searchQuery.trim() && recentDiagrams.length > 0 && filterScope === 'all'}
    <div class="space-y-2.5 pb-3 border-b border-white/10 font-['Instrument_Sans',sans-serif]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Clock size={15} class="text-amber-400" />
          <h2 class="text-xs font-bold text-white uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
            Recently Opened
          </h2>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        {#each recentDiagrams as diagram (diagram.id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => onSelectDiagram(diagram.id)}
            onkeydown={(e) => e.key === 'Enter' && onSelectDiagram(diagram.id)}
            class="group flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#0F1117] hover:border-white/20 hover:bg-white/[0.03] transition-all cursor-pointer select-none"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <FileText size={14} />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                  {diagram.title || 'Untitled diagram'}
                </div>
                <div class="text-[10.5px] text-white/40 font-['IBM_Plex_Mono',monospace]">
                  Opened {formatTimeAgo(diagram.updatedAt)}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(diagram.id);
                }}
                title={favoriteIds.has(diagram.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                class="p-1.5 rounded-lg text-white/40 hover:text-amber-400 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <FavoriteIcon active={favoriteIds.has(diagram.id)} size={13} />
              </button>

              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  onShareDiagram(diagram);
                }}
                title="Share diagram"
                class="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Share2 size={13} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Action Bar (New diagram, New folder, Filters, Grid/List Toggles) -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
    <!-- Left: New Diagram & New Folder Buttons -->
    <div class="flex items-center gap-3">
      <div class="inline-flex rounded-xl shadow-md border border-white/20 overflow-hidden bg-white text-black">
        <button
          onclick={() => onCreateDiagram(activeFolderId)}
          class="px-4 py-2 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 border-r border-slate-300 cursor-pointer"
        >
          <Plus class="w-4 h-4 text-black stroke-[3]" />
          <span>New diagram</span>
        </button>
        <button
          onclick={onOpenAiModal}
          title="Create with AI Assistant"
          class="px-2.5 py-2 hover:bg-slate-200 text-black transition-colors cursor-pointer"
        >
          <ChevronDown class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- New Folder Button (Matching Homepage Styling) -->
      <button
        onclick={() => onCreateFolder(activeFolderId)}
        class="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
      >
        <FolderPlus class="w-4 h-4 text-white/70" />
        <span>New folder</span>
      </button>
    </div>

    <!-- Right Controls: Scope, Sort, View Toggles -->
    <div class="flex items-center gap-3">
      <!-- Scope Filter Select -->
      <div class="w-36">
        <CustomSelect
          options={scopeOptions}
          bind:value={filterScope}
        />
      </div>

      <!-- Sort Select -->
      <div class="w-36">
        <CustomSelect
          options={sortOptions}
          bind:value={sortOption}
        />
      </div>

      <!-- View Toggle -->
      <div class="flex items-center bg-[var(--color-surface-subtle)] p-0.5 rounded-lg border border-[var(--color-border-default)]">
        <button
          onclick={() => (viewMode = 'grid')}
          title="Grid View"
          class="p-1.5 rounded-md transition-colors {viewMode === 'grid' ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}"
        >
          <LayoutGrid class="w-4 h-4" />
        </button>
        <button
          onclick={() => (viewMode = 'list')}
          title="List View"
          class="p-1.5 rounded-md transition-colors {viewMode === 'list' ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}"
        >
          <List class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Folders Section (Matching Screenshot Reference) -->
  {#if subFolders.length > 0}
    <div class="space-y-3">
      <h3 class="text-xs font-semibold text-[var(--color-text-secondary)]">Folders</h3>

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
              class="group cursor-pointer rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 hover:border-[var(--color-brass)] hover:shadow-md transition-all duration-200 flex items-center justify-between relative {isFolderSelected ? 'border-indigo-500 bg-indigo-500/10' : ''}"
            >
              <!-- Checkbox Overlay for Folder Multi-Select -->
              <button
                onclick={(e) => toggleSelectFolder(folder.id, e)}
                class="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity {isFolderSelected ? 'opacity-100 text-indigo-400' : ''}"
                title="Select folder"
              >
                {#if isFolderSelected}
                  <CheckSquare size={16} class="text-indigo-400 fill-indigo-400/20" />
                {:else}
                  <Square size={16} />
                {/if}
              </button>

              <div class="flex items-center gap-3 min-w-0 pl-5">
                <div class="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] group-hover:text-[var(--color-brass-text)] transition-colors">
                  <FolderIcon size={20} />
                </div>
                <div class="min-w-0 truncate">
                  <h4 class="font-semibold text-xs text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-brass-text)] transition-colors">
                    {folder.name}
                  </h4>
                  <p class="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-mono">
                    {folderDiagramCount} {folderDiagramCount === 1 ? 'diagram' : 'diagrams'}
                  </p>
                </div>
              </div>

              <!-- Options Popup Menu -->
              <div class="relative shrink-0">
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    activeMenuFolderId = activeMenuFolderId === folder.id ? null : folder.id;
                  }}
                  class="p-1 rounded-md hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical size={14} />
                </button>

                {#if activeMenuFolderId === folder.id}
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <div
                    role="presentation"
                    class="absolute right-0 top-full mt-1 w-36 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-xl py-1 z-30 text-[11px]"
                    onclick={(e) => e.stopPropagation()}
                  >
                    <button
                      onclick={() => {
                        activeMenuFolderId = null;
                        onSelectFolder(folder.id);
                      }}
                      class="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)]"
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
        <div class="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-surface-card)] text-xs">
          <table class="w-full text-left">
            <thead class="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-medium border-b border-[var(--color-border-default)]">
              <tr>
                <th class="py-2.5 px-4 w-10">
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
                    class="rounded bg-slate-800 border-slate-700"
                  />
                </th>
                <th class="py-2.5 px-4">Name</th>
                <th class="py-2.5 px-4">Last modified</th>
                <th class="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-default)]">
              {#each subFolders as folder (folder.id)}
                {@const isFolderSelected = selectedFolderIds.has(folder.id)}
                <tr
                  onclick={() => onSelectFolder(folder.id)}
                  class="hover:bg-[var(--color-surface-subtle)]/50 cursor-pointer transition-colors {isFolderSelected ? 'bg-indigo-500/10' : ''}"
                >
                  <td class="py-2.5 px-4 w-10" onclick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isFolderSelected}
                      onchange={(e) => toggleSelectFolder(folder.id, e)}
                      class="rounded bg-slate-800 border-slate-700"
                    />
                  </td>
                  <td class="py-2.5 px-4 font-semibold text-[var(--color-text-primary)] flex items-center gap-2.5">
                    <FolderIcon size={16} class="text-[var(--color-text-muted)]" />
                    <span>{folder.name}</span>
                  </td>
                  <td class="py-2.5 px-4 text-[var(--color-text-muted)]">Recently</td>
                  <td class="py-2.5 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                    <button
                      onclick={() => onDeleteFolder(folder.id)}
                      class="text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Files Section -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-semibold text-[var(--color-text-secondary)]">Files</h3>
    </div>

    {#if filteredDiagrams.length === 0}
      <div class="p-12 text-center border border-dashed border-[var(--color-border-default)] rounded-xl space-y-3 bg-[var(--color-surface-card)]">
        <div class="w-12 h-12 mx-auto rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-text-muted)]">
          <FolderOpen class="w-6 h-6" />
        </div>
        <div class="text-sm font-semibold text-[var(--color-text-primary)]">No diagrams found</div>
        <p class="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
          {searchQuery ? 'No diagrams match your search query.' : 'Get started by creating your first Mermaid diagram.'}
        </p>
        <button
          onclick={() => onCreateDiagram(activeFolderId)}
          class="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--color-brass)] text-white hover:opacity-90 transition-opacity"
        >
          + Create Diagram
        </button>
      </div>
    {:else if viewMode === 'grid'}
      <!-- Grid View -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {#each filteredDiagrams as diagram (diagram.id)}
          {@const isSelected = selectedDiagramIds.has(diagram.id)}
          <div class="relative group">
            <!-- Multi-select Checkbox Overlay -->
            <button
              onclick={(e) => toggleSelectDiagram(diagram.id, e)}
              class="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity {isSelected ? 'opacity-100 text-indigo-400' : ''}"
              title="Select diagram"
            >
              {#if isSelected}
                <CheckSquare size={16} class="text-indigo-400 fill-indigo-400/20" />
              {:else}
                <Square size={16} />
              {/if}
            </button>

            <DiagramCard
              {diagram}
              isFavorite={favoriteIds.has(diagram.id)}
              onSelect={onSelectDiagram}
              onToggleFavorite={onToggleFavorite}
              onShare={onShareDiagram}
              onDelete={onDeleteDiagram}
            />
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div class="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-surface-card)]">
        <table class="w-full text-left text-xs">
          <thead class="bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-medium border-b border-[var(--color-border-default)]">
            <tr>
              <th class="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedDiagramIds.size === filteredDiagrams.length && filteredDiagrams.length > 0}
                  onchange={() => {
                    if (selectedDiagramIds.size === filteredDiagrams.length) {
                      selectedDiagramIds = new Set();
                    } else {
                      selectedDiagramIds = new Set(filteredDiagrams.map((d) => d.id));
                    }
                  }}
                  class="rounded bg-slate-800 border-slate-700"
                />
              </th>
              <th class="py-3 px-4">Title</th>
              <th class="py-3 px-4">Created</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border-default)]">
            {#each filteredDiagrams as diagram (diagram.id)}
              {@const isSelected = selectedDiagramIds.has(diagram.id)}
              <tr
                onclick={() => onSelectDiagram(diagram.id)}
                class="hover:bg-[var(--color-surface-subtle)]/50 cursor-pointer transition-colors {isSelected ? 'bg-indigo-500/10' : ''}"
              >
                <td class="py-3 px-4" onclick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onchange={(e) => toggleSelectDiagram(diagram.id, e)}
                    class="rounded bg-slate-800 border-slate-700"
                  />
                </td>
                <td class="py-3 px-4 font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <FileText class="w-4 h-4 text-[var(--color-brass-text)] shrink-0" />
                  <span>{diagram.title || 'Untitled diagram'}</span>
                </td>
                <td class="py-3 px-4 text-[var(--color-text-muted)]">
                  {new Date(diagram.createdAt).toLocaleDateString()}
                </td>
                <td class="py-3 px-4">
                  {#if diagram.isShared}
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">Shared</span>
                  {:else}
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">Private</span>
                  {/if}
                </td>
                <td class="py-3 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                  <button
                    onclick={() => onShareDiagram(diagram)}
                    class="px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    Share
                  </button>
                  <button
                    onclick={() => onDeleteDiagram(diagram.id)}
                    class="px-2 py-1 text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Bottom Floating Multi-Selection Batch Action Bar (Folders + Diagrams) -->
  {#if totalSelectedCount > 0}
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#252636] border border-slate-700/80 shadow-2xl rounded-2xl px-5 py-2 flex items-center gap-4 text-xs text-white animate-in slide-in-from-bottom-4 duration-200">
      <div class="font-semibold text-slate-200 flex items-center gap-2">
        <span>{totalSelectedCount} selected</span>
        <button
          onclick={selectAllItems}
          class="text-indigo-400 hover:underline text-[11px] font-medium"
        >
          {totalSelectedCount === (subFolders.length + filteredDiagrams.length) ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div class="h-4 w-px bg-slate-700"></div>

      <!-- Action Buttons with Tooltips -->
      <div class="flex items-center gap-1">
        <!-- Export Button (Diagrams only) -->
        {#if selectedDiagramIds.size > 0}
          <button
            onclick={() => (exportModalOpen = true)}
            title="Export Diagrams"
            class="p-2 rounded-xl hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors relative group"
          >
            <Upload size={16} />
          </button>
        {/if}

        <!-- Duplicate Button (Diagrams only) -->
        {#if selectedDiagramIds.size > 0}
          <button
            onclick={duplicateSelectedDiagrams}
            title="Duplicate Diagrams"
            class="p-2 rounded-xl hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors relative group"
          >
            <Copy size={16} />
          </button>
        {/if}

        <!-- Move Button -->
        <button
          onclick={() => (moveModalOpen = true)}
          title="Move Selected Items to Folder"
          class="p-2 rounded-xl hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors relative group"
        >
          <FolderInput size={16} />
        </button>

        <!-- Delete Button (Folders & Diagrams) -->
        <button
          onclick={deleteSelectedItems}
          title="Delete Selected Items"
          class="p-2 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors relative group"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div class="h-4 w-px bg-slate-700"></div>

      <!-- Close Selection Button -->
      <button
        onclick={clearSelection}
        title="Cancel Selection"
        class="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  {/if}
</div>

<!-- Multi Export Modal -->
<MultiExportModal
  open={exportModalOpen}
  {diagrams}
  selectedIds={selectedDiagramIds}
  onclose={() => (exportModalOpen = false)}
/>

<!-- Multi Move Modal -->
<MultiMoveModal
  open={moveModalOpen}
  {folders}
  selectedCount={totalSelectedCount}
  onMove={handleConfirmMove}
  onclose={() => (moveModalOpen = false)}
/>
