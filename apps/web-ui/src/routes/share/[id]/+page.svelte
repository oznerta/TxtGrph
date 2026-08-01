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
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { presenceStore } from '$lib/stores/presenceStore.svelte';
  import { Folder, FileText, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const supabase = createSupabaseBrowserClient();

  /* svelte-ignore state_referenced_locally */
  let code = $state(data.type === 'diagram' ? data.diagram.code : '');
  /* svelte-ignore state_referenced_locally */
  let title = $state(data.type === 'diagram' ? data.diagram.title : '');
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'unsaved' | 'error'>('saved');
  let isFavorite = $state(false);

  // Modals
  let versionHistoryModalOpen = $state(false);
  let commentsModalOpen = $state(false);
  let advancedExportModalOpen = $state(false);
  let shareModalOpen = $state(false);
  let templatesModalOpen = $state(false);

  let isEditable = $derived.by(() => data.type === 'diagram' && data.userRole === 'editor');

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
        role: data.userRole || 'viewer'
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
</script>

{#if data.type === 'folder'}
  <!-- Shared Folder Landing View -->
  <div class="min-h-screen bg-[#0A0B0E] text-white flex flex-col font-['Instrument_Sans',sans-serif]">
    <!-- Header -->
    <header class="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-[#0F1117]">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
          <Folder size={20} />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base font-bold text-white tracking-tight">{data.folder.name}</h1>
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 font-['IBM_Plex_Mono',monospace]">
              <ShieldCheck size={11} /> Publicly Shared Folder
            </span>
          </div>
          <p class="text-xs text-white/40 font-['IBM_Plex_Mono',monospace] mt-0.5">
            {data.diagrams.length} {data.diagrams.length === 1 ? 'diagram' : 'diagrams'} inside
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        {#if data.isLoggedIn}
          <a
            href="/workspace"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15"
          >
            Go to My Workspace
          </a>
        {:else}
          <a
            href="/auth/login"
            class="px-4 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors"
          >
            Log In
          </a>
        {/if}
      </div>
    </header>

    <!-- Folder Contents Grid -->
    <main class="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
      <div class="mb-6">
        <h2 class="text-xs font-bold uppercase text-white/40 tracking-wider font-['IBM_Plex_Mono',monospace]">
          Shared Diagrams
        </h2>
      </div>

      {#if data.diagrams.length === 0}
        <div class="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <FileText class="w-10 h-10 text-white/20 mx-auto mb-3" />
          <h3 class="text-sm font-semibold text-white">No public diagrams in this folder</h3>
          <p class="text-xs text-white/40 mt-1">Diagrams added to this folder will automatically appear here.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each data.diagrams as diagram (diagram.id)}
            <a
              href={`/share/${diagram.shareToken}`}
              class="group relative rounded-2xl border border-white/10 bg-[#12141D] hover:bg-[#181B27] hover:border-amber-500/40 p-5 transition-all flex flex-col justify-between h-44 shadow-lg cursor-pointer"
            >
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <ExternalLink size={14} class="text-white/30 group-hover:text-amber-400 transition-colors" />
                </div>
                <h3 class="font-bold text-sm text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                  {diagram.title}
                </h3>
              </div>

              <div class="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-white/40 font-['IBM_Plex_Mono',monospace]">
                <span>View Diagram</span>
                <ArrowRight size={12} class="group-hover:translate-x-1 transition-transform text-amber-400" />
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </main>
  </div>
{:else}
  <!-- Diagram Canvas View -->
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
  />

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
