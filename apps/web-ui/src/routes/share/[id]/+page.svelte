<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import mermaid from 'mermaid';
  import {
    Download,
    Share2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Copy,
    Check,
    ArrowLeft,
    Sparkles,
    FileText
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let diagramContainer = $state<HTMLDivElement | null>(null);
  let svgContent = $state<string>('');
  let renderError = $state<string | null>(null);
  let isRendering = $state<boolean>(true);

  // Canvas Viewport Controls
  let zoomLevel = $state<number>(1);
  let panX = $state<number>(0);
  let panY = $state<number>(0);
  let isDragging = $state<boolean>(false);
  let startX = 0;
  let startY = 0;
  let copied = $state<boolean>(false);

  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: 'Inter, system-ui, sans-serif'
    });

    renderDiagram();
  });

  async function renderDiagram() {
    if (!data.diagram || !data.diagram.code.trim()) {
      isRendering = false;
      return;
    }

    isRendering = true;
    renderError = null;

    try {
      const renderId = `shared-mermaid-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaid.render(renderId, data.diagram.code);
      svgContent = svg;
    } catch (err: any) {
      console.error('Mermaid render error:', err);
      renderError = err?.str || err?.message || 'Failed to render diagram syntax.';
    } finally {
      isRendering = false;
    }
  }

  function handleZoom(delta: number) {
    zoomLevel = Math.min(Math.max(0.4, zoomLevel + delta), 3.0);
  }

  function resetView() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function downloadSvg() {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.diagram.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data.diagram.code);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy diagram code:', err);
    }
  }
</script>

<svelte:head>
  <title>{data.diagram.title} — TxtGrph Public Diagram</title>
</svelte:head>

<!-- Viewport-Locked Main Outer Container -->
<div class="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans">
  <!-- Fixed Header Bar -->
  <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 backdrop-blur-md z-20">
    <!-- Left: Brand + Title -->
    <div class="flex items-center gap-3">
      <a href="/" class="flex items-center gap-2 text-indigo-400 font-bold hover:opacity-90 transition-opacity">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-mono text-xs">
          TG
        </div>
        <span class="text-sm font-semibold tracking-tight text-slate-100 hidden sm:inline">TxtGrph</span>
      </a>

      <div class="h-4 w-px bg-slate-800 hidden sm:block"></div>

      <div class="flex items-center gap-2">
        <FileText class="h-4 w-4 text-indigo-400" />
        <h1 class="text-xs sm:text-sm font-medium text-slate-200 truncate max-w-[200px] sm:max-w-[320px]">
          {data.diagram.title}
        </h1>
        <span class="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
          Shared Read-Only
        </span>
      </div>
    </div>

    <!-- Right Actions -->
    <div class="flex items-center gap-2">
      <!-- Copy Code -->
      <button
        type="button"
        onclick={copyCode}
        class="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
      >
        {#if copied}
          <Check class="h-3.5 w-3.5 text-green-400" />
          <span>Copied</span>
        {:else}
          <Copy class="h-3.5 w-3.5 text-slate-400" />
          <span class="hidden sm:inline">Copy Code</span>
        {/if}
      </button>

      <!-- Export SVG -->
      <button
        type="button"
        onclick={downloadSvg}
        disabled={!svgContent}
        class="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        <Download class="h-3.5 w-3.5 text-slate-400" />
        <span class="hidden sm:inline">Export SVG</span>
      </button>

      <!-- Open in Workspace / Fork -->
      <a
        href="/workspace"
        class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 shadow-sm transition-colors"
      >
        <Sparkles class="h-3.5 w-3.5 text-indigo-200" />
        <span>Open Workspace</span>
      </a>
    </div>
  </header>

  <!-- Interactive Canvas Region (Inner Scroll / Pan Container) -->
  <main
    class="relative flex min-h-0 flex-1 overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
  >
    <!-- Viewport Floating Controls -->
    <div class="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md">
      <button
        type="button"
        onclick={() => handleZoom(-0.15)}
        class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut class="h-4 w-4" />
      </button>
      <span class="px-2 font-mono text-xs text-slate-400 min-w-[48px] text-center">
        {Math.round(zoomLevel * 100)}%
      </span>
      <button
        type="button"
        onclick={() => handleZoom(0.15)}
        class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        title="Zoom In"
      >
        <ZoomIn class="h-4 w-4" />
      </button>
      <div class="h-4 w-px bg-slate-800 my-auto"></div>
      <button
        type="button"
        onclick={resetView}
        class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        title="Fit to Screen"
      >
        <Maximize2 class="h-4 w-4" />
      </button>
    </div>

    <!-- Canvas Content -->
    <div
      bind:this={diagramContainer}
      class="flex min-h-full w-full items-center justify-center p-8 transition-transform duration-75"
      style={`transform: translate(${panX}px, ${panY}px) scale(${zoomLevel}); transform-origin: center center;`}
    >
      {#if isRendering}
        <!-- Loading State Skeleton -->
        <div class="flex flex-col items-center gap-3 text-slate-500">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <p class="text-xs font-mono">Rendering diagram preview...</p>
        </div>
      {:else if renderError}
        <!-- Error State -->
        <div class="max-w-md rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center shadow-lg">
          <p class="text-sm font-semibold text-red-400">Diagram Rendering Failed</p>
          <p class="mt-2 text-xs font-mono text-red-300/80 break-words">{renderError}</p>
        </div>
      {:else if svgContent}
        <!-- Active Success Rendered Diagram -->
        <div class="mermaid-svg-container max-w-full overflow-visible">
          {@html svgContent}
        </div>
      {:else}
        <!-- Empty State -->
        <div class="text-center text-slate-500">
          <p class="text-sm">No diagram content available.</p>
        </div>
      {/if}
    </div>
  </main>
</div>
