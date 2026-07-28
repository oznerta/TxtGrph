<script lang="ts">
  import { onMount } from 'svelte';
  import mermaid from 'mermaid';
  import {
    PanelLeft,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Download,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    Sparkles,
    Share2,
    Code,
    Hand,
    Palette,
    X,
    ChevronDown,
    ArrowDown,
    ArrowUp,
    ArrowRight,
    ArrowLeft,
    Network,
    GitFork,
    Check,
    Sun,
    Moon,
    FolderKanban,
    BookOpen,
    Copy,
    MoreVertical,
    Pencil,
    FolderOutput,
    Trash2,
    History,
    MessageSquare,
    Lock,
    RefreshCw
  } from 'lucide-svelte';
  import FavoriteIcon from '$lib/components/ui/FavoriteIcon.svelte';
  import ActivePresenceStack from '$lib/components/workspace/ActivePresenceStack.svelte';

  interface Props {
    code: string;
    title: string;
    readOnly?: boolean;
    saveStatus?: 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';
    isFavorite?: boolean;
    folderName?: string | null;
    isSharedSpace?: boolean;
    allowComments?: boolean;
    allowTimeline?: boolean;
    allowForking?: boolean;
    isLoggedIn?: boolean;
    autoSaveEnabled?: boolean;
    onToggleSidebar?: () => void;
    onCodeChange?: (newCode: string) => void;
    onTitleChange?: (newTitle: string) => void;
    onToggleFavorite?: () => void;
    onOpenComments?: () => void;
    onOpenHistory?: () => void;
    onOpenShare?: () => void;
    onOpenExport?: () => void;
    onOpenTemplates?: () => void;
    onOpenAI?: () => void;
    onDuplicate?: () => void;
    onMove?: () => void;
    onDelete?: () => void;
    onFork?: () => void;
  }

  let {
    code = $bindable(''),
    title = 'Untitled Diagram',
    readOnly = false,
    saveStatus = 'saved',
    isFavorite = false,
    folderName = '',
    isSharedSpace = false,
    allowComments = true,
    allowTimeline = true,
    allowForking = true,
    isLoggedIn = true,
    autoSaveEnabled = $bindable(true),
    onToggleSidebar,
    onCodeChange,
    onTitleChange,
    onToggleFavorite,
    onOpenComments,
    onOpenHistory,
    onOpenShare,
    onOpenExport,
    onOpenTemplates,
    onOpenAI,
    onDuplicate,
    onMove,
    onDelete,
    onFork
  }: Props = $props();

  let canvasContainer = $state<HTMLDivElement | null>(null);
  let svgContent = $state<string>('');
  let renderError = $state<string | null>(null);
  let isRendering = $state<boolean>(true);

  // Viewport Controls
  let zoomScale = $state<number>(1.0);
  let panX = $state<number>(0);
  let panY = $state<number>(0);
  let isPanning = $state<boolean>(false);
  let startPanX = 0;
  let startPanY = 0;

  // UI States
  let editorCollapsed = $state<boolean>(false);
  let headerMenuOpen = $state<boolean>(false);
  let actionsMenuOpen = $state<boolean>(false);
  let activeToolbarPopover = $state<'none' | 'theme' | 'direction' | 'layout'>('none');
  let isEditingTitle = $state<boolean>(false);
  /* svelte-ignore state_referenced_locally */
  let titleInput = $state<string>(title);
  let copiedError = $state<boolean>(false);
  let isCanvasFullscreen = $state<boolean>(false);

  // Styling & Theme Presets
  let selectedMermaidTheme = $state<string>('dark');
  let canvasMode = $state<'dark' | 'light'>('dark');
  let canvasPattern = $state<'dots' | 'grid' | 'crosses' | 'solid'>('dots');
  let selectedFontFamily = $state<string>('Public Sans, sans-serif');
  let currentDirection = $state<'TD' | 'LR' | 'RL' | 'BT'>('TD');
  let currentLayoutAlgorithm = $state<'hierarchical' | 'adaptive'>('hierarchical');
  let isAutoLayoutEnabled = $state<boolean>(true);
  let activeInteractionMode = $state<'select' | 'pan'>('select');

  let lineNumbers = $derived.by(() => {
    const count = (code || '').split('\n').length;
    return Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  });

  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let lineNumbersEl = $state<HTMLDivElement | null>(null);

  function handleEditorScroll() {
    if (textareaEl && lineNumbersEl) {
      lineNumbersEl.scrollTop = textareaEl.scrollTop;
    }
  }

  let renderDebounceTimer: any = null;

  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: selectedMermaidTheme as any,
      securityLevel: 'loose',
      fontFamily: selectedFontFamily
    });

    queueRender();
  });

  $effect(() => {
    if (code || selectedMermaidTheme || canvasMode || selectedFontFamily) {
      queueRender();
    }
  });

  function queueRender() {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
      renderDiagram();
    }, 50);
  }

  async function renderDiagram() {
    if (!code || !code.trim()) {
      isRendering = false;
      svgContent = '';
      if (canvasContainer) canvasContainer.innerHTML = '';
      return;
    }

    isRendering = true;
    renderError = null;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: selectedMermaidTheme as any,
        securityLevel: 'loose',
        fontFamily: selectedFontFamily,
        flowchart: { htmlLabels: false, useMaxWidth: false },
        sequence: { useMaxWidth: false },
        gantt: { useMaxWidth: false }
      });

      const isValid = await mermaid.parse(code, { suppressErrors: true });
      if (!isValid) {
        throw new Error('Syntax error in Mermaid diagram');
      }

      const renderId = `canvas-mermaid-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaid.render(renderId, code);

      // Clean up temporary DOM elements created by Mermaid in document body
      const tempEl = document.getElementById(renderId) || document.getElementById(`d${renderId}`);
      if (tempEl) tempEl.remove();

      let cleanSvg = svg;
      if (cleanSvg) {
        cleanSvg = cleanSvg.replace(
          /<svg\b([^>]*)>/i,
          (match, attrs) => `<svg ${attrs} shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="crisp-edges">`
        );
      }

      svgContent = cleanSvg;
      if (canvasContainer) {
        canvasContainer.innerHTML = cleanSvg;
      }
    } catch (err: any) {
      console.warn('Mermaid render warning:', err);
      renderError = err?.str || err?.message || 'Syntax error in Mermaid diagram';
    } finally {
      isRendering = false;
    }
  }

  function handleInput(e: Event) {
    if (readOnly) return;
    const val = (e.target as HTMLTextAreaElement).value;
    code = val;
    if (onCodeChange) onCodeChange(val);
  }

  function zoomIn() {
    const step = zoomScale < 1.0 ? 0.1 : (zoomScale < 3.0 ? 0.25 : 0.5);
    zoomScale = Math.min(10.0, Math.round((zoomScale + step) * 100) / 100);
  }

  function zoomOut() {
    const step = zoomScale <= 1.0 ? 0.1 : (zoomScale <= 3.0 ? 0.25 : 0.5);
    zoomScale = Math.max(0.1, Math.round((zoomScale - step) * 100) / 100);
  }

  function resetZoom() {
    zoomScale = 1.0;
    panX = 0;
    panY = 0;
  }

  function startPan(e: MouseEvent) {
    if ((activeInteractionMode === 'pan' && e.button === 0) || e.button === 2 || e.button === 1) {
      if (e.button === 2 || e.button === 1) {
        e.preventDefault();
      }
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;

      window.addEventListener('mousemove', onPanMove);
      window.addEventListener('mouseup', endPan);
    }
  }

  function onPanMove(e: MouseEvent) {
    if (isPanning) {
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
    }
  }

  function endPan() {
    if (isPanning) {
      isPanning = false;
      window.removeEventListener('mousemove', onPanMove);
      window.removeEventListener('mouseup', endPan);
    }
  }

  function handleCanvasWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomScale = Math.min(10.0, Math.max(0.1, Math.round(zoomScale * zoomFactor * 100) / 100));
    } else {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }
  }

  function toggleCanvasFullscreen() {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          isCanvasFullscreen = true;
        }).catch(() => {
          isCanvasFullscreen = true;
        });
      } else {
        document.exitFullscreen().then(() => {
          isCanvasFullscreen = false;
        }).catch(() => {
          isCanvasFullscreen = false;
        });
      }
    }
  }

  function setDirection(newDir: 'TD' | 'LR' | 'RL' | 'BT') {
    currentDirection = newDir;
    activeToolbarPopover = 'none';
    if (!readOnly) {
      const newCode = code.replace(/^(graph|flowchart)\s+(TD|TB|LR|RL|BT)/m, `$1 ${newDir}`);
      code = newCode;
      if (onCodeChange) onCodeChange(newCode);
    }
  }

  function changeMermaidTheme(newTheme: string) {
    selectedMermaidTheme = newTheme;
  }

  function toggleCanvasMode(mode: 'dark' | 'light') {
    canvasMode = mode;
    if (mode === 'light' && selectedMermaidTheme === 'dark') {
      selectedMermaidTheme = 'default';
    } else if (mode === 'dark' && selectedMermaidTheme === 'default') {
      selectedMermaidTheme = 'dark';
    }
  }

  function setDiagramFont(font: string) {
    selectedFontFamily = font;
  }

  function toggleAutoLayout() {
    isAutoLayoutEnabled = !isAutoLayoutEnabled;
  }

  function toggleToolbarPopover(popover: 'none' | 'theme' | 'direction' | 'layout') {
    activeToolbarPopover = activeToolbarPopover === popover ? 'none' : popover;
  }

  function handleSaveTitle() {
    isEditingTitle = false;
    if (onTitleChange && titleInput.trim()) {
      onTitleChange(titleInput.trim());
    }
  }

  function copyErrorToClipboard() {
    if (renderError) {
      navigator.clipboard.writeText(renderError);
      copiedError = true;
      setTimeout(() => (copiedError = false), 2000);
    }
  }

  let canvasBgStyle = $derived.by(() => {
    if (canvasMode === 'dark') {
      if (canvasPattern === 'dots') return 'background-color: #0B0C10; background-image: radial-gradient(rgba(255, 255, 255, 0.22) 1.2px, transparent 1.2px); background-size: 20px 20px;';
      if (canvasPattern === 'grid') return 'background-color: #0B0C10; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px); background-size: 24px 24px;';
      if (canvasPattern === 'crosses') return 'background-color: #0B0C10; background-image: radial-gradient(rgba(255, 255, 255, 0.3) 1.5px, transparent 1.5px); background-size: 28px 28px;';
      return 'background-color: #0B0C10;';
    } else {
      if (canvasPattern === 'dots') return 'background-color: #F8FAFC; background-image: radial-gradient(rgba(0, 0, 0, 0.25) 1.2px, transparent 1.2px); background-size: 20px 20px;';
      if (canvasPattern === 'grid') return 'background-color: #F8FAFC; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 1px, transparent 1px); background-size: 24px 24px;';
      if (canvasPattern === 'crosses') return 'background-color: #F8FAFC; background-image: radial-gradient(rgba(0, 0, 0, 0.35) 1.5px, transparent 1.5px); background-size: 28px 28px;';
      return 'background-color: #F8FAFC;';
    }
  });
</script>

<div class="flex h-full w-full flex-1 min-w-0 flex-col overflow-hidden bg-[#090A0F] text-white antialiased font-['Instrument_Sans',sans-serif]">
  <!-- Top Workspace Header Bar -->
  <header class="h-14 bg-[#0B0C10] border-b border-white/10 px-4 flex items-center justify-between shrink-0 select-none z-[80] relative font-['Instrument_Sans',sans-serif] min-w-0 overflow-visible">
    <!-- Left Breadcrumb & Sidebar Toggle -->
    <div class="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
      {#if onToggleSidebar}
        <button
          onclick={onToggleSidebar}
          class="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Toggle Sidebar"
        >
          <PanelLeft size={18} />
        </button>
      {/if}

      <div class="flex items-center gap-2 text-xs min-w-0 overflow-hidden">
        <span class="text-emerald-400 font-bold shrink-0">{isSharedSpace ? 'Shared Space' : 'Personal files'}</span>

        {#if folderName}
          <span class="text-white/25 shrink-0">/</span>
          <span class="text-emerald-400 font-medium truncate max-w-[120px] sm:max-w-[180px]">{folderName}</span>
        {/if}

        <span class="text-white/25 shrink-0">/</span>

        {#if isEditingTitle && !readOnly}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            type="text"
            bind:value={titleInput}
            onblur={handleSaveTitle}
            onkeydown={(e) => e.key === 'Enter' && handleSaveTitle()}
            class="h-7 px-2 text-[13px] font-semibold rounded-lg bg-[#161824] border border-white/30 text-white focus:outline-none min-w-[100px] max-w-[180px]"
            autofocus
          />
        {:else}
          <span
            onclick={() => !readOnly && (isEditingTitle = true)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && !readOnly && (isEditingTitle = true)}
            class="text-white font-semibold truncate max-w-[120px] sm:max-w-[220px] {readOnly ? '' : 'cursor-pointer hover:underline'}"
            title={title}
          >
            {title}
          </span>
        {/if}

        <!-- Save Status Badge & Auto-Save Toggle -->
        {#if !readOnly}
          <div class="inline-flex items-center gap-1.5 ml-1 shrink-0">
            <button
              type="button"
              onclick={() => (autoSaveEnabled = !autoSaveEnabled)}
              title={autoSaveEnabled ? 'Auto-Save is ON. Click to switch to manual save mode.' : 'Auto-Save is OFF. Press Ctrl+S to save manual snapshots.'}
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-['IBM_Plex_Mono',monospace] border transition-all cursor-pointer {autoSaveEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}"
            >
              <span class="w-1.5 h-1.5 rounded-full {autoSaveEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
              <span>{autoSaveEnabled ? 'Auto-Save' : 'Manual (Ctrl+S)'}</span>
            </button>

            {#if saveStatus === 'saving'}
              <span class="inline-flex items-center gap-1 text-[11px] text-white/40 font-['IBM_Plex_Mono',monospace]">
                <Loader2 size={11} class="animate-spin text-amber-400" /> Saving...
              </span>
            {:else if saveStatus === 'saved'}
              <span class="inline-flex items-center gap-1 text-[11px] text-emerald-400/80 font-medium font-['IBM_Plex_Mono',monospace]">
                <CheckCircle2 size={11} /> Saved
              </span>
            {:else if saveStatus === 'unsaved'}
              <span class="inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-medium font-['IBM_Plex_Mono',monospace]">
                <AlertCircle size={11} /> Unsaved
              </span>
            {/if}
          </div>
        {/if}

        {#if readOnly}
          <span class="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold ml-1 font-['IBM_Plex_Mono',monospace] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
            <Lock size={10} /> Read-Only
          </span>
        {/if}
      </div>
    </div>

    <!-- Right Header Tools -->
    <div class="flex items-center gap-2 shrink-0 ml-2">
      <!-- Live Active Presence Avatar Stack -->
      <ActivePresenceStack />

      {#if onOpenShare}
        <button
          onclick={onOpenShare}
          title="Share Diagram & Invite Collaborators"
          class="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      {/if}

      {#if readOnly && allowForking}
        <button
          onclick={() => {
            if (isLoggedIn && onFork) {
              onFork();
            } else {
              window.location.href = '/auth';
            }
          }}
          title={isLoggedIn ? 'Fork diagram to your personal workspace' : 'Sign in to fork diagram'}
          class="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <GitFork size={14} />
          <span>{isLoggedIn ? 'Fork Diagram' : 'Sign In to Fork'}</span>
        </button>
      {/if}

      {#if onOpenComments && allowComments}
        <button
          onclick={onOpenComments}
          title="Team Comments & Annotations"
          class="p-2 rounded-lg text-white/50 hover:text-amber-400 hover:bg-white/10 transition-all cursor-pointer"
        >
          <MessageSquare size={16} />
        </button>
      {/if}

      {#if onOpenHistory && allowTimeline}
        <button
          onclick={onOpenHistory}
          title="Version History & Edit Timeline"
          class="p-2 rounded-lg text-white/50 hover:text-amber-400 hover:bg-white/10 transition-all cursor-pointer"
        >
          <History size={16} />
        </button>
      {/if}

      {#if onToggleFavorite && (isLoggedIn || !readOnly)}
        <button
          onclick={onToggleFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          class="p-2 rounded-lg transition-all hover:bg-white/10 cursor-pointer"
        >
          <FavoriteIcon active={isFavorite} size={16} />
        </button>
      {/if}

      <div class="relative">
        <button
          onclick={() => (headerMenuOpen = !headerMenuOpen)}
          title="Diagram actions"
          class="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <MoreVertical size={16} />
        </button>

        {#if headerMenuOpen}
          <div class="fixed inset-0 z-[90]" onclick={() => (headerMenuOpen = false)} role="presentation"></div>
          <div class="absolute right-0 top-full mt-2 w-52 rounded-[14px] bg-[#1A1C28] border border-white/15 shadow-2xl p-1.5 z-[100] text-[13px] text-left font-['Instrument_Sans',sans-serif] select-none">
            {#if !readOnly}
              <button
                onclick={() => { isEditingTitle = true; headerMenuOpen = false; }}
                class="w-full px-3 py-2.5 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Rename</span>
                <Pencil size={15} class="text-white/40" />
              </button>
            {/if}

            {#if onDuplicate}
              <button
                onclick={() => { onDuplicate(); headerMenuOpen = false; }}
                class="w-full px-3 py-2.5 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Duplicate</span>
                <Copy size={15} class="text-white/40" />
              </button>
            {/if}

            {#if onMove}
              <button
                onclick={() => { onMove(); headerMenuOpen = false; }}
                class="w-full px-3 py-2.5 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Move</span>
                <FolderOutput size={15} class="text-white/40" />
              </button>
            {/if}

            {#if onOpenHistory && allowTimeline}
              <button
                onclick={() => { onOpenHistory(); headerMenuOpen = false; }}
                class="w-full px-3 py-2.5 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Version Timeline</span>
                <History size={15} class="text-white/40" />
              </button>
            {/if}

            {#if onOpenTemplates && !readOnly}
              <button
                onclick={() => { onOpenTemplates(); headerMenuOpen = false; }}
                class="w-full px-3 py-2.5 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Templates</span>
                <BookOpen size={15} class="text-white/40" />
              </button>
            {/if}

            {#if onOpenExport}
              <button
                onclick={() => { onOpenExport(); headerMenuOpen = false; }}
                class="w-full px-3 py-2.5 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Export Diagram</span>
                <Download size={15} class="text-white/40" />
              </button>
            {/if}

            {#if onDelete && !readOnly}
              <div class="my-1 border-t border-white/10"></div>
              <button
                onclick={() => { onDelete(); headerMenuOpen = false; }}
                class="w-full px-3 py-2.5 rounded-[10px] flex items-center justify-between text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <span>Delete</span>
                <Trash2 size={15} class="text-red-400/60" />
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </header>

  <!-- Interactive Canvas Area -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    onmousedown={startPan}
    onmousemove={onPanMove}
    onmouseup={endPan}
    onmouseleave={endPan}
    oncontextmenu={(e) => e.preventDefault()}
    onwheel={handleCanvasWheel}
    role="region"
    tabindex="0"
    aria-label="Interactive Diagram Canvas"
    class="flex-1 relative overflow-hidden flex flex-col items-center justify-center select-none transition-all duration-200 {isPanning ? 'cursor-grabbing' : (activeInteractionMode === 'pan' ? 'cursor-grab' : 'cursor-default')}"
    style={canvasBgStyle}
  >

    <!-- Floating Code Editor Card -->
    {#if !editorCollapsed}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        role="presentation"
        onwheel={(e) => e.stopPropagation()}
        onmousedown={(e) => e.stopPropagation()}
        class="absolute z-[60] top-6 left-6 w-[330px] h-[510px] min-w-[280px] min-h-[200px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl bg-[#0E1017]/95 border border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] font-['IBM_Plex_Mono',monospace] resize overflow-hidden select-none hover:border-white/25 transition-colors"
      >
        <div class="h-11 px-3.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div class="flex items-center gap-2.5">
            <div class="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Code size={14} class="text-amber-400" />
            </div>
            <span class="text-[13px] font-semibold text-white tracking-wide">Code Editor</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60 font-medium">Mermaid</span>
          </div>

          <button
            onclick={() => (editorCollapsed = true)}
            title="Close Code Editor"
            class="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div class="flex-1 flex font-['IBM_Plex_Mono',monospace] text-[13px] leading-[22px] overflow-hidden bg-[#0A0B0E]/90 relative">
          <div
            bind:this={lineNumbersEl}
            class="py-3.5 pl-3.5 pr-2 text-right text-white/20 select-none min-w-[36px] text-[12px] leading-[22px] overflow-hidden shrink-0"
          >
            {#each lineNumbers as lineNum}
              <div>{lineNum}</div>
            {/each}
          </div>

          <textarea
            bind:this={textareaEl}
            onscroll={handleEditorScroll}
            value={code}
            oninput={handleInput}
            readonly={readOnly}
            spellcheck="false"
            wrap="off"
            class="flex-1 py-3.5 pr-4 pl-3 bg-transparent text-[13px] leading-[22px] text-white/90 focus:outline-none font-['IBM_Plex_Mono',monospace] custom-scrollbar overflow-x-auto overflow-y-auto whitespace-pre w-full h-full {readOnly ? 'cursor-default text-white/60' : 'cursor-text'}"
            placeholder="Type Mermaid syntax here..."
          ></textarea>
        </div>
      </div>
    {:else}
      <button
        onclick={() => (editorCollapsed = false)}
        class="absolute top-6 left-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#12141C]/90 border border-white/15 backdrop-blur-xl text-white hover:bg-[#1E2132] transition-all shadow-2xl text-[13px] font-semibold font-['IBM_Plex_Mono',monospace] cursor-pointer"
      >
        <Code size={16} class="text-amber-400" />
        <span>Code Editor</span>
      </button>
    {/if}

    <!-- Canvas Error Banner -->
    {#if renderError}
      <div class="absolute top-6 inset-x-0 z-[75] flex justify-center pointer-events-none px-4">
        <div class="pointer-events-auto max-w-xl w-full px-4.5 py-3 rounded-2xl bg-[#1A0B0E]/95 border border-red-500/40 shadow-2xl backdrop-blur-xl text-red-200 text-[12.5px] font-['IBM_Plex_Mono',monospace] flex items-start gap-3 animate-in fade-in duration-150 select-text">
          <AlertCircle size={18} class="text-red-400 shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <div class="font-bold text-red-300 text-[12px] mb-0.5">Mermaid Syntax Error</div>
            <div class="text-[11.5px] text-red-200/90 leading-relaxed break-words max-h-32 overflow-y-auto custom-scrollbar select-text">
              {renderError}
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              onclick={copyErrorToClipboard}
              class="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 hover:text-white hover:bg-red-500/30 transition-all text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={13} />
              <span>{copiedError ? 'Copied!' : 'Copy Error'}</span>
            </button>
            <button
              onclick={() => (renderError = null)}
              class="p-1.5 rounded-lg text-red-300/60 hover:text-red-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Floating AI Action Pill -->
    {#if onOpenAI && !readOnly}
      <div class="absolute bottom-6 left-6 z-40">
        <button
          onclick={onOpenAI}
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-[#161824]/90 hover:bg-[#1E2132] backdrop-blur-xl text-white transition-all cursor-pointer font-['IBM_Plex_Mono',monospace] text-[13px] font-semibold shadow-xl group"
        >
          <div class="w-5.5 h-5.5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles size={14} class="text-amber-400 animate-pulse" />
          </div>
          <span>Use AI</span>
        </button>
      </div>
    {/if}

    <!-- Floating Visual Editor Toolbar -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 rounded-2xl border border-white/20 bg-[#12141C]/95 backdrop-blur-xl text-white/80 shadow-2xl select-none transition-all duration-300">
      <button
        onclick={() => (activeInteractionMode = activeInteractionMode === 'pan' ? 'select' : 'pan')}
        title="Pan Canvas Mode"
        class="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 {activeInteractionMode === 'pan' || isPanning ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
      >
        <Hand size={17} />
      </button>

      <div class="relative">
        <button
          onclick={() => toggleToolbarPopover('theme')}
          title="Theme, Colors & Pattern Presets"
          class="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 {activeToolbarPopover === 'theme' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
        >
          <Palette size={17} />
        </button>

        {#if activeToolbarPopover === 'theme'}
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-4 rounded-[20px] bg-[#161822] border border-white/20 shadow-2xl space-y-4 text-left font-['IBM_Plex_Mono',monospace] z-50">
            <div class="flex items-center justify-between pb-2 border-b border-white/10">
              <span class="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Canvas Mode</span>
              <div class="flex items-center p-0.5 rounded-full bg-white/5 border border-white/10">
                <button
                  onclick={() => toggleCanvasMode('dark')}
                  class="px-2.5 py-1 rounded-full text-[10px] transition-colors flex items-center gap-1.5 {canvasMode === 'dark' ? 'bg-white/20 text-white font-bold' : 'text-white/40 hover:text-white'}"
                >
                  <Moon size={11} class="text-blue-400" />
                  <span>Dark</span>
                </button>
                <button
                  onclick={() => toggleCanvasMode('light')}
                  class="px-2.5 py-1 rounded-full text-[10px] transition-colors flex items-center gap-1.5 {canvasMode === 'light' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}"
                >
                  <Sun size={11} class="text-amber-500" />
                  <span>Light</span>
                </button>
              </div>
            </div>

            <div>
              <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Diagram theme</div>
              <div class="grid grid-cols-4 gap-2">
                <button
                  onclick={() => { changeMermaidTheme('dark'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#0D0E12] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'dark' ? 'ring-2 ring-blue-500' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-[#1E2538] border border-white/60"></span>
                  <span class="text-[9px] text-white/60 mt-1">Dark</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('forest'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#0E1A14] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'forest' ? 'ring-2 ring-emerald-500' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-emerald-500"></span>
                  <span class="text-[9px] text-white/60 mt-1">Forest</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('neutral'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#1C1D24] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'neutral' ? 'ring-2 ring-purple-400' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-purple-400"></span>
                  <span class="text-[9px] text-white/60 mt-1">Neutral</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('base'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#252836] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'base' ? 'ring-2 ring-amber-400' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-amber-400"></span>
                  <span class="text-[9px] text-white/60 mt-1">Base</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('default'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#F1F5F9] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'default' ? 'ring-2 ring-slate-400' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-slate-700"></span>
                  <span class="text-[9px] text-black/70 mt-1">Light</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('ocean'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#0A192F] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'ocean' ? 'ring-2 ring-cyan-400' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-cyan-400"></span>
                  <span class="text-[9px] text-white/60 mt-1">Ocean</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('rose'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#1F0E17] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'rose' ? 'ring-2 ring-rose-400' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-rose-400"></span>
                  <span class="text-[9px] text-white/60 mt-1">Rose</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('monochrome'); activeToolbarPopover = 'none'; }}
                  class="p-2 rounded-xl border border-white/15 bg-[#000000] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'monochrome' ? 'ring-2 ring-white' : ''}"
                >
                  <span class="w-4 h-4 rounded-full bg-white"></span>
                  <span class="text-[9px] text-white/60 mt-1">Mono</span>
                </button>
              </div>
            </div>

            <div>
              <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Canvas background pattern</div>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  onclick={() => (canvasPattern = 'dots')}
                  class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'dots' ? 'bg-white/20 font-bold border-white/40' : ''}"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-white"></span> Dots
                </button>
                <button
                  onclick={() => (canvasPattern = 'grid')}
                  class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'grid' ? 'bg-white/20 font-bold border-white/40' : ''}"
                >
                  <span class="text-[11px] font-mono leading-none">#</span> Grid
                </button>
                <button
                  onclick={() => (canvasPattern = 'crosses')}
                  class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'crosses' ? 'bg-white/20 font-bold border-white/40' : ''}"
                >
                  <span class="text-[11px] font-mono leading-none">+</span> Cross
                </button>
                <button
                  onclick={() => (canvasPattern = 'solid')}
                  class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'solid' ? 'bg-white/20 font-bold border-white/40' : ''}"
                >
                  <span class="w-2 h-2 border border-white/60 rounded-sm"></span> Solid
                </button>
              </div>
            </div>

            <div>
              <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Diagram font</div>
              <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                <button
                  onclick={() => setDiagramFont('Public Sans, sans-serif')}
                  class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-sans transition-colors cursor-pointer {selectedFontFamily.includes('Public Sans') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                >
                  Aa Sans
                </button>
                <button
                  onclick={() => setDiagramFont('IBM Plex Mono, monospace')}
                  class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-mono transition-colors cursor-pointer {selectedFontFamily.includes('IBM Plex Mono') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                >
                  Aa Mono
                </button>
                <button
                  onclick={() => setDiagramFont('Playfair Display, serif')}
                  class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-serif transition-colors cursor-pointer {selectedFontFamily.includes('Playfair Display') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                >
                  Aa Serif
                </button>
                <button
                  onclick={() => setDiagramFont('Inter, sans-serif')}
                  class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-sans transition-colors cursor-pointer {selectedFontFamily.includes('Inter') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                >
                  Aa Inter
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="w-[1px] h-5 bg-white/15 mx-0.5"></div>

      <button
        onclick={toggleAutoLayout}
        title="Auto-Layout Toggle ({isAutoLayoutEnabled ? 'On' : 'Off'})"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group font-['IBM_Plex_Mono',monospace]"
      >
        <span class="text-[12px] font-semibold text-white/90 group-hover:text-white tracking-tight">Auto-Layout</span>
        <div class="w-8 h-4.5 rounded-full p-0.5 border transition-colors flex items-center {isAutoLayoutEnabled ? 'bg-[#2A7588] border-[#3891A6]' : 'bg-white/10 border-white/20'}">
          <div class="w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 {isAutoLayoutEnabled ? 'translate-x-3.5' : 'translate-x-0'}"></div>
        </div>
      </button>

      {#if isAutoLayoutEnabled}
        <div class="w-[1px] h-6 bg-white/15 mx-0.5"></div>

        <div class="relative">
          <button
            onclick={() => toggleToolbarPopover('direction')}
            title="Flowchart Layout Direction"
            class="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center {activeToolbarPopover === 'direction' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
          >
            {#if currentDirection === 'TD'}<ArrowDown size={18} />{/if}
            {#if currentDirection === 'BT'}<ArrowUp size={18} />{/if}
            {#if currentDirection === 'LR'}<ArrowRight size={18} />{/if}
            {#if currentDirection === 'RL'}<ArrowLeft size={18} />{/if}
          </button>

          {#if activeToolbarPopover === 'direction'}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-1 rounded-[14px] bg-[#161822] border border-white/20 shadow-2xl text-left font-['IBM_Plex_Mono',monospace] z-50 text-[12px] space-y-0.5">
              <button
                onclick={() => setDirection('TD')}
                class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'TD' ? 'bg-white/15 font-semibold' : ''}"
              >
                <ArrowDown size={14} />
                <span>Top to bottom</span>
              </button>
              <button
                onclick={() => setDirection('BT')}
                class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'BT' ? 'bg-white/15 font-semibold' : ''}"
              >
                <ArrowUp size={14} />
                <span>Bottom to top</span>
              </button>
              <button
                onclick={() => setDirection('LR')}
                class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'LR' ? 'bg-white/15 font-semibold' : ''}"
              >
                <ArrowRight size={14} />
                <span>Left to right</span>
              </button>
              <button
                onclick={() => setDirection('RL')}
                class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'RL' ? 'bg-white/15 font-semibold' : ''}"
              >
                <ArrowLeft size={14} />
                <span>Right to left</span>
              </button>
            </div>
          {/if}
        </div>

        <div class="w-[1px] h-6 bg-white/15 mx-0.5"></div>

        <div class="relative">
          <button
            onclick={() => toggleToolbarPopover('layout')}
            title="Layout Engine Algorithm"
            class="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 {activeToolbarPopover === 'layout' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
          >
            <GitFork size={18} />
          </button>

          {#if activeToolbarPopover === 'layout'}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 rounded-[16px] bg-[#161822] border border-white/20 shadow-2xl overflow-hidden font-['IBM_Plex_Mono',monospace] z-50 text-[12px] text-left select-none">
              <div class="px-3.5 py-2.5 text-[11px] font-medium text-[#7E88A8] border-b border-white/10 bg-white/5">
                Layout
              </div>
              <div class="p-1 space-y-0.5">
                <button
                  onclick={() => (currentLayoutAlgorithm = 'hierarchical')}
                  class="w-full px-3 py-2 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors {currentLayoutAlgorithm === 'hierarchical' ? 'bg-white/15 font-semibold' : ''}"
                >
                  <div class="flex items-center gap-2.5">
                    <GitFork size={16} class="text-white/80" />
                    <span>Hierarchical</span>
                  </div>
                  {#if currentLayoutAlgorithm === 'hierarchical'}<Check size={14} class="text-white/90" />{/if}
                </button>
                <button
                  onclick={() => (currentLayoutAlgorithm = 'adaptive')}
                  class="w-full px-3 py-2 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors {currentLayoutAlgorithm === 'adaptive' ? 'bg-white/15 font-semibold' : ''}"
                >
                  <div class="flex items-center gap-2.5">
                    <Network size={16} class="text-white/80" />
                    <span>Adaptive</span>
                  </div>
                  {#if currentLayoutAlgorithm === 'adaptive'}<Check size={14} class="text-white/90" />{/if}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Floating Canvas Zoom Bar -->
    <div class="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-white/20 bg-[#12141C]/95 backdrop-blur-xl text-[12px] font-['IBM_Plex_Mono',monospace] text-white/90 shadow-2xl select-none">
      <button
        onclick={zoomOut}
        title="Zoom Out"
        class="p-2 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onclick={resetZoom}
        title="Reset Zoom Scale"
        class="px-2.5 py-1 rounded-xl hover:bg-white/15 text-white font-bold tracking-wide transition-all hover:scale-105 active:scale-95 min-w-[50px] text-center cursor-pointer"
      >
        {Math.round(zoomScale * 100)}%
      </button>
      <button
        onclick={zoomIn}
        title="Zoom In"
        class="p-2 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onclick={resetZoom}
        title="Reset Pan & Position"
        class="p-2 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 border-l border-white/15 ml-0.5 pl-2.5 cursor-pointer"
      >
        <RefreshCw size={14} />
      </button>
      <button
        onclick={toggleCanvasFullscreen}
        title={isCanvasFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        class="p-2 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 border-l border-white/15 ml-0.5 pl-2.5 cursor-pointer"
      >
        {#if isCanvasFullscreen}
          <Minimize2 size={14} />
        {:else}
          <Maximize2 size={14} />
        {/if}
      </button>
    </div>

    <!-- Canvas Inner Render Engine -->
    <div
      bind:this={canvasContainer}
      class="flex min-h-full w-full items-center justify-center p-8 origin-center [shape-rendering:geometricPrecision] [text-rendering:geometricPrecision] [&_foreignObject]:overflow-visible [&_foreignObject_div]:[-webkit-font-smoothing:antialiased] [&_svg]:overflow-visible [&_svg]:max-w-none"
      style="transform: translate({panX}px, {panY}px) scale({zoomScale}); transform-origin: center center; transition: {isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'};"
    >
      {#if isRendering}
        <div class="flex flex-col items-center gap-3 text-white/50 font-['IBM_Plex_Mono',monospace]">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"></div>
          <p class="text-xs">Rendering diagram preview...</p>
        </div>
      {/if}
    </div>
  </div>
</div>
