<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import DiagramCanvas from '$lib/components/workspace/DiagramCanvas.svelte';
  import VersionHistoryModal from '$lib/components/workspace/VersionHistoryModal.svelte';
  import CommentsModal from '$lib/components/workspace/CommentsModal.svelte';
  import AdvancedExportModal from '$lib/components/workspace/AdvancedExportModal.svelte';
  import ShareModal from '$lib/components/workspace/ShareModal.svelte';
  import TemplatesModal from '$lib/components/workspace/TemplatesModal.svelte';
  import FolderTree from '$lib/components/workspace/FolderTree.svelte';
  import DiagramThumbnail from '$lib/components/workspace/DiagramThumbnail.svelte';
  import ActivePresenceStack from '$lib/components/workspace/ActivePresenceStack.svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { presenceStore } from '$lib/stores/presenceStore.svelte';
  import {
    Folder,
    FileText,
    ArrowRight,
    ExternalLink,
    ShieldCheck,
    Lock,
    Edit3,
    MessageSquare,
    Eye,
    ChevronRight,
    Search,
    LayoutGrid,
    List,
    GitFork,
    ArrowLeft,
    LogIn,
    Share2,
    Check
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const supabase = createSupabaseBrowserClient();

  let code = $state(data.type === 'diagram' ? data.diagram.code : '');
  let title = $state(data.type === 'diagram' ? data.diagram.title : '');
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'unsaved' | 'error'>('saved');
  let isFavorite = $state(false);

  // Gallery view controls
  let searchQuery = $state('');
  let viewMode = $state<'grid' | 'list'>('grid');
  let sidebarOpen = $state(true);

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

  async function handleForkDiagram() {
    if (!data.isLoggedIn || data.type !== 'diagram') {
      goto('/auth/login');
      return;
    }

    try {
      const userId = data.session?.user?.id;
      const diagramId = crypto.randomUUID();

      const { error } = await supabase.from('diagrams').insert({
        id: diagramId,
        user_id: userId,
        title: `${data.diagram.title} (Forked)`,
        code: data.diagram.code,
        config: data.diagram.config || {},
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

  // Filtered sub-folders and diagrams for gallery view
  let filteredSubFolders = $derived.by(() => {
    if (!data.subFolders) return [];
    if (!searchQuery.trim()) return data.subFolders;
    const q = searchQuery.toLowerCase();
    return data.subFolders.filter((f) => f.name.toLowerCase().includes(q));
  });

  let filteredDiagrams = $derived.by(() => {
    if (!data.diagrams) return [];
    if (!searchQuery.trim()) return data.diagrams;
    const q = searchQuery.toLowerCase();
    return data.diagrams.filter((d) => d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  });
</script>

<div class="h-screen w-screen flex bg-[#090A0F] overflow-hidden select-none font-['Instrument_Sans',sans-serif]">
  <!-- Left Navigation Sidebar (Shared Tree View) -->
  {#if sidebarOpen && data.treeFolders && data.treeFolders.length > 0}
    <div class="w-64 shrink-0 h-full border-r border-white/10 bg-[#0F1117] flex flex-col">
      <!-- Brand & Space Header -->
      <div class="p-4 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs">
            TG
          </div>
          <div>
            <h2 class="text-sm font-bold text-white tracking-tight">Public Workspace</h2>
            <p class="text-[10px] text-emerald-400 font-['IBM_Plex_Mono',monospace]">
              {data.rootFolder?.name || 'Shared Folder'}
            </p>
          </div>
        </div>
      </div>

      <!-- Collapsible Sidebar Tree -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        <div class="px-2 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">
          Shared Tree Navigation
        </div>

        {#each data.treeFolders as treeFolder (treeFolder.id)}
          <a
            href={`/share/${treeFolder.shareToken || treeFolder.id}`}
            class={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              data.folder?.id === treeFolder.id
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Folder size={15} class="text-amber-400 shrink-0" />
            <span class="truncate flex-1">{treeFolder.name}</span>
          </a>
        {/each}
      </div>

      <!-- User Account / Login CTA Footer -->
      <div class="p-3 border-t border-white/10 bg-[#0A0B0E]">
        {#if data.isLoggedIn}
          <a
            href="/workspace"
            class="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-white/15 cursor-pointer"
          >
            <span>Go to My Workspace</span>
            <ArrowRight size={14} />
          </a>
        {:else}
          <a
            href="/auth/login"
            class="w-full py-2 px-3 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <LogIn size={14} />
            <span>Log In to TxtGrph</span>
          </a>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Main Workspace Area -->
  <main class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
    {#if data.type === 'folder'}
      <!-- Shared Folder Gallery View -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0A0B0E] text-white">
        <!-- Top Workspace Bar & Breadcrumbs -->
        <header class="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-[#0F1117] shrink-0">
          <div class="flex items-center gap-3">
            <button
              onclick={() => (sidebarOpen = !sidebarOpen)}
              class="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Toggle sidebar"
            >
              <LayoutGrid size={18} />
            </button>

            <!-- Breadcrumb Navigation -->
            <div class="flex items-center gap-2 text-xs font-medium font-['IBM_Plex_Mono',monospace]">
              <span class="text-white/40">Shared Space</span>
              <ChevronRight size={14} class="text-white/30" />
              {#if data.rootFolder && data.rootFolder.id !== data.folder.id}
                <a href={`/share/${data.rootFolder.shareToken || data.rootFolder.id}`} class="text-white/60 hover:text-white transition-colors">
                  {data.rootFolder.name}
                </a>
                <ChevronRight size={14} class="text-white/30" />
              {/if}
              <span class="text-white font-bold">{data.folder.name}</span>
            </div>

            <!-- Permission Badge -->
            {#if data.userRole === 'editor'}
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 font-['IBM_Plex_Mono',monospace]">
                <Edit3 size={11} /> Public Editor
              </span>
            {:else if data.userRole === 'commenter'}
              <span class="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30 font-['IBM_Plex_Mono',monospace]">
                <MessageSquare size={11} /> Public Commenter
              </span>
            {:else}
              <span class="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 font-['IBM_Plex_Mono',monospace]">
                <Eye size={11} /> Public Read-Only
              </span>
            {/if}
          </div>

          <!-- Right Action Bar -->
          <div class="flex items-center gap-3">
            {#if data.isLoggedIn}
              <a
                href="/workspace"
                class="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15"
              >
                My Workspace
              </a>
            {:else}
              <a
                href="/auth/login"
                class="px-4 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md"
              >
                Log In / Sign Up
              </a>
            {/if}
          </div>
        </header>

        <!-- Search Bar & View Mode Controls -->
        <div class="px-8 pt-6 pb-2 flex items-center justify-between gap-4 shrink-0">
          <div class="relative max-w-md w-full">
            <Search size={16} class="absolute left-3.5 top-3 text-white/40" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search diagrams or sub-folders..."
              class="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-[#141622] border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60 font-['IBM_Plex_Mono',monospace] transition-colors"
            />
          </div>

          <div class="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onclick={() => (viewMode = 'grid')}
              class={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onclick={() => (viewMode = 'list')}
              class={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        <!-- Main Gallery Scroll Container -->
        <div class="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-8">
          <!-- Sub-Folders Section -->
          {#if filteredSubFolders && filteredSubFolders.length > 0}
            <div>
              <div class="mb-3.5 flex items-center justify-between">
                <h2 class="text-xs font-bold uppercase text-white/40 tracking-wider font-['IBM_Plex_Mono',monospace]">
                  Folders ({filteredSubFolders.length})
                </h2>
              </div>

              <div class={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5' : 'space-y-2'}>
                {#each filteredSubFolders as subFolder (subFolder.id)}
                  <a
                    href={`/share/${subFolder.shareToken || subFolder.id}`}
                    class="group flex items-center justify-between rounded-2xl border border-white/10 bg-[#12141D] hover:bg-[#181B27] hover:border-amber-500/40 p-4 transition-all shadow-md cursor-pointer"
                  >
                    <div class="flex items-center gap-3 truncate">
                      <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Folder size={18} />
                      </div>
                      <div>
                        <span class="font-bold text-xs text-white group-hover:text-amber-400 transition-colors block truncate">
                          {subFolder.name}
                        </span>
                        <span class="text-[10px] text-white/40 font-['IBM_Plex_Mono',monospace]">Sub-folder</span>
                      </div>
                    </div>
                    <ArrowRight size={15} class="text-white/30 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                  </a>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Diagrams Section with Live SVG Thumbnails -->
          <div>
            <div class="mb-3.5 flex items-center justify-between">
              <h2 class="text-xs font-bold uppercase text-white/40 tracking-wider font-['IBM_Plex_Mono',monospace]">
                Diagrams ({filteredDiagrams.length})
              </h2>
            </div>

            {#if filteredDiagrams.length === 0 && (!filteredSubFolders || filteredSubFolders.length === 0)}
              <div class="rounded-2xl border border-white/10 bg-white/[0.02] p-16 text-center">
                <FileText class="w-12 h-12 text-white/20 mx-auto mb-3" />
                <h3 class="text-sm font-semibold text-white">No diagrams found in this folder</h3>
                <p class="text-xs text-white/40 mt-1">Diagrams added to this folder will automatically appear here.</p>
              </div>
            {:else}
              <div class={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2.5'}>
                {#each filteredDiagrams as diagram (diagram.id)}
                  <a
                    href={`/share/${diagram.shareToken || diagram.id}`}
                    class="group rounded-2xl border border-white/10 bg-[#12141D] hover:bg-[#181B27] hover:border-amber-500/40 overflow-hidden transition-all shadow-lg flex flex-col cursor-pointer"
                  >
                    <!-- Live SVG Diagram Thumbnail -->
                    <div class="h-36 w-full relative overflow-hidden bg-[#0A0B0E] border-b border-white/10">
                      <DiagramThumbnail code={diagram.code} />
                      <div class="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-amber-400 border border-amber-400/30">
                        <ExternalLink size={14} />
                      </div>
                    </div>

                    <!-- Card Header Info -->
                    <div class="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 class="font-bold text-sm text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                          {diagram.title}
                        </h3>
                        <p class="text-[11px] text-white/40 font-['IBM_Plex_Mono',monospace] mt-1">
                          Updated {new Date(diagram.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div class="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] text-white/50 font-['IBM_Plex_Mono',monospace]">
                        <span class="group-hover:text-amber-400 transition-colors">Open Diagram</span>
                        <ArrowRight size={13} class="group-hover:translate-x-1 transition-transform text-amber-400" />
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- Diagram Canvas View -->
      <div class="flex-1 flex flex-col min-h-0 relative">
        <!-- Fork Success Toast -->
        {#if showForkSuccess}
          <div class="fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-2xl bg-[#0F1117]/95 border border-emerald-500/30 text-emerald-400 font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-xl font-['Instrument_Sans',sans-serif]">
            <Check size={16} class="text-emerald-400 shrink-0" />
            <span>Diagram forked to your personal workspace!</span>
          </div>
        {/if}

        <DiagramCanvas
          code={code}
          title={title}
          readOnly={!isEditable}
          saveStatus={saveStatus}
          isFavorite={isFavorite}
          allowComments={data.allowComments}
          allowTimeline={data.allowTimeline}
          allowForking={data.allowForking}
          isLoggedIn={data.isLoggedIn}
          onCodeChange={handleCodeChange}
          onTitleChange={handleTitleChange}
          onToggleFavorite={() => (isFavorite = !isFavorite)}
          onOpenComments={() => (commentsModalOpen = true)}
          onOpenHistory={() => (versionHistoryModalOpen = true)}
          onOpenShare={() => (shareModalOpen = true)}
          onOpenExport={() => (advancedExportModalOpen = true)}
          onOpenTemplates={() => (templatesModalOpen = true)}
          onFork={handleForkDiagram}
        />
      </div>

      {#if data.diagram?.id}
        <VersionHistoryModal
          open={versionHistoryModalOpen}
          diagramId={data.diagram.id}
          currentCode={code}
          userEmail={data.userEmail || ''}
          onRestore={(historicCode: string) => {
            if (isEditable) {
              handleCodeChange(historicCode);
              versionHistoryModalOpen = false;
            }
          }}
          onclose={() => (versionHistoryModalOpen = false)}
        />

        <CommentsModal
          open={commentsModalOpen}
          diagramId={data.diagram.id}
          userEmail={data.userEmail || ''}
          onclose={() => (commentsModalOpen = false)}
        />
      {/if}

      <AdvancedExportModal
        open={advancedExportModalOpen}
        code={code}
        title={title}
        onclose={() => (advancedExportModalOpen = false)}
      />

      {#if isEditable && data.diagram?.id}
        <ShareModal
          open={shareModalOpen}
          diagram={{ id: data.diagram.id, userId: '', folderId: null, title, code, shareToken: data.diagram.shareToken, createdAt: data.diagram.updatedAt, updatedAt: data.diagram.updatedAt, isShared: true, isDeleted: false, config: {} }}
          onclose={() => (shareModalOpen = false)}
        />

        <TemplatesModal
          open={templatesModalOpen}
          onSelectTemplate={(tmplCode, tmplTitle) => {
            handleCodeChange(tmplCode);
          }}
          onclose={() => (templatesModalOpen = false)}
        />
      {/if}
    {/if}
  </main>
</div>
