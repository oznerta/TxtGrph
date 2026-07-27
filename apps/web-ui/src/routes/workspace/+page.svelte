<script lang="ts">
  import { onMount } from 'svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';
  import CodeMirrorEditor from '$lib/components/editor/CodeMirrorEditor.svelte';
  import FolderTree from '$lib/components/workspace/FolderTree.svelte';
  import {
    Plus,
    LogOut,
    PanelLeftClose,
    PanelLeft,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Download,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Sparkles,
    Settings
  } from 'lucide-svelte';
  import AIAssistantModal from '$lib/components/workspace/AIAssistantModal.svelte';
  import { goto } from '$app/navigation';
  import mermaid from 'mermaid';

  let { data } = $props();
  const supabase = createSupabaseBrowserClient();

  let sidebarOpen = $state(true);
  let isEditingTitle = $state(false);
  let activeTitleInput = $state('');

  // Live Mermaid Render State
  let mermaidContainer: HTMLDivElement;
  let renderError = $state<string | null>(null);
  let isRendering = $state(false);
  let svgContent = $state('');
  let zoomLevel = $state(1);

  // Debounce timers
  let renderTimeout: ReturnType<typeof setTimeout>;
  let saveTimeout: ReturnType<typeof setTimeout>;

  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Instrument Sans, sans-serif'
    });

    workspaceStore.init(data.folders || [], data.diagrams || []);
    if (workspaceStore.activeDiagram) {
      activeTitleInput = workspaceStore.activeTitle;
      triggerRender(workspaceStore.activeCode);
    }
  });

  // Re-trigger diagram render when active diagram changes
  $effect(() => {
    if (workspaceStore.activeDiagramId && workspaceStore.activeCode !== undefined) {
      activeTitleInput = workspaceStore.activeTitle;
      triggerRender(workspaceStore.activeCode);
    }
  });

  let aiModalOpen = $state(false);

  function triggerRender(code: string) {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(async () => {
      if (!code.trim()) {
        svgContent = '';
        renderError = null;
        return;
      }

      isRendering = true;
      try {
        const id = `mermaid-svg-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        svgContent = svg;
        renderError = null;
      } catch (err: any) {
        renderError = err?.message || 'Mermaid Syntax Error';
      } finally {
        isRendering = false;
      }
    }, 300);
  }

  function handleCodeChange(newCode: string) {
    if (!workspaceStore.activeDiagram) return;

    workspaceStore.activeDiagram.code = newCode;
    workspaceStore.saveStatus = 'saving';
    triggerRender(newCode);

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (!workspaceStore.activeDiagramId) return;
      const { error } = await supabase
        .from('diagrams')
        .update({ code: newCode, updated_at: new Date().toISOString() })
        .eq('id', workspaceStore.activeDiagramId);

      if (error) {
        console.error('Auto-save error:', error);
        workspaceStore.saveStatus = 'error';
      } else {
        workspaceStore.saveStatus = 'saved';
      }
    }, 800);
  }

  async function handleTitleSave() {
    isEditingTitle = false;
    if (!workspaceStore.activeDiagram || !activeTitleInput.trim()) return;

    const newTitle = activeTitleInput.trim();
    workspaceStore.activeDiagram.title = newTitle;

    await supabase
      .from('diagrams')
      .update({ title: newTitle })
      .eq('id', workspaceStore.activeDiagramId);
  }

  async function handleCreateDiagram(title = 'Untitled Diagram', folderId: string | null = null) {
    if (!data.session?.user?.id) return;

    const { data: created, error } = await supabase
      .from('diagrams')
      .insert({
        title,
        folder_id: folderId,
        user_id: data.session.user.id,
        code: `flowchart TD\n    A[Start] --> B[Process]\n    B --> C[End]`
      })
      .select()
      .single();

    if (created && !error) {
      const newDiagram = {
        id: created.id,
        userId: created.user_id,
        folderId: created.folder_id,
        title: created.title,
        code: created.code,
        config: created.config || {},
        isDeleted: created.is_deleted,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };

      workspaceStore.diagrams = [newDiagram, ...workspaceStore.diagrams];
      workspaceStore.selectDiagram(created.id);
    }
  }

  async function handleCreateFolder(name: string, parentId: string | null = null) {
    if (!data.session?.user?.id) return;

    const { data: created, error } = await supabase
      .from('folders')
      .insert({
        name,
        parent_id: parentId,
        user_id: data.session.user.id
      })
      .select()
      .single();

    if (created && !error) {
      const newFolder = {
        id: created.id,
        userId: created.user_id,
        parentId: created.parent_id,
        name: created.name,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };

      workspaceStore.folders = [...workspaceStore.folders, newFolder];
    }
  }

  async function handleDeleteDiagram(id: string) {
    workspaceStore.diagrams = workspaceStore.diagrams.filter((d) => d.id !== id);
    if (workspaceStore.activeDiagramId === id) {
      const remaining = workspaceStore.diagrams;
      workspaceStore.activeDiagramId = remaining.length > 0 ? remaining[0].id : null;
    }

    await supabase
      .from('diagrams')
      .update({ is_deleted: true })
      .eq('id', id);
  }

  async function handleDeleteFolder(id: string) {
    workspaceStore.folders = workspaceStore.folders.filter((f) => f.id !== id);
    await supabase.from('folders').delete().eq('id', id);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    await goto('/auth');
  }
</script>

<div class="h-screen w-screen flex flex-col bg-[var(--color-surface-app)] overflow-hidden">
  <!-- Top Navigation Header -->
  <header class="h-14 px-4 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] shrink-0">
    <div class="flex items-center gap-3">
      <button
        onclick={() => (sidebarOpen = !sidebarOpen)}
        title="Toggle Sidebar"
        class="p-1.5 rounded-[5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
      >
        {#if sidebarOpen}
          <PanelLeftClose size={18} />
        {:else}
          <PanelLeft size={18} />
        {/if}
      </button>

      <a href="/" class="flex items-center gap-2 group">
        <div class="w-6 h-6 rounded flex items-center justify-center overflow-hidden">
          <img src="/assets/logo-short-dark.png" alt="Logo" class="w-full h-full object-contain" />
        </div>
        <span class="font-['Instrument_Sans',sans-serif] text-[16px] font-semibold text-[var(--color-text-primary)]">
          TxtGrph
        </span>
      </a>

      <!-- Breadcrumb / Title Editor -->
      {#if workspaceStore.activeDiagram}
        <span class="text-[var(--color-text-tertiary)]">/</span>
        {#if isEditingTitle}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            type="text"
            bind:value={activeTitleInput}
            onblur={handleTitleSave}
            onkeydown={(e) => e.key === 'Enter' && handleTitleSave()}
            class="h-7 px-2 text-[13px] font-medium rounded bg-[var(--color-surface-app)] border border-[var(--color-brass)] text-[var(--color-text-primary)] focus:outline-none"
            autofocus
          />
        {:else}
          <button
            onclick={() => (isEditingTitle = true)}
            title="Click to rename"
            class="text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] px-2 py-1 rounded transition-colors"
          >
            {workspaceStore.activeTitle}
          </button>
        {/if}
      {/if}

      <!-- Save Status Indicator -->
      {#if workspaceStore.activeDiagram}
        {#if workspaceStore.saveStatus === 'saving'}
          <span class="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
            <Loader2 size={12} class="animate-spin" /> Saving...
          </span>
        {:else if workspaceStore.saveStatus === 'saved'}
          <span class="inline-flex items-center gap-1 text-[11px] text-[var(--color-brass-text)] opacity-80">
            <CheckCircle2 size={12} /> Saved
          </span>
        {/if}
      {/if}
    </div>

    <div class="flex items-center gap-2 text-[13px]">
      <button
        onclick={() => (aiModalOpen = true)}
        title="BYOK AI Assistant"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-[var(--color-brass)] text-white font-medium hover:opacity-90 transition-opacity"
      >
        <Sparkles size={15} />
        <span>AI Assistant</span>
      </button>

      <a
        href="/settings"
        title="Settings & BYOK Keys"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
      >
        <Settings size={16} />
      </a>

      <span class="text-[var(--color-border-default)]">|</span>

      <span class="text-[var(--color-text-secondary)] hidden sm:inline">
        {data.session?.user?.email}
      </span>
      <button
        onclick={handleSignOut}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
      >
        <LogOut size={16} />
        <span class="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  </header>

  <!-- Main Viewport-Locked Studio Body -->
  <main class="flex-1 flex min-h-0 overflow-hidden">
    <!-- Left Navigation Sidebar -->
    {#if sidebarOpen}
      <div class="w-64 shrink-0 h-full">
        <FolderTree
          onCreateFolder={handleCreateFolder}
          onCreateDiagram={handleCreateDiagram}
          onDeleteFolder={handleDeleteFolder}
          onDeleteDiagram={handleDeleteDiagram}
        />
      </div>
    {/if}

    <!-- Main Workspace Content -->
    {#if workspaceStore.activeDiagram}
      <div class="flex-1 flex min-h-0 overflow-hidden">
        <!-- CodeMirror 6 Editor Pane -->
        <div class="w-1/2 h-full flex flex-col border-r border-[var(--color-border-default)]">
          <div class="h-9 px-4 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[12px] font-medium text-[var(--color-text-secondary)] shrink-0">
            <span>Editor (Mermaid.js)</span>
            <span class="text-[11px] text-[var(--color-text-tertiary)] font-['IBM_Plex_Mono',monospace]">
              CodeMirror 6
            </span>
          </div>
          <div class="flex-1 min-h-0">
            <CodeMirrorEditor
              value={workspaceStore.activeCode}
              onchange={handleCodeChange}
            />
          </div>
        </div>

        <!-- Live Mermaid Preview Canvas Pane -->
        <div class="w-1/2 h-full flex flex-col bg-[var(--color-surface-app)]">
          <!-- Canvas Toolbar -->
          <div class="h-9 px-4 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[12px] font-medium text-[var(--color-text-secondary)] shrink-0">
            <div class="flex items-center gap-2">
              <span>Preview</span>
              {#if isRendering}
                <Loader2 size={12} class="animate-spin text-[var(--color-brass)]" />
              {/if}
            </div>

            <div class="flex items-center gap-1">
              <button
                onclick={() => (zoomLevel = Math.max(0.5, zoomLevel - 0.1))}
                title="Zoom Out"
                class="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]"
              >
                <ZoomOut size={14} />
              </button>
              <span class="text-[11px] font-['IBM_Plex_Mono',monospace] px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onclick={() => (zoomLevel = Math.min(2, zoomLevel + 0.1))}
                title="Zoom In"
                class="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onclick={() => (zoomLevel = 1)}
                title="Reset Zoom"
                class="p-1 rounded hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          <!-- Canvas Preview Body -->
          <div class="flex-1 min-h-0 overflow-auto p-6 flex items-center justify-center relative">
            {#if renderError}
              <div class="max-w-md p-4 rounded-[6px] bg-red-950/40 border border-red-800/50 text-red-200 space-y-2 text-[13px]">
                <div class="flex items-center gap-2 font-semibold text-red-400">
                  <AlertCircle size={16} /> Syntax Error
                </div>
                <pre class="font-['IBM_Plex_Mono',monospace] text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto">{renderError}</pre>
              </div>
            {:else if svgContent}
              <div
                class="transition-transform duration-150 ease-out origin-center"
                style="transform: scale({zoomLevel});"
              >
                {@html svgContent}
              </div>
            {:else}
              <div class="text-[13px] text-[var(--color-text-tertiary)]">
                Type Mermaid syntax in the editor to preview diagram...
              </div>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- Empty Workspace State -->
      <div class="flex-1 flex items-center justify-center p-6 text-center">
        <div class="max-w-md mx-auto p-8 rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] space-y-5 shadow-sm">
          <div class="w-12 h-12 mx-auto rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-brass-text)]">
            <Plus size={24} strokeWidth={1.5} />
          </div>

          <div class="space-y-2">
            <h3 class="font-['Instrument_Sans',sans-serif] text-[17px] font-semibold text-[var(--color-text-primary)]">
              No Diagram Selected
            </h3>
            <p class="text-[14px] leading-[21px] text-[var(--color-text-secondary)]">
              Select a diagram from the sidebar or create a new one to start drafting and organizing.
            </p>
          </div>

          <div class="pt-2">
            <button
              onclick={() => handleCreateDiagram('Untitled Diagram', null)}
              class="inline-flex items-center justify-center gap-2 h-10 px-5 text-[14px] font-medium rounded-[5px] bg-[var(--color-ink)] text-[#FAF9F6] shadow-sm hover:opacity-95 transition-opacity"
            >
              <Plus size={18} strokeWidth={1.5} />
              <span>Create New Diagram</span>
            </button>
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

<AIAssistantModal
  bind:isOpen={aiModalOpen}
  currentCode={workspaceStore.activeCode}
  onApply={(newCode: string) => handleCodeChange(newCode)}
/>
