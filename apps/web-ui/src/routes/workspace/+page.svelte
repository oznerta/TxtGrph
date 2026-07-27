<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { Plus, LogOut } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  let { data } = $props();
  const supabase = createSupabaseBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    await goto('/auth');
  }
</script>

<div class="min-h-screen flex flex-col bg-[var(--color-surface-app)]">
  <!-- Navigation Header -->
  <header class="h-14 px-6 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
    <div class="flex items-center gap-3">
      <a href="/" class="flex items-center gap-2 group">
        <div class="w-7 h-7 rounded-[5px] flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
          <img
            src="/assets/logo-short-light.png"
            alt="TxtGrph Logo"
            class="w-full h-full object-contain dark:hidden"
          />
          <img
            src="/assets/logo-short-dark.png"
            alt="TxtGrph Logo"
            class="w-full h-full object-contain hidden dark:block"
          />
        </div>
        <span class="font-['Instrument_Sans',sans-serif] text-[17px] font-semibold text-[var(--color-text-primary)]">
          TxtGrph
        </span>
      </a>
      <span class="text-xs px-2 py-0.5 rounded-[3px] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-['IBM_Plex_Mono',monospace]">
        Workspace
      </span>
    </div>

    <div class="flex items-center gap-4 text-[13px]">
      <span class="text-[var(--color-text-secondary)] hidden sm:inline">
        {data.session?.user?.email}
      </span>
      <button
        onclick={handleSignOut}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brass)]"
      >
        <LogOut size={16} strokeWidth={1.5} />
        <span>Sign Out</span>
      </button>
    </div>
  </header>

  <!-- Main Content Area / Empty Workspace Shell -->
  <main class="flex-1 flex items-center justify-center p-6 text-center">
    <div class="max-w-md mx-auto p-8 rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] space-y-5 shadow-sm">
      <div class="w-12 h-12 mx-auto rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-brass-text)]">
        <Plus size={24} strokeWidth={1.5} />
      </div>

      <div class="space-y-2">
        <h3 class="font-['Instrument_Sans',sans-serif] text-[17px] font-semibold text-[var(--color-text-primary)]">
          Empty Workspace
        </h3>
        <p class="text-[14px] leading-[21px] text-[var(--color-text-secondary)]">
          No diagrams created yet. Create your first Mermaid diagram to start drafting, previewing, and organizing.
        </p>
      </div>

      <div class="pt-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 h-10 px-5 text-[14px] font-medium rounded-[5px] bg-[var(--color-ink)] text-[#FAF9F6] shadow-sm hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brass)] focus-visible:ring-offset-2"
        >
          <Plus size={18} strokeWidth={1.5} />
          <span>Create Diagram</span>
        </button>
      </div>
    </div>
  </main>
</div>
