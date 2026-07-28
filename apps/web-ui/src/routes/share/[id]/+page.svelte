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

  let { data }: { data: PageData } = $props();
  const supabase = createSupabaseBrowserClient();

  /* svelte-ignore state_referenced_locally */
  let code = $state(data.diagram.code);
  /* svelte-ignore state_referenced_locally */
  let title = $state(data.diagram.title);
  let saveStatus = $state<'idle' | 'saving' | 'saved'>('saved');
  let isFavorite = $state(false);

  // Modals
  let versionHistoryModalOpen = $state(false);
  let commentsModalOpen = $state(false);
  let advancedExportModalOpen = $state(false);
  let shareModalOpen = $state(false);
  let templatesModalOpen = $state(false);

  let isEditable = $derived.by(() => data.userRole === 'editor');

  onMount(async () => {
    if (data.diagram?.id) {
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

    if (data.isLoggedIn && data.diagram?.id) {
      try {
        await supabase.rpc('touch_recently_opened_diagram', { p_diagram_id: data.diagram.id });
      } catch (err) {
        console.warn('Failed to touch recently opened diagram:', err);
      }
    }
  });

  onDestroy(() => {
    presenceStore.leaveDiagram();
  });

  $effect(() => {
    if (data.isLoggedIn && data.diagram?.id) {
      checkFavoriteStatus();
    }
  });

  async function checkFavoriteStatus() {
    try {
      const { data: fav } = await supabase
        .from('user_favorites')
        .select('diagram_id')
        .eq('diagram_id', data.diagram.id)
        .maybeSingle();
      isFavorite = !!fav;
    } catch (err) {
      console.warn('Failed to check favorite status:', err);
    }
  }

  async function handleToggleFavorite() {
    if (!data.isLoggedIn) {
      await goto('/auth');
      return;
    }

    try {
      if (isFavorite) {
        await supabase.from('user_favorites').delete().eq('diagram_id', data.diagram.id);
        isFavorite = false;
      } else {
        await supabase.from('user_favorites').insert({ diagram_id: data.diagram.id });
        isFavorite = true;
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  async function handleFork() {
    if (!data.isLoggedIn) {
      await goto('/auth');
      return;
    }

    try {
      const { data: created, error } = await supabase
        .from('diagrams')
        .insert({
          title: `${title} (Forked)`,
          code: code,
          config: data.diagram.config || {}
        })
        .select('id')
        .single();

      if (error) throw error;
      if (created) {
        await goto('/workspace');
      }
    } catch (err) {
      console.error('Failed to fork diagram:', err);
    }
  }

  async function handleCodeChange(newCode: string) {
    if (!isEditable) return;
    code = newCode;
    saveStatus = 'saving';

    try {
      await supabase
        .from('diagrams')
        .update({ code: newCode, updated_at: new Date().toISOString() })
        .eq('id', data.diagram.id);
    } catch (err) {
      console.warn('Auto-save error on shared diagram:', err);
    } finally {
      setTimeout(() => (saveStatus = 'saved'), 600);
    }
  }
</script>

<svelte:head>
  <title>{title} — TxtGrph Shared Workspace</title>
</svelte:head>

<!-- Single Source of Truth Unified Diagram Canvas -->
<div class="h-screen w-screen flex flex-col overflow-hidden bg-[#090A0F] select-none font-['Instrument_Sans',sans-serif]">
  <DiagramCanvas
    bind:code
    {title}
    readOnly={!isEditable}
    {saveStatus}
    isSharedSpace={true}
    isLoggedIn={data.isLoggedIn}
    allowComments={data.allowComments}
    allowTimeline={data.allowTimeline}
    allowForking={data.allowForking}
    {isFavorite}
    onCodeChange={handleCodeChange}
    onToggleFavorite={handleToggleFavorite}
    onFork={handleFork}
    onOpenComments={() => (commentsModalOpen = true)}
    onOpenHistory={() => (versionHistoryModalOpen = true)}
    onOpenShare={() => (shareModalOpen = true)}
    onOpenExport={() => (advancedExportModalOpen = true)}
    onOpenTemplates={() => (templatesModalOpen = true)}
  />
</div>

<!-- Modal Mount Points -->
<VersionHistoryModal
  open={versionHistoryModalOpen}
  diagramId={data.diagram.id}
  currentCode={code}
  userEmail={data.userEmail || ''}
  onRestore={(versionCode) => {
    if (isEditable) {
      handleCodeChange(versionCode);
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

<AdvancedExportModal
  open={advancedExportModalOpen}
  code={code}
  title={title}
  onclose={() => (advancedExportModalOpen = false)}
/>

{#if isEditable}
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
