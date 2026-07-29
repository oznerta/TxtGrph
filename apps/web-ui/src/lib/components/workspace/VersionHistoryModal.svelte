<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { X, History, RotateCcw, Clock, User, Tag, Code2, ArrowRight, Check, Loader2, FileCode, HardDrive, Database, Sparkles, Plus, Minus, Maximize2, Copy, Eye } from 'lucide-svelte';
  import mermaid from 'mermaid';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export interface DiagramVersion {
    id: string;
    diagram_id: string;
    version_number: number;
    title: string;
    code: string;
    edited_by_email: string;
    edited_by_name?: string;
    change_summary?: string;
    created_at: string;
  }

  export interface LocalEditCheckpoint {
    id: string;
    timestamp: string;
    code: string;
    charCount: number;
    summary: string;
  }

  interface Props {
    open: boolean;
    diagramId: string | null;
    currentCode: string;
    userEmail: string;
    onRestore: (versionCode: string) => void;
    onclose: () => void;
  }

  let { open = false, diagramId = null, currentCode = '', userEmail = '', onRestore, onclose }: Props = $props();

  const supabase = createSupabaseBrowserClient();

  let activeTab = $state<'database' | 'local'>('database');
  let versions = $state<DiagramVersion[]>([]);
  let localEdits = $state<LocalEditCheckpoint[]>([]);
  let activeVersion = $state<DiagramVersion | null>(null);
  let activeLocalEdit = $state<LocalEditCheckpoint | null>(null);
  let activeItem = $derived(activeTab === 'database' ? activeVersion : activeLocalEdit);
  let codeLines = $derived.by(() => {
    const text = activeItem?.code || '';
    return text.split('\n');
  });

  let isLoading = $state(false);
  let isRestoring = $state(false);
  let isSavingSnapshot = $state(false);
  let snapshotTag = $state('');
  let viewMode = $state<'diagram' | 'code'>('diagram');
  let copiedCode = $state(false);

  // Canvas Pan & Zoom State
  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let startX = 0;
  let startY = 0;

  let previewContainer = $state<HTMLDivElement | null>(null);
  let previewError = $state<string | null>(null);
  let isRendering = $state(false);

  let lastFetchedDiagramId: string | null = null;
  let lastRenderedCode: string = '';
  let previewDebounceTimer: any = null;

  $effect(() => {
    if (open && diagramId) {
      if (diagramId === lastFetchedDiagramId && versions.length > 0) return;
      lastFetchedDiagramId = diagramId;

      untrack(() => {
        activeVersion = null;
        activeLocalEdit = null;
        versions = [];
        localEdits = [];
        fetchDatabaseVersions();
        loadLocalEditHistory();
      });
    } else if (!open) {
      lastFetchedDiagramId = null;
    }
  });

  $effect(() => {
    if (open && typeof document !== 'undefined') {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  });

  let animFrameId: number | null = null;

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
  }

  function zoomIn() {
    scale = Math.min(5.0, Math.round((scale + 0.25) * 100) / 100);
  }

  function zoomOut() {
    scale = Math.max(0.2, Math.round((scale - 0.25) * 100) / 100);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    scale = Math.min(Math.max(0.2, scale * zoomFactor), 5.0);
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isPanning) return;
    const newX = e.clientX - startX;
    const newY = e.clientY - startY;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(() => {
      panX = newX;
      panY = newY;
    });
  }

  function handlePointerUp(e: PointerEvent) {
    if (isPanning) {
      isPanning = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  }

  function loadLocalEditHistory() {
    if (!diagramId || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`txtgrph_local_edits_${diagramId}`);
      if (stored) {
        localEdits = JSON.parse(stored);
        if (localEdits.length > 0) {
          activeLocalEdit = localEdits[0];
        }
      } else {
        localEdits = [];
        activeLocalEdit = null;
      }
    } catch (e) {
      console.warn('Failed to load local edit history:', e);
      localEdits = [];
      activeLocalEdit = null;
    }
  }

  async function fetchDatabaseVersions() {
    if (!diagramId) return;
    isLoading = true;

    try {
      const fetchPromise = supabase
        .from('diagram_versions')
        .select('*')
        .eq('diagram_id', diagramId)
        .order('version_number', { ascending: false });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), 2000)
      );

      const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (error) throw error;
      if (data && data.length > 0) {
        versions = data;
        activeVersion = data[0];
      } else {
        versions = [];
        activeVersion = null;
      }
    } catch (err) {
      console.warn('Database version fetch error:', err);
      versions = [];
      activeVersion = null;
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (!open) {
      lastRenderedCode = '';
      return;
    }

    const targetCode = activeTab === 'database' ? activeVersion?.code : activeLocalEdit?.code;
    const mode = viewMode;

    if (open && mode === 'diagram' && targetCode !== undefined) {
      if (targetCode === lastRenderedCode && previewContainer?.children.length) return;
      lastRenderedCode = targetCode || '';

      untrack(() => {
        resetZoom();
        if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(() => {
          renderVersionPreview(targetCode || '');
        }, 50);
      });
    }
  });

  async function renderVersionPreview(codeToRender: string) {
    if (!previewContainer) return;
    isRendering = true;
    previewError = null;

    if (!codeToRender || !codeToRender.trim()) {
      previewContainer.innerHTML = '';
      isRendering = false;
      return;
    }

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        flowchart: { htmlLabels: false }
      });

      const isValid = await mermaid.parse(codeToRender, { suppressErrors: true });
      if (!isValid) {
        throw new Error('Syntax error in diagram code');
      }

      const renderId = `ver-prev-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaid.render(renderId, codeToRender);

      const tempEl = document.getElementById(renderId) || document.getElementById(`d${renderId}`);
      if (tempEl) tempEl.remove();

      if (previewContainer) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');

        if (svgEl) {
          svgEl.removeAttribute('style');
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
          svgEl.setAttribute('width', '100%');
          svgEl.setAttribute('height', '100%');
          svgEl.style.width = '100%';
          svgEl.style.height = '100%';
          svgEl.style.maxWidth = '100%';
          svgEl.style.maxHeight = '100%';
          previewContainer.innerHTML = svgEl.outerHTML;
        } else {
          previewContainer.innerHTML = svg;
        }
      }
    } catch (err: any) {
      previewError = err?.message || 'Syntax error in code preview';
    } finally {
      isRendering = false;
    }
  }

  async function handleCreateSnapshot() {
    if (!diagramId || !snapshotTag.trim()) return;
    isSavingSnapshot = true;
    const nextVerNum = (versions[0]?.version_number || 0) + 1;
    const tagText = snapshotTag.trim();
    snapshotTag = '';

    const localSnapshot: DiagramVersion = {
      id: `ver-snap-${Date.now()}`,
      diagram_id: diagramId,
      version_number: nextVerNum,
      title: tagText,
      code: currentCode,
      edited_by_email: userEmail || 'you@domain.com',
      edited_by_name: 'You',
      change_summary: `Snapshot: ${tagText}`,
      created_at: new Date().toISOString()
    };

    versions = [localSnapshot, ...versions];
    activeVersion = localSnapshot;

    const newVersion = {
      diagram_id: diagramId,
      version_number: nextVerNum,
      title: tagText,
      code: currentCode,
      edited_by_email: userEmail || 'you@domain.com',
      edited_by_name: 'You',
      change_summary: `Snapshot: ${tagText}`
    };

    try {
      const insertPromise = supabase
        .from('diagram_versions')
        .insert(newVersion)
        .select()
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Insert timeout')), 2000)
      );

      const { data, error } = (await Promise.race([insertPromise, timeoutPromise])) as any;
      if (!error && data) {
        versions = versions.map((v) => (v.id === localSnapshot.id ? data : v));
        activeVersion = data;
      }
    } catch (err) {
      console.warn('Snapshot preserved locally:', err);
    } finally {
      isSavingSnapshot = false;
    }
  }

  async function handleRestoreClick() {
    const codeToRestore = activeTab === 'database' ? activeVersion?.code : activeLocalEdit?.code;
    if (!codeToRestore || !diagramId) return;

    isRestoring = true;
    onRestore(codeToRestore);

    if (activeTab === 'database' && activeVersion) {
      const nextVerNum = (versions[0]?.version_number || 0) + 1;
      const restoreEntry = {
        diagram_id: diagramId,
        version_number: nextVerNum,
        title: `Restored v${activeVersion.version_number}`,
        code: codeToRestore,
        edited_by_email: userEmail || 'you@domain.com',
        edited_by_name: 'You',
        change_summary: `Restored from version v${activeVersion.version_number}`
      };

      Promise.resolve(supabase.from('diagram_versions').insert(restoreEntry)).catch(() => {});
    }

    setTimeout(() => {
      isRestoring = false;
      onclose();
    }, 100);
  }

  async function copyCodeToClipboard() {
    const codeToCopy = activeItem?.code;
    if (!codeToCopy) return;

    try {
      await navigator.clipboard.writeText(codeToCopy);
      copiedCode = true;
      setTimeout(() => (copiedCode = false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }

  function formatTimeAgo(isoDate: string) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  }
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden select-none animate-in fade-in duration-200">
    <div class="absolute inset-0" onclick={onclose} role="presentation"></div>

    <div class="relative w-full max-w-6xl h-[88vh] rounded-3xl bg-[#0C0D12] border border-white/15 shadow-2xl overflow-hidden flex flex-col z-10 font-['Instrument_Sans',sans-serif]">
      <!-- Top Header Bar -->
      <div class="flex items-center justify-between px-6 py-3.5 border-b border-white/10 shrink-0 bg-[#090A0F]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <History size={16} />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white tracking-tight">Version Timeline</h3>
          </div>
        </div>

        <!-- User Friendly Segmented Tab Controls -->
        <div class="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 font-['IBM_Plex_Mono',monospace]">
          <button
            type="button"
            onclick={() => {
              activeTab = 'database';
              if (!activeVersion && versions.length > 0) activeVersion = versions[0];
            }}
            class="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 {activeTab === 'database' ? 'bg-amber-400 text-black shadow-md font-bold' : 'text-white/60 hover:text-white hover:bg-white/10'}"
          >
            <Database size={13} />
            <span>Named Snapshots ({versions.length})</span>
          </button>

          <button
            type="button"
            onclick={() => {
              activeTab = 'local';
              if (!activeLocalEdit && localEdits.length > 0) activeLocalEdit = localEdits[0];
            }}
            class="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 {activeTab === 'local' ? 'bg-amber-400 text-black shadow-md font-bold' : 'text-white/60 hover:text-white hover:bg-white/10'}"
          >
            <Clock size={13} />
            <span>Auto-Saved Revisions ({localEdits.length})</span>
          </button>
        </div>

        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Main Dual-Pane Body -->
      <div class="flex-1 flex min-h-0">
        <!-- Left Sidebar: Revision List -->
        <div class="w-80 border-r border-white/10 bg-[#08090D] p-3.5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar space-y-3">
          {#if activeTab === 'database'}
            <!-- Quick Save Input -->
            <div class="flex gap-1.5 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <input
                type="text"
                bind:value={snapshotTag}
                placeholder="Name cloud snapshot..."
                class="flex-1 px-3 py-1 text-xs rounded-xl border border-transparent bg-[#0F1117] text-white focus:outline-none focus:border-white/20"
              />
              <button
                type="button"
                onclick={handleCreateSnapshot}
                disabled={!snapshotTag.trim() || isSavingSnapshot}
                class="px-3 py-1 text-xs font-bold rounded-xl bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                Save
              </button>
            </div>

            {#if isLoading && versions.length === 0}
              <div class="flex flex-col items-center justify-center py-12 text-white/40 space-y-2">
                <Loader2 size={18} class="animate-spin text-amber-400" />
                <span class="text-xs">Loading snapshots...</span>
              </div>
            {:else if versions.length === 0}
              <div class="py-12 text-center text-white/40 text-xs space-y-2">
                <Database size={20} class="mx-auto text-white/20" />
                <p class="font-bold text-white/60">No Named Snapshots</p>
                <p class="text-[11px] text-white/40 max-w-[200px] mx-auto">Save a named cloud snapshot above to create a restore point.</p>
              </div>
            {:else}
              <div class="space-y-1.5">
                {#each versions as ver (ver.id)}
                  {@const isActive = activeVersion?.id === ver.id}
                  <button
                    type="button"
                    onclick={() => (activeVersion = ver)}
                    class="w-full px-3.5 py-3 rounded-2xl border text-left transition-all cursor-pointer group {isActive ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-sm' : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/5 hover:border-white/15'}"
                  >
                    <div class="flex items-center justify-between gap-1 mb-1">
                      <span class="text-xs font-bold truncate {isActive ? 'text-amber-400' : 'text-white'}">v{ver.version_number} — {ver.title}</span>
                      <span class="text-[10px] text-white/40 font-['IBM_Plex_Mono',monospace] shrink-0">{formatTimeAgo(ver.created_at)}</span>
                    </div>

                    <div class="text-[11px] text-white/50 truncate">
                      {ver.edited_by_email}
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          {:else}
            <!-- Auto-Saved Local Session Revisions -->
            {#if localEdits.length === 0}
              <div class="py-12 text-center text-white/40 text-xs space-y-2">
                <Clock size={20} class="mx-auto text-white/20" />
                <p>No auto-saved revisions recorded yet in this session.</p>
              </div>
            {:else}
              <div class="space-y-1.5">
                {#each localEdits as edit (edit.id)}
                  {@const isActive = activeLocalEdit?.id === edit.id}
                  <button
                    type="button"
                    onclick={() => (activeLocalEdit = edit)}
                    class="w-full px-3.5 py-3 rounded-2xl border text-left transition-all cursor-pointer group {isActive ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-sm' : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/5 hover:border-white/15'}"
                  >
                    <div class="flex items-center justify-between gap-1 mb-1">
                      <span class="text-xs font-bold truncate {isActive ? 'text-emerald-400' : 'text-white'}">{edit.summary}</span>
                      <span class="text-[10px] text-white/40 font-['IBM_Plex_Mono',monospace] shrink-0">{formatTimeAgo(edit.timestamp)}</span>
                    </div>

                    <div class="text-[10.5px] text-white/50 font-['IBM_Plex_Mono',monospace]">
                      {edit.charCount} characters
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        <!-- Right Interactive Preview & Controls Pane -->
        <div class="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-[#06070A] p-5 relative">
          {#if activeItem}
            <!-- Top Control Bar -->
            <div class="flex items-center justify-between gap-3 mb-3 shrink-0 w-full min-w-0 overflow-hidden">
              <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold font-['IBM_Plex_Mono',monospace] shrink-0 {activeTab === 'database' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}">
                  {activeTab === 'database' ? `Snapshot v${activeVersion?.version_number}` : 'Auto-Saved'}
                </span>
                <h4 class="text-sm font-bold text-white truncate min-w-0 flex-1">
                  {activeTab === 'database' ? activeVersion?.title : activeLocalEdit?.summary}
                </h4>
                <span class="text-xs text-white/40 shrink-0 hidden md:inline">({formatTimeAgo(activeTab === 'database' ? activeVersion?.created_at || '' : activeLocalEdit?.timestamp || '')})</span>
              </div>

              <!-- Top Actions: Copy Code, View Mode, Restore -->
              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onclick={copyCodeToClipboard}
                  class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {#if copiedCode}
                    <Check size={13} class="text-emerald-400" />
                    <span class="text-emerald-400">Copied!</span>
                  {:else}
                    <Copy size={13} class="text-amber-400" />
                    <span>Copy Code</span>
                  {/if}
                </button>

                <button
                  type="button"
                  onclick={() => (viewMode = viewMode === 'diagram' ? 'code' : 'diagram')}
                  class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {#if viewMode === 'code'}
                    <Eye size={13} class="text-amber-400" />
                    <span>View Diagram</span>
                  {:else}
                    <Code2 size={13} class="text-amber-400" />
                    <span>View Code</span>
                  {/if}
                </button>

                <button
                  type="button"
                  onclick={handleRestoreClick}
                  disabled={isRestoring}
                  class="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RotateCcw size={13} />
                  <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                </button>
              </div>
            </div>

            {#if viewMode === 'diagram'}
              <!-- Interactive Pan & Zoom Diagram Viewport -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                onwheel={handleWheel}
                onpointerdown={handlePointerDown}
                onpointermove={handlePointerMove}
                onpointerup={handlePointerUp}
                onpointercancel={handlePointerUp}
                class="flex-1 relative rounded-2xl bg-[#090A0F] border border-white/10 p-4 flex items-center justify-center overflow-hidden transition-all select-none {isPanning ? 'cursor-grabbing' : 'cursor-grab'}"
              >
                {#if isRendering}
                  <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090A0F]/90 backdrop-blur-sm text-white/50 space-y-2">
                    <Loader2 size={22} class="animate-spin text-amber-400" />
                    <span class="text-xs font-medium">Rendering diagram...</span>
                  </div>
                {/if}

                {#if previewError}
                  <div class="absolute inset-0 z-20 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs overflow-auto">
                    <p class="font-bold mb-1">Preview Syntax Error:</p>
                    <p class="font-mono">{previewError}</p>
                  </div>
                {/if}

                <!-- Scaled & Panned SVG Inner Box -->
                <div
                  class="w-full h-full flex items-center justify-center"
                  style="transform: translate3d({panX}px, {panY}px, 0) scale({scale}); transform-origin: center center; will-change: transform;"
                >
                  <div bind:this={previewContainer} class="ver-preview-wrapper"></div>
                </div>

                <!-- Floating Zoom & Pan Controls Pill -->
                <div class="absolute bottom-4 right-4 z-30 flex items-center gap-1 p-1 rounded-xl border border-white/15 bg-[#12141C]/90 backdrop-blur-md text-white/80 shadow-lg text-xs font-['IBM_Plex_Mono',monospace]">
                  <button
                    type="button"
                    onclick={() => (scale = Math.max(0.3, scale - 0.15))}
                    title="Zoom Out"
                    class="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <Minus size={13} />
                  </button>
                  <button
                    type="button"
                    onclick={resetZoom}
                    title="Reset Zoom & Pan"
                    class="px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] font-bold text-amber-400 transition-colors cursor-pointer"
                  >
                    {Math.round(scale * 100)}%
                  </button>
                  <button
                    type="button"
                    onclick={() => (scale = Math.min(4.0, scale + 0.15))}
                    title="Zoom In"
                    class="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            {:else}
              <!-- Full-Height Scrollable Code Container (Horizontal & Vertical Scrollable) -->
              <div class="w-full max-w-full flex-1 flex flex-col min-h-0 min-w-0 relative rounded-2xl bg-[#090A0F] border border-white/10 p-4 overflow-hidden font-['IBM_Plex_Mono',monospace] animate-in fade-in duration-150">
                <div class="flex items-center justify-between pb-3 mb-2 border-b border-white/10 shrink-0 text-xs text-white/60">
                  <div class="flex items-center gap-2">
                    <FileCode size={14} class="text-amber-400" />
                    <span class="font-bold text-white">Mermaid Code Syntax</span>
                    <span>({activeItem.code.length} characters)</span>
                  </div>
                </div>

                <!-- Scrollable Code Block with Sticky Line Numbers (Horizontal + Vertical Scrolling) -->
                <div class="w-full max-w-full flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar p-3 rounded-xl bg-black/60 border border-white/5 flex font-['IBM_Plex_Mono',monospace] relative">
                  <!-- Line Numbers Column (Seamless background & no vertical border) -->
                  <div class="sticky left-0 py-0.5 pl-2 pr-3 text-right text-white/20 select-none min-w-[36px] text-[12px] leading-[22px] shrink-0 font-mono bg-black/60 z-10 self-start">
                    {#each codeLines as _, i}
                      <div>{i + 1}</div>
                    {/each}
                  </div>

                  <!-- Code Content -->
                  <div class="py-0.5 pl-3 pr-4 flex-1 min-w-0">
                    <pre class="w-max min-w-full text-[12.5px] leading-[22px] font-['IBM_Plex_Mono',monospace] text-emerald-400 whitespace-pre font-mono select-all">{activeItem.code}</pre>
                  </div>
                </div>
              </div>
            {/if}
          {:else}
            <!-- Empty State when no version / snapshot selected -->
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                <History size={24} />
              </div>
              <div class="space-y-1 max-w-sm">
                <h4 class="text-sm font-bold text-white">No Version Selected</h4>
                <p class="text-xs text-white/50 leading-relaxed">
                  Enter a snapshot name on the left and click <strong class="text-amber-400">Save</strong> to record your first named cloud checkpoint.
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.ver-preview-wrapper) {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
    position: relative !important;
  }

  :global(.ver-preview-wrapper svg) {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: contain !important;
    display: block !important;
    margin: auto !important;
  }
</style>
