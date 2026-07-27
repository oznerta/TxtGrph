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

<div class="min-h-screen flex flex-col bg-[--color-surface-app]">
  <!-- Navigation Header -->
  <header class="h-14 px-6 flex items-center justify-between border-b border-[--color-border-default] bg-[--color-surface-card]">
    <div class="flex items-center gap-3">
      <a href="/" class="font-['Instrument_Sans',sans-serif] text-[17px] font-semibold text-[--color-text-primary]">
        TxtGrph
      </a>
      <span class="text-xs px-2 py-0.5 rounded-[3px] bg-[--color-surface-subtle] text-[--color-text-secondary]">
        Workspace
      </span>
    </div>

    <div class="flex items-center gap-4 text-[13px]">
      <span class="text-[--color-text-secondary] hidden sm:inline">
        {data.session?.user?.email}
      </span>
      <button
        onclick={handleSignOut}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-[--color-surface-subtle] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass]"
      >
        <LogOut size={16} strokeWidth={1.5} />
        <span>Sign Out</span>
      </button>
    </div>
  </header>

  <!-- Main Content Area / Empty Workspace Shell -->
  <main class="flex-1 flex items-center justify-center p-6 text-center">
    <div class="max-w-md mx-auto p-8 rounded-[8px] border border-[--color-border-default] bg-[--color-surface-card] space-y-5 shadow-sm">
      <div class="w-12 h-12 mx-auto rounded-full bg-[--color-surface-subtle] border border-[--color-border-strong] flex items-center justify-center text-[--color-brass-text]">
        <Plus size={24} strokeWidth={1.5} />
      </div>

      <div class="space-y-2">
        <h3 class="font-['Instrument_Sans',sans-serif] text-[17px] font-semibold text-[--color-text-primary]">
          Empty Workspace
        </h3>
        <p class="text-[14px] leading-[21px] text-[--color-text-secondary]">
          No diagrams created yet. Create your first Mermaid diagram to start drafting, previewing, and organizing.
        </p>
      </div>

      <div class="pt-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 h-10 px-5 text-[14px] font-medium rounded-[5px] bg-[--color-ink] text-[#FAF9F6] shadow-sm hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass] focus-visible:ring-offset-2"
        >
          <Plus size={18} strokeWidth={1.5} />
          <span>Create Diagram</span>
        </button>
      </div>
    </div>
  </main>
</div>
