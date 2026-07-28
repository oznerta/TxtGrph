<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/workspace', { replaceState: true });
  });
</script>

<div class="min-h-screen bg-[#090A0F] text-white flex items-center justify-center p-6 font-['Instrument_Sans',sans-serif]">
  <div class="text-center space-y-3">
    <div class="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto"></div>
    <p class="text-xs text-white/60 font-medium">Redirecting to TxtGrph Workspace...</p>
  </div>
</div>
