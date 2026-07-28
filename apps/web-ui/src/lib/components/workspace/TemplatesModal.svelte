<script lang="ts">
  import { X, Search, Sparkles, Layout, ArrowRight, Check, CheckCircle2 } from 'lucide-svelte';
  import { diagramTemplates } from '$lib/data/templates';
  import mermaid from 'mermaid';

  interface Props {
    open: boolean;
    onSelectTemplate: (code: string, title: string) => void;
    onclose: () => void;
  }

  let { open = false, onSelectTemplate, onclose }: Props = $props();

  let selectedCategory = $state<string>('All');
  let searchQuery = $state<string>('');
  let activePreviewTemplate = $state<typeof diagramTemplates[0] | null>(null);
  let previewSvg = $state<string>('');

  const categories = ['All', 'Architecture', 'Flowchart', 'Sequence', 'ER Diagram', 'Mindmap', 'Git Graph'];

  let filteredTemplates = $derived.by(() => {
    let list = diagramTemplates;
    if (selectedCategory !== 'All') {
      list = list.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  });

  $effect(() => {
    if (filteredTemplates.length > 0 && !activePreviewTemplate) {
      activePreviewTemplate = filteredTemplates[0];
    }
  });

  $effect(() => {
    if (activePreviewTemplate) {
      renderPreview(activePreviewTemplate.code);
    }
  });

  async function renderPreview(code: string) {
    try {
      const id = `tmpl-preview-${Math.random().toString(36).substring(2, 8)}`;
      const { svg } = await mermaid.render(id, code);
      previewSvg = svg;
    } catch (e) {
      previewSvg = '';
    }
  }

  function handleUseTemplate(template: typeof diagramTemplates[0]) {
    onSelectTemplate(template.code, template.name);
    onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      role="presentation"
      class="w-full max-w-5xl h-[680px] rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl flex flex-col overflow-hidden text-white"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 p-5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Layout size={18} />
          </div>
          <div>
            <h3 class="text-base font-bold text-white tracking-tight">Diagram Templates Library</h3>
            <p class="text-xs text-white/50">Explore pre-built production templates for architecture, sequences & systems</p>
          </div>
        </div>

        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Main Modal Content Grid -->
      <div class="flex-1 flex min-h-0 overflow-hidden">
        <!-- Left Sidebar: Categories & Cards -->
        <div class="w-[420px] border-r border-white/10 flex flex-col min-h-0 bg-[#090A0F]/50 shrink-0">
          <!-- Search & Filter Tabs -->
          <div class="p-4 border-b border-white/10 space-y-3 shrink-0">
            <div class="relative">
              <Search class="absolute left-3.5 top-2.5 h-4 w-4 text-white/30" />
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search templates..."
                class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>

            <!-- Category Pills -->
            <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
              {#each categories as cat}
                <button
                  type="button"
                  onclick={() => (selectedCategory = cat)}
                  class="px-3 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition-all cursor-pointer {selectedCategory === cat ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/10'}"
                >
                  {cat}
                </button>
              {/each}
            </div>
          </div>

          <!-- Template Cards List -->
          <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {#each filteredTemplates as tmpl (tmpl.id)}
              <button
                type="button"
                onclick={() => (activePreviewTemplate = tmpl)}
                class="w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 {activePreviewTemplate?.id === tmpl.id ? 'bg-white/10 border-white/30 text-white shadow-lg' : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20'}"
              >
                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-bold text-white tracking-wide">{tmpl.name}</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-amber-400 font-medium shrink-0">
                    {tmpl.category}
                  </span>
                </div>
                <p class="text-[11px] text-white/50 line-clamp-2 leading-relaxed">{tmpl.description}</p>
              </button>
            {/each}
          </div>
        </div>

        <!-- Right Pane: Live Render Preview -->
        <div class="flex-1 flex flex-col min-h-0 bg-[#0B0C10] p-6 relative">
          {#if activePreviewTemplate}
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10 shrink-0">
              <div>
                <h4 class="text-sm font-bold text-white">{activePreviewTemplate.name}</h4>
                <p class="text-xs text-white/50">{activePreviewTemplate.description}</p>
              </div>

              <button
                type="button"
                onclick={() => handleUseTemplate(activePreviewTemplate!)}
                class="px-4 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 btn-premium"
              >
                <span>Use Template</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <!-- Preview Canvas Area -->
            <div class="flex-1 w-full rounded-xl bg-[#090A0F] border border-white/10 flex items-center justify-center p-6 overflow-hidden relative [&_svg]:max-w-full [&_svg]:h-auto [shape-rendering:geometricPrecision] [text-rendering:geometricPrecision]">
              {#if previewSvg}
                {@html previewSvg}
              {:else}
                <div class="text-xs text-white/40 font-mono flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Loading template preview...
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
