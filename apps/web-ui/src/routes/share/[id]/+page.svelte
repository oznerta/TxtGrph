<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import DiagramCanvas from '$lib/components/workspace/DiagramCanvas.svelte';
  import DiagramCard from '$lib/components/workspace/DiagramCard.svelte';
  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';
  import VersionHistoryModal from '$lib/components/workspace/VersionHistoryModal.svelte';
  import CommentsModal from '$lib/components/workspace/CommentsModal.svelte';
  import AdvancedExportModal from '$lib/components/workspace/AdvancedExportModal.svelte';
  import ShareModal from '$lib/components/workspace/ShareModal.svelte';
  import TemplatesModal from '$lib/components/workspace/TemplatesModal.svelte';
  import DiagramThumbnail from '$lib/components/workspace/DiagramThumbnail.svelte';
  import ActivePresenceStack from '$lib/components/workspace/ActivePresenceStack.svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { presenceStore } from '$lib/stores/presenceStore.svelte';
  import {
    Folder as FolderIcon,
    FolderOpen,
    FileText,
    ArrowRight,
    ExternalLink,
    ShieldCheck,
    Lock,
    Edit3,
    MessageSquare,
    Eye,
    ChevronRight,
    ChevronDown,
    Search,
    LayoutGrid,
    List,
    GitFork,
    ArrowLeft,
    LogIn,
    Share2,
    Check,
    User,
    Users,
    LayoutDashboard,
    Menu,
    Settings,
    Heart,
    Plus,
    Sparkles,
    X
  } from 'lucide-svelte';

  const scopeOptions: SelectOption[] = [
    { value: 'all', label: 'All files' },
    { value: 'recents', label: 'Recently opened' },
    { value: 'favorites', label: 'Favorites' }
  ];

  const sortOptions: SelectOption[] = [
    { value: 'modified', label: 'Last modified' },
    { value: 'name', label: 'Name' }
  ];

  let { data }: { data: PageData } = $props();
  const supabase = createSupabaseBrowserClient();

  let code = $state(data.type === 'diagram' ? data.diagram.code : '');
  let title = $state(data.type === 'diagram' ? data.diagram.title : '');
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'unsaved' | 'error'>('saved');

  // Favorites tracking set
  let favoriteIds = $state<Set<string>>(new Set());

  // Gallery view controls & filters
  let searchQuery = $state('');
  let viewMode = $state<'grid' | 'list'>('grid');
  let filterScope = $state<'all' | 'recents' | 'favorites'>('all');
  let sortOption = $state<'modified' | 'name'>('modified');
  let sidebarOpen = $state(true);

  // Expanded Tree Folder IDs
  let expandedFolderIds = $state<Set<string>>(new Set());

  // Modals
  let versionHistoryModalOpen = $state(false);
  let commentsModalOpen = $state(false);
  let advancedExportModalOpen = $state(false);
  let shareModalOpen = $state(false);
  let templatesModalOpen = $state(false);
  let showForkSuccess = $state(false);

  let isEditable = $derived.by(() => data.type === 'diagram' && data.userRole === 'editor');

  // Sync reactive state when route data changes
  $effect(() => {
    if (data.type === 'diagram' && data.diagram) {
      code = data.diagram.code;
      title = data.diagram.title;
    }

    // Auto expand tree folders on load/navigate
    const ids = new Set<string>();
    if (data.rootFolder?.id) ids.add(data.rootFolder.id);
    if (data.folder?.id) ids.add(data.folder.id);
    if (data.currentFolder?.id) ids.add(data.currentFolder.id);
    if (data.type === 'diagram' && (data.diagram as any)?.folderId) ids.add((data.diagram as any).folderId);
    if (data.treeFolders) {
      data.treeFolders.forEach((f: any) => ids.add(f.id));
    }
    expandedFolderIds = ids;
  });

  function toggleFolderExpand(folderId: string) {
    const next = new Set(expandedFolderIds);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    expandedFolderIds = next;
  }

  function toggleFavorite(id: string) {
    const next = new Set(favoriteIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    favoriteIds = next;
  }

  function getChildFolders(parentId: string) {
    if (!data.treeFolders) return [];
    return data.treeFolders.filter((f: any) => f.parentId === parentId);
  }

  function getFolderDiagrams(folderId: string) {
    if (!data.allTreeDiagrams) return [];
    return data.allTreeDiagrams.filter((d: any) => d.folderId === folderId);
  }

  function getSubFolderDiagramCount(folderId: string): number {
    if (!data.allTreeDiagrams) return 0;
    return data.allTreeDiagrams.filter((d: any) => d.folderId === folderId).length;
  }

  let topLevelTreeFolders = $derived.by(() => {
    if (!data.treeFolders || data.treeFolders.length === 0) return [];
    const allIds = new Set(data.treeFolders.map((f: any) => f.id));
    return data.treeFolders.filter((f: any) => !f.parentId || !allIds.has(f.parentId));
  });

  onMount(async () => {
    if (data.type === 'diagram' && data.diagram?.id) {
      const user = data.session?.user;
      const userMeta = user?.user_metadata || {};
      const fullName = userMeta.full_name || userMeta.name || userMeta.display_name || (data.userEmail ? data.userEmail.split('@')[0] : 'Guest Viewer');

      presenceStore.joinDiagram(data.diagram.id, {
        id: data.isLoggedIn && data.userEmail ? data.userEmail : `guest-${Math.random().toString(36).substring(2, 7)}`,
        email: data.userEmail || 'Guest Viewer',
        fullName: fullName,
        avatarUrl: userMeta.avatar_url,
        role: data.userRole === 'editor' ? 'editor' : 'viewer'
      });
    }

    if (data.isLoggedIn && data.type === 'diagram' && data.diagram?.id) {
      try {
        await supabase.rpc('touch_recently_opened_diagram', { p_diagram_id: data.diagram.id });
      } catch (e) {
        // Ignore background touch error
      }
    }
  });

  onDestroy(() => {
    presenceStore.leaveDiagram();
  });

  async function handleCodeChange(newCode: string) {
    code = newCode;
    if (!isEditable || data.type !== 'diagram') return;

    saveStatus = 'saving';
    try {
      const { error } = await supabase
        .from('diagrams')
        .update({ code: newCode, updated_at: new Date().toISOString() })
        .eq('id', data.diagram.id);

      if (error) throw error;
      saveStatus = 'saved';
    } catch (err) {
      console.error('Failed to save diagram code:', err);
      saveStatus = 'idle';
    }
  }

  async function handleTitleChange(newTitle: string) {
    title = newTitle;
    if (!isEditable || data.type !== 'diagram') return;

    try {
      await supabase
        .from('diagrams')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', data.diagram.id);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  }

  async function handleForkDiagram(diagramToFork?: any) {
    const targetDiagram = diagramToFork || (data.type === 'diagram' ? data.diagram : null);
    if (!targetDiagram) return;

    if (!data.isLoggedIn) {
      goto('/auth/login');
      return;
    }

    try {
      const userId = data.session?.user?.id;
      const diagramId = crypto.randomUUID();

      const { error } = await supabase.from('diagrams').insert({
        id: diagramId,
        user_id: userId,
        title: `${targetDiagram.title} (Forked)`,
        code: targetDiagram.code,
        config: targetDiagram.config || {},
        is_shared: false
      });

      if (error) throw error;
      showForkSuccess = true;
      setTimeout(() => (showForkSuccess = false), 3000);
      goto('/workspace');
    } catch (err) {
      console.error('Failed to fork diagram:', err);
    }
  }

  // Filtered and sorted sub-folders and diagrams for gallery view
  let filteredSubFolders = $derived.by(() => {
    if (!data.subFolders) return [];
    let list = data.subFolders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f: any) => f.name.toLowerCase().includes(q));
    }
    return list;
  });

  let sortedFilteredDiagrams = $derived.by(() => {
    if (!data.diagrams) return [];
    let list = data.diagrams;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d: any) => d.title.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q)));
    }

    if (filterScope === 'favorites') {
      list = list.filter((d: any) => favoriteIds.has(d.id));
    }

    return list.slice().sort((a: any, b: any) => {
      if (sortOption === 'name') {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  });
</script>

{#snippet sharedFolderTreeItem(folder: any, depth: number)}
  {@const isExpanded = expandedFolderIds.has(folder.id)}
  {@const subFolders = getChildFolders(folder.id)}
  {@const diagrams = getFolderDiagrams(folder.id)}
  {@const isCurrentFolder = data.type === 'folder' && data.folder?.id === folder.id}

  <div class="space-y-0.5">
    <div class="group relative flex items-center justify-between px-2.5 py-1.5 rounded-full cursor-pointer transition-all {isCurrentFolder ? 'bg-amber-500/15 text-amber-300 border border-amber-500/50 font-bold shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}">
      <a
        href={`/share/${folder.shareToken || folder.id}`}
        onclick={() => toggleFolderExpand(folder.id)}
        class="flex items-center gap-1.5 flex-1 truncate text-left"
      >
        {#if subFolders.length > 0 || diagrams.length > 0}
          {#if isExpanded}
            <ChevronDown size={13} class="shrink-0 text-amber-400" />
            <FolderOpen size={14} class="shrink-0 text-amber-400" />
          {:else}
            <ChevronRight size={13} class="shrink-0 text-amber-400" />
            <FolderIcon size={14} class="shrink-0 text-amber-400" />
          {/if}
        {:else}
          <FolderIcon size={14} class="shrink-0 text-amber-400 ml-4" />
        {/if}
        <span class="truncate font-medium text-xs {isCurrentFolder ? 'text-amber-300 font-bold' : ''}">{folder.name}</span>
        {#if folder.isShared}
          <span class="ml-1 inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-500/30 shrink-0" title="Shared space">
            <Users size={10} />
          </span>
        {/if}
      </a>
    </div>

    {#if isExpanded}
      <div class="pl-3.5 space-y-0.5 border-l border-white/10 ml-2.5 my-0.5">
        {#each subFolders as childFolder (childFolder.id)}
          {@render sharedFolderTreeItem(childFolder, depth + 1)}
        {/each}

        {#each diagrams as diagram (diagram.id)}
          {@const isDiagramActive = data.type === 'diagram' && data.diagram?.id === diagram.id}
          <a
            href={`/share/${diagram.shareToken || diagram.id}`}
            class="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all {isDiagramActive ? 'bg-white/15 text-white font-bold border-l-2 border-amber-400 shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'}"
          >
            <FileText size={13} class="shrink-0 {isDiagramActive ? 'text-amber-400' : 'text-white/40'}" />
            <span class="truncate">{diagram.title}</span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<div class="h-screen w-screen flex bg-[#090A0F] overflow-hidden select-none font-['Instrument_Sans',sans-serif]">
  <!-- Left Navigation Sidebar (100% Dashboard Parity) -->
  {#if sidebarOpen}
    <div class="w-64 shrink-0 h-full border-r border-white/10 bg-[#000000] flex flex-col select-none text-white/80 font-['Instrument_Sans',sans-serif]">
      <!-- Top Sidebar Header with Hamburger & Logo -->
      <div class="h-14 px-4 border-b border-white/10 flex items-center gap-3 shrink-0">
        <button
          onclick={() => (sidebarOpen = !sidebarOpen)}
          title="Toggle Sidebar"
          class="p-1.5 -ml-1 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>

        <a href="/" class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs shadow-sm">
            TG
          </div>
          <span class="font-['Instrument_Sans',sans-serif] text-[16px] font-bold text-white tracking-tight">
            TxtGrph
          </span>
        </a>
      </div>

      <!-- Sidebar Body Navigation Items -->
      <div class="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6 text-[13px] custom-scrollbar">
        <!-- Section: SHARED SPACE -->
        <div class="space-y-1">
          <div class="px-2 py-1 text-[10.5px] font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
            Shared Space
          </div>

          <!-- Dashboard Link -->
          <a
            href={data.isLoggedIn ? '/workspace' : '/'}
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all font-semibold"
          >
            <LayoutDashboard size={16} class="text-white/50" />
            <span>{data.isLoggedIn ? 'My Dashboard' : 'Explore TxtGrph'}</span>
          </a>

          <!-- Public Shared Tree Navigation -->
          <div class="space-y-0.5 pt-1">
            <div class="flex items-center gap-2 px-3 py-2 rounded-xl text-white/80 font-semibold">
              <User size={16} class="text-amber-400 shrink-0" />
              <span class="truncate">{data.rootFolder?.name || 'Public Workspace'}</span>
            </div>

            <!-- Recursive Tree List -->
            <div class="pl-2 pt-0.5">
              {#each topLevelTreeFolders as topFolder (topFolder.id)}
                {@render sharedFolderTreeItem(topFolder, 0)}
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- User Account / Login Footer Card (Matching Dashboard Parity) -->
      <div class="p-3 border-t border-white/10 bg-[#0A0B0E] shrink-0">
        {#if data.isLoggedIn}
          <div class="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-xl bg-amber-500 text-black font-bold text-xs flex items-center justify-center shrink-0">
                {data.userEmail ? data.userEmail.charAt(0).toUpperCase() : 'U'}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-bold text-white truncate">
                  {data.userEmail ? data.userEmail.split('@')[0] : 'User'}
                </p>
                <p class="text-[10px] text-white/50 truncate">
                  {data.userRole === 'editor' ? 'Editor' : 'Viewer'}
                </p>
              </div>
            </div>
            <a
              href="/workspace"
              class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Go to Workspace Settings"
            >
              <Settings size={15} />
            </a>
          </div>
        {:else}
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-center">
            <p class="text-xs text-white/70 font-medium">Want to edit & create diagrams?</p>
            <a
              href="/auth/login"
              class="w-full py-2 px-3 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <LogIn size={14} />
              <span>Log In to TxtGrph</span>
            </a>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Main Workspace Area -->
  <main class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
    {#if data.type === 'folder'}
      <!-- Shared Folder Gallery View (100% Dashboard Gallery Parity - Image 1) -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0A0B0E] text-white">
        <!-- Top Workspace Bar & Breadcrumbs (Image 1 Parity) -->
        <header class="p-6 pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1117] shrink-0">
          <div class="flex items-center gap-3">
            {#if !sidebarOpen}
              <button
                onclick={() => (sidebarOpen = !sidebarOpen)}
                title="Open Sidebar"
                class="p-2 rounded-xl bg-white/5 text-white/80 border border-white/15 hover:bg-white/10 transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <Menu size={18} />
              </button>
            {/if}

            <div>
              <!-- Breadcrumb Title Line -->
              <div class="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap tracking-tight">
                <a
                  href={data.isLoggedIn ? '/workspace' : '/'}
                  class="text-white/60 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <User size={16} class="text-amber-400 shrink-0" />
                  <span>Shared space</span>
                </a>

                <span class="text-white/30">/</span>

                <span class="text-white font-bold">
                  {data.folder.name}
                </span>
              </div>

              <!-- Item Count Subtitle -->
              <p class="text-xs text-white/50 mt-1 font-['IBM_Plex_Mono',monospace]">
                {sortedFilteredDiagrams.length} diagram{sortedFilteredDiagrams.length !== 1 ? 's' : ''} · {filteredSubFolders.length} folder{filteredSubFolders.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <!-- Actions Header Buttons -->
          <div class="flex items-center gap-3 shrink-0">
            {#if showForkSuccess}
              <span class="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-in fade-in">
                <Check size={14} /> Forked to your workspace!
              </span>
            {/if}

            <button
              onclick={() => (shareModalOpen = true)}
              class="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              title="Share folder"
            >
              <Share2 size={14} />
              <span>Share folder</span>
            </button>

            {#if data.allowForking}
              <button
                onclick={() => handleForkDiagram()}
                class="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                title="Fork diagram to your personal account"
              >
                <GitFork size={14} />
                <span>Fork to My Workspace</span>
              </button>
            {/if}

            {#if !data.isLoggedIn}
              <a
                href="/auth/login"
                class="px-4 py-2 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <LogIn size={14} />
                <span>Log In / Sign Up</span>
              </a>
            {/if}
          </div>
        </header>

        <!-- Gallery Controls & Search Toolbar (Image 1 Parity) -->
        <div class="px-6 pt-5 pb-2 space-y-5">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <!-- Search Bar -->
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

            <!-- Scope & Sort CustomSelect Dropdowns (Image 1 Parity) -->
            <div class="flex items-center gap-3 shrink-0">
              <div class="w-36">
                <CustomSelect
                  options={scopeOptions}
                  bind:value={filterScope}
                />
              </div>

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
        </div>

        <!-- Sub-folders & Diagram Cards Content Body -->
        <div class="flex-1 overflow-y-auto p-6 pt-2 space-y-8 custom-scrollbar">
          <!-- Sub-Folders Section (Image 1 Parity) -->
          {#if filteredSubFolders.length > 0}
            <div class="space-y-3">
              <h3 class="text-xs font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
                Folders ({filteredSubFolders.length})
              </h3>

              <div class={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
                {#each filteredSubFolders as subFolder (subFolder.id)}
                  {@const subCount = getSubFolderDiagramCount(subFolder.id)}
                  <a
                    href={`/share/${subFolder.shareToken || subFolder.id}`}
                    class="group p-4 rounded-2xl bg-[#0F1117] border border-white/10 hover:border-amber-500/40 hover:bg-[#141722] transition-all flex items-center justify-between shadow-lg cursor-pointer"
                  >
                    <div class="flex items-center gap-3.5 min-w-0">
                      <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FolderIcon size={18} />
                      </div>
                      <div class="min-w-0 truncate">
                        <h4 class="font-semibold text-xs text-white truncate group-hover:text-amber-400 transition-colors">
                          {subFolder.name}
                        </h4>
                        <p class="text-[11px] text-white/40 mt-0.5 font-['IBM_Plex_Mono',monospace]">
                          {subCount} diagram{subCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Diagrams Section (DiagramCard Component Parity - Image 1) -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
              Diagrams ({sortedFilteredDiagrams.length})
            </h3>

            {#if sortedFilteredDiagrams.length === 0}
              <div class="p-12 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                <FileText size={32} class="mx-auto text-white/20 mb-3" />
                <p class="text-xs text-white/40 font-['IBM_Plex_Mono',monospace]">
                  No diagrams found matching filters.
                </p>
              </div>
            {:else if viewMode === 'grid'}
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {#each sortedFilteredDiagrams as diagram (diagram.id)}
                  <DiagramCard
                    diagram={{
                      id: diagram.id,
                      userId: diagram.userId,
                      folderId: diagram.folderId,
                      title: diagram.title,
                      code: diagram.code,
                      config: diagram.config,
                      isShared: true,
                      isDeleted: false,
                      createdAt: diagram.createdAt,
                      updatedAt: diagram.updatedAt
                    }}
                    isFavorite={favoriteIds.has(diagram.id)}
                    onSelect={() => goto(`/share/${diagram.shareToken || diagram.id}`)}
                    onToggleFavorite={() => toggleFavorite(diagram.id)}
                    onShare={() => (shareModalOpen = true)}
                    onRename={() => {}}
                    onDelete={() => {}}
                  />
                {/each}
              </div>
            {:else}
              <!-- List View -->
              <div class="border border-white/15 rounded-2xl overflow-hidden bg-[#0F1117] text-xs">
                <table class="w-full text-left">
                  <thead class="bg-white/5 text-white/50 font-semibold border-b border-white/10 font-['IBM_Plex_Mono',monospace]">
                    <tr>
                      <th class="py-3 px-4">Title</th>
                      <th class="py-3 px-4">Last modified</th>
                      <th class="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/10">
                    {#each sortedFilteredDiagrams as diagram (diagram.id)}
                      <tr
                        onclick={() => goto(`/share/${diagram.shareToken || diagram.id}`)}
                        class="hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <td class="py-3 px-4 font-medium text-white flex items-center gap-3">
                          <FileText size={16} class="text-amber-400 shrink-0" />
                          <span class="group-hover:text-amber-400 transition-colors truncate">{diagram.title}</span>
                        </td>
                        <td class="py-3 px-4 text-white/50 font-['IBM_Plex_Mono',monospace]">
                          {new Date(diagram.updatedAt).toLocaleDateString()}
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="text-xs text-amber-400 font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Open <ArrowRight size={13} />
                          </span>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- Shared Diagram View with DiagramCanvas -->
      <DiagramCanvas
        bind:code
        {title}
        readOnly={!isEditable}
        {saveStatus}
        isFavorite={favoriteIds.has(data.diagram.id)}
        spaceName={data.rootFolder?.name || 'Shared Space'}
        folderName={data.currentFolder?.name}
        isSharedSpace={true}
        allowComments={data.allowComments}
        allowTimeline={data.allowTimeline}
        allowForking={data.allowForking}
        isLoggedIn={data.isLoggedIn}
        onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
        onCodeChange={handleCodeChange}
        onTitleChange={handleTitleChange}
        onToggleFavorite={() => toggleFavorite(data.diagram.id)}
        onOpenComments={() => (commentsModalOpen = true)}
        onOpenHistory={() => (versionHistoryModalOpen = true)}
        onOpenShare={() => (shareModalOpen = true)}
        onOpenExport={() => (advancedExportModalOpen = true)}
        onOpenTemplates={() => (templatesModalOpen = true)}
        onFork={() => handleForkDiagram()}
      />
    {/if}
  </main>
</div>

<!-- Active Presence Stack Floating Widget -->
{#if data.type === 'diagram'}
  <div class="fixed bottom-4 right-4 z-50">
    <ActivePresenceStack />
  </div>
{/if}

<!-- Modals -->
{#if versionHistoryModalOpen && data.type === 'diagram'}
  <VersionHistoryModal
    open={versionHistoryModalOpen}
    diagramId={data.diagram.id}
    currentCode={code}
    userEmail={data.userEmail || ''}
    onRestore={(restoredCode) => {
      code = restoredCode;
      handleCodeChange(restoredCode);
      versionHistoryModalOpen = false;
    }}
    onclose={() => (versionHistoryModalOpen = false)}
  />
{/if}

{#if commentsModalOpen && data.type === 'diagram'}
  <CommentsModal
    open={commentsModalOpen}
    diagramId={data.diagram.id}
    userEmail={data.userEmail || ''}
    onclose={() => (commentsModalOpen = false)}
  />
{/if}

{#if advancedExportModalOpen && data.type === 'diagram'}
  <AdvancedExportModal
    open={advancedExportModalOpen}
    {code}
    {title}
    onclose={() => (advancedExportModalOpen = false)}
  />
{/if}

{#if shareModalOpen}
  <ShareModal
    open={shareModalOpen}
    diagram={data.type === 'diagram' ? (data.diagram as any) : null}
    folder={data.type === 'folder' ? (data.folder as any) : null}
    onclose={() => (shareModalOpen = false)}
  />
{/if}

{#if templatesModalOpen}
  <TemplatesModal
    open={templatesModalOpen}
    onclose={() => (templatesModalOpen = false)}
    onSelectTemplate={(templateCode) => {
      if (isEditable) {
        code = templateCode;
        handleCodeChange(templateCode);
      }
      templatesModalOpen = false;
    }}
  />
{/if}
