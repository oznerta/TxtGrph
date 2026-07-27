<script lang="ts">
  import { CoreVersion } from '@txtgrph/core';
  let { data } = $props();
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[--color-surface-app]">
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-[--color-surface-subtle] text-[--color-text-secondary] border border-[--color-border-default]">
      <span class="w-2 h-2 rounded-full bg-[--color-brass]"></span>
      Core Engine v{CoreVersion}
    </div>

    <h1 class="font-['Instrument_Sans',sans-serif] text-[32px] sm:text-[40px] leading-[38px] sm:leading-[48px] font-semibold tracking-[-0.02em] text-[--color-text-primary]">
      TxtGrph — Live Diagram Editor
    </h1>

    <p class="text-[14px] leading-[21px] text-[--color-text-secondary] max-w-lg mx-auto">
      Write, preview, organize, and share Mermaid-syntax diagrams in real-time with BYOK AI assistance.
    </p>

    <div class="pt-4 flex items-center justify-center gap-4">
      <a
        href="/workspace"
        class="inline-flex items-center justify-center h-10 px-5 text-[14px] font-medium rounded-[5px] bg-[--color-ink] text-[#FAF9F6] shadow-sm hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass] focus-visible:ring-offset-2"
      >
        {data.session ? 'Go to Workspace' : 'Open Workspace'}
      </a>
      {#if !data.session}
        <a
          href="/auth"
          class="inline-flex items-center justify-center h-10 px-5 text-[14px] font-medium rounded-[5px] bg-[--color-surface-card] text-[--color-text-primary] border border-[--color-border-strong] hover:bg-[--color-surface-subtle] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass] focus-visible:ring-offset-2"
        >
          Sign In
        </a>
      {/if}
    </div>
  </div>
</div>
