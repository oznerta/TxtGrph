<script lang="ts">
  import type { Diagram } from '@txtgrph/core';
  import { X, Check, Download, FileCode, Image, FileText } from 'lucide-svelte';
  import mermaid from 'mermaid';
  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';

  interface Props {
    open?: boolean;
    diagrams?: Diagram[];
    selectedIds?: Set<string>;
    onclose?: () => void;
  }

  let {
    open = false,
    diagrams = [] as Diagram[],
    selectedIds = new Set<string>(),
    onclose = () => {}
  }: Props = $props();

  let selectedFormat = $state<'PNG' | 'PDF' | 'SVG' | 'Code'>('PNG');
  let isExporting = $state(false);

  const formatOptions: SelectOption[] = [
    { value: 'PNG', label: 'PNG Image (.png)' },
    { value: 'PDF', label: 'PDF Document (.pdf)' },
    { value: 'SVG', label: 'Vector SVG (.svg)' },
    { value: 'Code', label: 'Mermaid Code (.mmd)' }
  ];

  let selectedDiagrams = $derived.by(() => {
    return diagrams.filter((d) => selectedIds.has(d.id));
  });

  async function handleDownload() {
    isExporting = true;
    try {
      for (const diagram of selectedDiagrams) {
        if (selectedFormat === 'Code') {
          const blob = new Blob([diagram.code], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${diagram.title || 'diagram'}.mmd`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (selectedFormat === 'SVG') {
          const id = `export-svg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const { svg } = await mermaid.render(id, diagram.code);
          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${diagram.title || 'diagram'}.svg`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // PNG / PDF raster rendering fallback
          const id = `export-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const { svg } = await mermaid.render(id, diagram.code);
          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);

          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 1200;
            canvas.height = img.height || 800;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#181920';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const pngUrl = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = pngUrl;
              a.download = `${diagram.title || 'diagram'}.png`;
              a.click();
            }
            URL.revokeObjectURL(url);
          };
          img.src = url;
        }
      }
      onclose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      isExporting = false;
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_label_has_associated_control -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      role="presentation"
      class="w-full max-w-md rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-hidden text-white p-6 space-y-5"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Download size={18} />
          </div>
          <h3 class="text-base font-bold text-white tracking-tight">Export Batch</h3>
        </div>
        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Selected Items List -->
      <div class="space-y-2">
        <span class="block text-xs font-semibold text-white/60">Selected Diagrams</span>
        <div class="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {#each selectedDiagrams as diagram (diagram.id)}
            <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
              <span class="font-medium text-white truncate">{diagram.title || 'Untitled diagram'}</span>
              <Check size={14} class="text-emerald-400 shrink-0" />
            </div>
          {/each}
        </div>
      </div>

      <!-- Export Format Selector Dropdown -->
      <div class="flex items-center justify-between gap-3 pt-2">
        <div class="flex-1">
          <CustomSelect
            options={formatOptions}
            bind:value={selectedFormat}
          />
        </div>

        <button
          onclick={handleDownload}
          disabled={isExporting}
          class="px-5 py-2.5 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors disabled:opacity-50 shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Download size={14} />
          <span>{isExporting ? 'Exporting...' : 'Download'}</span>
        </button>
      </div>
    </div>
  </div>
{/if}
