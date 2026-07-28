<script lang="ts">
  import { onMount } from 'svelte';
  import mermaid from 'mermaid';

  let { code = '' } = $props();

  let svgContent = $state('');
  let isRendering = $state(true);
  let hasError = $state(false);

  async function renderThumbnail() {
    if (!code || !code.trim()) {
      svgContent = '';
      isRendering = false;
      return;
    }

    try {
      isRendering = true;
      hasError = false;
      const id = `thumb-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaid.render(id, code);
      svgContent = svg;
    } catch {
      hasError = true;
      svgContent = '';
    } finally {
      isRendering = false;
    }
  }

  onMount(() => {
    renderThumbnail();
  });

  $effect(() => {
    if (code) {
      renderThumbnail();
    }
  });
</script>

<div class="w-full h-full min-h-[140px] flex items-center justify-center bg-[#F8F9FA] dark:bg-[#1E1E24] overflow-hidden p-3 rounded-t-xl relative group-hover:bg-[#F0F2F5] dark:group-hover:bg-[#25252D] transition-colors">
  {#if isRendering}
    <div class="text-[11px] text-[var(--color-text-muted)] font-mono animate-pulse">
      Rendering preview...
    </div>
  {:else if hasError}
    <div class="text-[11px] text-[var(--color-text-muted)] font-mono flex items-center gap-1.5 opacity-60">
      <span>📊 Diagram Preview</span>
    </div>
  {:else if svgContent}
    <div class="w-full h-full flex items-center justify-center max-h-[140px] [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:w-auto [&>svg]:h-auto transition-transform duration-200 group-hover:scale-[1.02]">
      {@html svgContent}
    </div>
  {:else}
    <div class="text-[11px] text-[var(--color-text-muted)] font-mono">
      Empty Diagram
    </div>
  {/if}
</div>
