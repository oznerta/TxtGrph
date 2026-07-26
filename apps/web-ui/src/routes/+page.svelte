<script lang="ts">
  import { CoreVersion } from '@txtgrph/core';
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-6 text-center">
  <h1 class="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
    TxtGrph
  </h1>
  <p class="text-lg text-slate-400 max-w-xl mb-6">
    Live Mermaid diagramming editor with BYOK AI assistance.
  </p>
  <div class="inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700">
    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
    Core Engine v{CoreVersion}
  </div>
</div>
