<script lang="ts">
  import { X, Download, Copy, Check, FileCode, Image as ImageIcon, FileText, Sparkles, Layers, Palette, Maximize, Code, Eye, RefreshCw, Plus, Minus } from 'lucide-svelte';
  import mermaid from 'mermaid';

  interface Props {
    open: boolean;
    code: string;
    title: string;
    onclose: () => void;
  }

  let { open = false, code = '', title = 'Untitled Diagram', onclose }: Props = $props();

  let selectedFormat = $state<'PNG' | 'JPEG' | 'SVG' | 'PDF' | 'MMD' | 'MD'>('PNG');
  let selectedScale = $state<number>(2);
  let selectedPadding = $state<number>(32);
  let selectedBgPreset = $state<'dark-mesh' | 'pitch-black' | 'pure-light' | 'transparent'>('dark-mesh');

  let isExporting = $state(false);
  let copyImageSuccess = $state(false);
  let copySvgSuccess = $state(false);

  let previewSvg = $state('');
  let isGeneratingPreview = $state(false);
  let diagramBaseWidth = $state(800);
  let diagramBaseHeight = $state(600);

  // Live Export Preview Interactive Pan & Zoom State
  let previewScale = $state(1);
  let previewPanX = $state(0);
  let previewPanY = $state(0);
  let isPanningPreview = $state(false);
  let previewStartX = 0;
  let previewStartY = 0;
  let previewAnimFrameId: number | null = null;

  $effect(() => {
    if (open && code) {
      updatePreview();
    }
  });

  function resetPreviewZoom() {
    previewScale = 1;
    previewPanX = 0;
    previewPanY = 0;
  }

  function previewZoomIn() {
    previewScale = Math.min(5.0, Math.round((previewScale + 0.25) * 100) / 100);
  }

  function previewZoomOut() {
    previewScale = Math.max(0.2, Math.round((previewScale - 0.25) * 100) / 100);
  }

  function handlePreviewWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    previewScale = Math.min(Math.max(0.2, previewScale * zoomFactor), 5.0);
  }

  function handlePreviewPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isPanningPreview = true;
    previewStartX = e.clientX - previewPanX;
    previewStartY = e.clientY - previewPanY;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  }

  function handlePreviewPointerMove(e: PointerEvent) {
    if (!isPanningPreview) return;
    const newX = e.clientX - previewStartX;
    const newY = e.clientY - previewStartY;
    if (previewAnimFrameId) cancelAnimationFrame(previewAnimFrameId);
    previewAnimFrameId = requestAnimationFrame(() => {
      previewPanX = newX;
      previewPanY = newY;
    });
  }

  function handlePreviewPointerUp(e: PointerEvent) {
    if (isPanningPreview) {
      isPanningPreview = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  }

  /**
   * Parses raw Mermaid SVG output and fixes dimension attributes (width/height),
   * ensuring crystal-sharp rasterization and responsive preview display.
   */
  function processSvg(rawSvg: string): { svg: string; width: number; height: number } {
    let width = 800;
    let height = 600;

    // 1. Extract dimensions from viewBox or width/height attributes
    const viewBoxMatch = rawSvg.match(/viewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
        width = Math.ceil(parts[2]);
        height = Math.ceil(parts[3]);
      }
    } else {
      const wMatch = rawSvg.match(/width=["']([0-9.]+)(px)?["']/i);
      const hMatch = rawSvg.match(/height=["']([0-9.]+)(px)?["']/i);
      if (wMatch && hMatch) {
        width = Math.ceil(parseFloat(wMatch[1]));
        height = Math.ceil(parseFloat(hMatch[1]));
      }
    }

    // 2. Ensure root SVG has explicit numeric width, height, and viewBox
    let fixedSvg = rawSvg;
    if (/width=["'][^"']*["']/i.test(fixedSvg)) {
      fixedSvg = fixedSvg.replace(/width=["'][^"']*["']/i, `width="${width}"`);
    } else {
      fixedSvg = fixedSvg.replace(/<svg\b/i, `<svg width="${width}"`);
    }

    if (/height=["'][^"']*["']/i.test(fixedSvg)) {
      fixedSvg = fixedSvg.replace(/height=["'][^"']*["']/i, `height="${height}"`);
    } else {
      fixedSvg = fixedSvg.replace(/<svg\b/i, `<svg height="${height}"`);
    }

    // 3. Inject crisp rendering attributes
    fixedSvg = fixedSvg.replace(
      /<svg\b([^>]*)>/i,
      (match, attrs) => `<svg ${attrs} shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="crisp-edges">`
    );

    return { svg: fixedSvg, width, height };
  }

  async function updatePreview() {
    if (!code || !code.trim()) return;
    isGeneratingPreview = true;
    try {
      const id = `export-preview-${Math.random().toString(36).substring(2, 8)}`;
      const { svg: rawSvg } = await mermaid.render(id, code);

      // Clean up DOM temp element created by Mermaid
      const tempEl = document.getElementById(id) || document.getElementById(`d${id}`);
      if (tempEl) tempEl.remove();

      const { svg: fixedSvg, width, height } = processSvg(rawSvg);
      previewSvg = fixedSvg;
      diagramBaseWidth = width;
      diagramBaseHeight = height;
      resetPreviewZoom();
    } catch (err) {
      console.error('Export preview render error:', err);
    } finally {
      isGeneratingPreview = false;
    }
  }

  function getCanvasBgColor(): string {
    switch (selectedBgPreset) {
      case 'pitch-black': return '#0B0C10';
      case 'pure-light': return '#FFFFFF';
      case 'transparent': return 'transparent';
      case 'dark-mesh': default: return '#0B0C10';
    }
  }

  async function generateSvgMarkup(): Promise<{ svg: string; width: number; height: number }> {
    const id = `advanced-export-${Math.random().toString(36).substring(2, 8)}`;
    const { svg: rawSvg } = await mermaid.render(id, code);
    const tempEl = document.getElementById(id) || document.getElementById(`d${id}`);
    if (tempEl) tempEl.remove();

    return processSvg(rawSvg);
  }

  async function handleDownload() {
    if (!code || !code.trim()) return;
    isExporting = true;
    const safeTitle = (title || 'diagram').trim().replace(/[^a-z0-9_-]/gi, '_');

    try {
      if (selectedFormat === 'MMD') {
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        triggerBlobDownload(blob, `${safeTitle}.mmd`);
      } else if (selectedFormat === 'MD') {
        const mdContent = `\`\`\`mermaid\n${code}\n\`\`\``;
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
        triggerBlobDownload(blob, `${safeTitle}.md`);
      } else if (selectedFormat === 'SVG') {
        const { svg: rawSvg } = await generateSvgMarkup();
        const bg = getCanvasBgColor();
        let finalSvg = rawSvg;

        if (bg !== 'transparent') {
          // Wrap SVG with background rect if requested
          finalSvg = rawSvg.replace(
            /<svg\b([^>]*)>/i,
            `<svg $1><rect width="100%" height="100%" fill="${bg}" />`
          );
        }

        const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
        triggerBlobDownload(blob, `${safeTitle}.svg`);
      } else {
        // PNG, JPEG, PDF raster canvas rendering
        const { svg: cleanSvg, width: baseW, height: baseH } = await generateSvgMarkup();
        const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          const pad = selectedPadding;
          const scale = selectedScale;

          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil((baseW + pad * 2) * scale);
          canvas.height = Math.ceil((baseH + pad * 2) * scale);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(scale, scale);

            let bg = getCanvasBgColor();
            if (selectedFormat === 'JPEG' && bg === 'transparent') {
              bg = '#0B0C10'; // JPEG fallback for transparency
            }

            if (bg !== 'transparent') {
              ctx.fillStyle = bg;
              ctx.fillRect(0, 0, baseW + pad * 2, baseH + pad * 2);

              if (selectedBgPreset === 'dark-mesh') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                for (let x = 0; x < baseW + pad * 2; x += 24) {
                  for (let y = 0; y < baseH + pad * 2; y += 24) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
              }
            }

            ctx.drawImage(img, pad, pad, baseW, baseH);

            if (selectedFormat === 'PDF') {
              const dataUrl = canvas.toDataURL('image/png', 1.0);
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>${safeTitle}</title>
                    <style>
                      @page { size: auto; margin: 0; }
                      body { margin: 0; padding: 0; background: ${bg === 'transparent' ? '#ffffff' : bg}; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                      img { max-width: 100%; height: auto; display: block; margin: auto; }
                    </style>
                  </head>
                  <body>
                    <img src="${dataUrl}" onload="window.print(); setTimeout(function() { window.close(); }, 500);" />
                  </body>
                  </html>
                `);
                printWindow.document.close();
              }
            } else {
              const mime = selectedFormat === 'JPEG' ? 'image/jpeg' : 'image/png';
              const dataUrl = canvas.toDataURL(mime, 0.95);
              const ext = selectedFormat.toLowerCase();
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = `${safeTitle}.${ext}`;
              a.click();
            }
          }
          URL.revokeObjectURL(svgUrl);
        };
        img.src = svgUrl;
      }
      onclose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      isExporting = false;
    }
  }

  function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copySvgMarkup() {
    try {
      const { svg: rawSvg } = await generateSvgMarkup();
      await navigator.clipboard.writeText(rawSvg);
      copySvgSuccess = true;
      setTimeout(() => (copySvgSuccess = false), 2000);
    } catch (e) {
      console.error('Copy SVG failed', e);
    }
  }

  async function copyImageToClipboard() {
    if (!code || !code.trim()) return;
    try {
      const { svg: cleanSvg, width: baseW, height: baseH } = await generateSvgMarkup();
      const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const pad = selectedPadding;
        const scale = selectedScale;

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil((baseW + pad * 2) * scale);
        canvas.height = Math.ceil((baseH + pad * 2) * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(scale, scale);
          const bg = getCanvasBgColor();
          if (bg !== 'transparent') {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, baseW + pad * 2, baseH + pad * 2);
            if (selectedBgPreset === 'dark-mesh') {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
              for (let x = 0; x < baseW + pad * 2; x += 24) {
                for (let y = 0; y < baseH + pad * 2; y += 24) {
                  ctx.beginPath();
                  ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
          ctx.drawImage(img, pad, pad, baseW, baseH);

          canvas.toBlob(async (blob) => {
            if (blob) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              copyImageSuccess = true;
              setTimeout(() => (copyImageSuccess = false), 2000);
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (e) {
      console.error('Copy Image failed:', e);
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_label_has_associated_control -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      role="presentation"
      class="w-full max-w-4xl rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-hidden text-white p-6 space-y-5"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Download size={18} />
          </div>
          <div>
            <h3 class="text-base font-bold text-white tracking-tight">Advanced Diagram Export</h3>
            <p class="text-xs text-white/50 truncate max-w-[400px]">{title}</p>
          </div>
        </div>
        <button
          type="button"
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Main Export Body: Left Live Preview + Right Controls -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-h-[72vh] overflow-y-auto custom-scrollbar pr-1">
        
        <!-- Left: Live Export Preview Canvas Container (5 cols) -->
        <div class="lg:col-span-5 flex flex-col space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white/80 flex items-center gap-1.5">
              <Eye size={14} class="text-amber-400" />
              <span>Live Export Preview</span>
            </span>
            <span class="text-[10.5px] text-white/50 font-['IBM_Plex_Mono',monospace]">
              {Math.ceil((diagramBaseWidth + selectedPadding * 2) * selectedScale)} x {Math.ceil((diagramBaseHeight + selectedPadding * 2) * selectedScale)} px (@{selectedScale}x)
            </span>
          </div>

          <!-- Interactive Pan & Zoom Preview Stage Box -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onwheel={handlePreviewWheel}
            onpointerdown={handlePreviewPointerDown}
            onpointermove={handlePreviewPointerMove}
            onpointerup={handlePreviewPointerUp}
            onpointercancel={handlePreviewPointerUp}
            class="relative w-full h-[320px] rounded-2xl border border-white/15 overflow-hidden flex items-center justify-center p-3 bg-[#0A0B0E] group select-none {isPanningPreview ? 'cursor-grabbing' : 'cursor-grab'}"
          >
            <!-- Background checkerboard pattern for transparency -->
            <div class="absolute inset-0 bg-[conic-gradient(#1A1D28_90deg,#12141D_90deg_180deg,#1A1D28_180deg_270deg,#12141D_270deg)] [background-size:16px_16px]"></div>

            <!-- Scaled & Panned Diagram Inner Frame -->
            <div
              class="relative max-w-full max-h-full flex items-center justify-center rounded-xl overflow-hidden shadow-2xl transition-transform duration-75"
              style="
                background-color: {getCanvasBgColor()};
                padding: {Math.round(selectedPadding / 2)}px;
                {selectedBgPreset === 'dark-mesh' ? 'background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px); background-size: 16px 16px;' : ''}
                {selectedBgPreset === 'pure-light' ? 'color: #000;' : ''}
                transform: translate3d({previewPanX}px, {previewPanY}px, 0) scale({previewScale});
                transform-origin: center center;
                will-change: transform;
              "
            >
              {#if isGeneratingPreview}
                <div class="flex items-center gap-2 text-xs text-white/50 py-12">
                  <RefreshCw size={16} class="animate-spin text-amber-400" />
                  <span>Rendering preview...</span>
                </div>
              {:else if previewSvg}
                <div class="w-full h-full flex items-center justify-center p-2 [&_svg]:max-w-[280px] [&_svg]:max-h-[240px] [&_svg]:w-auto [&_svg]:h-auto [&_svg]:block">
                  {@html previewSvg}
                </div>
              {:else}
                <div class="text-xs text-white/40 py-12">No diagram content</div>
              {/if}
            </div>

            <!-- Floating Zoom & Pan Controls Pill on Bottom-Right -->
            <div class="absolute bottom-3 right-3 z-30 flex items-center gap-1 p-1 rounded-xl border border-white/15 bg-[#12141C]/90 backdrop-blur-md text-white/80 shadow-lg text-xs font-['IBM_Plex_Mono',monospace]">
              <button
                type="button"
                onclick={previewZoomOut}
                title="Zoom Out"
                class="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onclick={resetPreviewZoom}
                title="Reset Zoom & Pan"
                class="px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] font-bold text-amber-400 transition-colors cursor-pointer"
              >
                {Math.round(previewScale * 100)}%
              </button>
              <button
                type="button"
                onclick={previewZoomIn}
                title="Zoom In"
                class="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Options Controls (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Export Format Selector -->
          <div>
            <span class="block text-xs font-semibold text-white/70 mb-2">Export Format</span>
            <div class="grid grid-cols-6 gap-2">
              {#each ['PNG', 'JPEG', 'SVG', 'PDF', 'MMD', 'MD'] as fmt}
                <button
                  type="button"
                  onclick={() => (selectedFormat = fmt as any)}
                  class="py-2.5 px-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer {selectedFormat === fmt ? 'bg-white text-black border-white shadow-md' : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}"
                >
                  {fmt}
                </button>
              {/each}
            </div>
          </div>

          <!-- Background Options (for Image/Vector/PDF exports) -->
          {#if selectedFormat === 'PNG' || selectedFormat === 'JPEG' || selectedFormat === 'SVG' || selectedFormat === 'PDF'}
            <div>
              <span class="block text-xs font-semibold text-white/70 mb-2">Canvas Export Background</span>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium">
                <button
                  type="button"
                  onclick={() => (selectedBgPreset = 'dark-mesh')}
                  class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all {selectedBgPreset === 'dark-mesh' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
                >
                  <div class="w-4 h-4 rounded-full bg-[#0B0C10] border border-white/30 shrink-0"></div>
                  <span>Dark Mesh</span>
                </button>
                <button
                  type="button"
                  onclick={() => (selectedBgPreset = 'pitch-black')}
                  class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all {selectedBgPreset === 'pitch-black' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
                >
                  <div class="w-4 h-4 rounded-full bg-[#0B0C10] border border-white/20 shrink-0"></div>
                  <span>Pitch Black</span>
                </button>
                <button
                  type="button"
                  onclick={() => (selectedBgPreset = 'pure-light')}
                  class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all {selectedBgPreset === 'pure-light' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
                >
                  <div class="w-4 h-4 rounded-full bg-white border border-slate-300 shrink-0"></div>
                  <span>Pure Light</span>
                </button>
                <button
                  type="button"
                  onclick={() => (selectedBgPreset = 'transparent')}
                  class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all {selectedBgPreset === 'transparent' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
                >
                  <div class="w-4 h-4 rounded-full bg-transparent border border-dashed border-white/40 shrink-0"></div>
                  <span>Transparent</span>
                </button>
              </div>
            </div>

            <!-- Resolution Scale & Padding Grid -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="block text-xs font-semibold text-white/70 mb-2">Resolution Scale</span>
                <div class="grid grid-cols-4 gap-1.5">
                  {#each [1, 2, 4, 8] as mult}
                    <button
                      type="button"
                      onclick={() => (selectedScale = mult)}
                      class="py-2 text-xs font-bold rounded-xl border text-center cursor-pointer transition-all {selectedScale === mult ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/10'}"
                    >
                      {mult}x
                    </button>
                  {/each}
                </div>
              </div>

              <div>
                <span class="block text-xs font-semibold text-white/70 mb-2">Padding</span>
                <div class="grid grid-cols-4 gap-1.5">
                  {#each [0, 16, 32, 64] as pad}
                    <button
                      type="button"
                      onclick={() => (selectedPadding = pad)}
                      class="py-2 text-xs font-bold rounded-xl border text-center cursor-pointer transition-all {selectedPadding === pad ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/10'}"
                    >
                      {pad}px
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={copySvgMarkup}
            class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Code size={14} class="text-amber-400" />
            <span>{copySvgSuccess ? 'Copied SVG!' : 'Copy SVG'}</span>
          </button>

          <button
            type="button"
            onclick={copyImageToClipboard}
            class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon size={14} class="text-amber-400" />
            <span>{copyImageSuccess ? 'Copied PNG!' : 'Copy Image'}</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={onclose}
            class="px-4 py-2 text-xs font-semibold rounded-xl border border-white/15 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={handleDownload}
            disabled={isExporting}
            class="px-5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting...' : `Download ${selectedFormat}`}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
