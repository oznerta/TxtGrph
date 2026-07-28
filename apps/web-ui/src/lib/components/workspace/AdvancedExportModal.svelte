<script lang="ts">
  import { X, Download, Copy, Check, FileCode, Image as ImageIcon, FileText, Sparkles, Layers, Palette, Maximize, Code } from 'lucide-svelte';
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
  let selectedBgPreset = $state<'dark-mesh' | 'pitch-black' | 'pure-light' | 'transparent' | 'gradient-dark' | 'gradient-violet' | 'custom'>('dark-mesh');
  let customBgHex = $state('#0F1117');

  let isExporting = $state(false);
  let copyImageSuccess = $state(false);
  let copySvgSuccess = $state(false);

  function getCanvasBgColor(): string {
    switch (selectedBgPreset) {
      case 'pitch-black': return '#0B0C10';
      case 'pure-light': return '#FFFFFF';
      case 'transparent': return 'transparent';
      case 'gradient-dark': return '#12141C';
      case 'gradient-violet': return '#1E1B4B';
      case 'custom': return customBgHex;
      case 'dark-mesh': default: return '#0B0C10';
    }
  }

  async function generateSvg(): Promise<string> {
    const id = `advanced-export-${Math.random().toString(36).substring(2, 8)}`;
    const { svg } = await mermaid.render(id, code);
    return svg;
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
        const rawSvg = await generateSvg();
        const blob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
        triggerBlobDownload(blob, `${safeTitle}.svg`);
      } else {
        // PNG, JPEG, PDF raster canvas rendering with background, padding & scale multiplier
        const rawSvg = await generateSvg();
        const svgBlob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          const baseW = img.width || 1200;
          const baseH = img.height || 800;
          const pad = selectedPadding;
          const scale = selectedScale;

          const canvas = document.createElement('canvas');
          canvas.width = (baseW + pad * 2) * scale;
          canvas.height = (baseH + pad * 2) * scale;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(scale, scale);

            // Draw Background
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

            const mime = selectedFormat === 'JPEG' ? 'image/jpeg' : 'image/png';
            const dataUrl = canvas.toDataURL(mime, 0.95);
            const ext = selectedFormat.toLowerCase();
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${safeTitle}.${ext}`;
            a.click();
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
      const rawSvg = await generateSvg();
      await navigator.clipboard.writeText(rawSvg);
      copySvgSuccess = true;
      setTimeout(() => (copySvgSuccess = false), 2000);
    } catch (e) {
      console.error('Copy SVG failed', e);
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_label_has_associated_control -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      role="presentation"
      class="w-full max-w-xl rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-hidden text-white p-6 space-y-5"
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
            <p class="text-xs text-white/50 truncate max-w-[300px]">{title}</p>
          </div>
        </div>
        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div class="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
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

        <!-- Background Options (for Raster Image exports) -->
        {#if selectedFormat === 'PNG' || selectedFormat === 'JPEG' || selectedFormat === 'PDF'}
          <div>
            <span class="block text-xs font-semibold text-white/70 mb-2">Canvas Export Background</span>
            <div class="grid grid-cols-4 gap-2 text-xs font-medium">
              <button
                type="button"
                onclick={() => (selectedBgPreset = 'dark-mesh')}
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer {selectedBgPreset === 'dark-mesh' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
              >
                <div class="w-4 h-4 rounded-full bg-[#0B0C10] border border-white/30 shrink-0"></div>
                <span>Dark Mesh</span>
              </button>
              <button
                type="button"
                onclick={() => (selectedBgPreset = 'pitch-black')}
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer {selectedBgPreset === 'pitch-black' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
              >
                <div class="w-4 h-4 rounded-full bg-[#0B0C10] border border-white/20 shrink-0"></div>
                <span>Pitch Black</span>
              </button>
              <button
                type="button"
                onclick={() => (selectedBgPreset = 'pure-light')}
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer {selectedBgPreset === 'pure-light' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
              >
                <div class="w-4 h-4 rounded-full bg-white border border-slate-300 shrink-0"></div>
                <span>Pure Light</span>
              </button>
              <button
                type="button"
                onclick={() => (selectedBgPreset = 'transparent')}
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer {selectedBgPreset === 'transparent' ? 'border-amber-400 bg-amber-500/10 text-white font-bold' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10'}"
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
                    class="py-2 text-xs font-bold rounded-xl border text-center cursor-pointer {selectedScale === mult ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/10'}"
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
                    class="py-2 text-xs font-bold rounded-xl border text-center cursor-pointer {selectedPadding === pad ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/10'}"
                  >
                    {pad}px
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          type="button"
          onclick={copySvgMarkup}
          class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 transition-colors flex items-center gap-1.5 cursor-pointer btn-premium"
        >
          <Code size={14} class="text-amber-400" />
          <span>{copySvgSuccess ? 'Copied SVG!' : 'Copy SVG Markup'}</span>
        </button>

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
            class="px-5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 btn-premium"
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting...' : `Download ${selectedFormat}`}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
