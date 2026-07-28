<script lang="ts">
  import { presenceStore, type PresenceUser } from '$lib/stores/presenceStore.svelte';
  import { Users, Shield, Sparkles, ChevronDown } from 'lucide-svelte';

  let isOpen = $state(false);

  let onlineUsers = $derived(presenceStore.onlineUsers);
  let visibleUsers = $derived(onlineUsers.slice(0, 4));
  let extraCount = $derived(Math.max(0, onlineUsers.length - 4));

  function getUserInitials(name: string, email: string): string {
    if (name && name.trim() && name.trim() !== email) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.includes('@')) return email.split('@')[0].slice(0, 2).toUpperCase();
    return 'GV';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if onlineUsers.length > 0}
  <div class="relative inline-flex items-center font-['Instrument_Sans',sans-serif]">
    <!-- Trigger Avatar Stack Button -->
    <button
      type="button"
      onclick={() => (isOpen = !isOpen)}
      title={`${onlineUsers.length} active participant${onlineUsers.length > 1 ? 's' : ''} currently looking at this diagram`}
      class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all cursor-pointer select-none group"
    >
      <div class="flex items-center -space-x-2 overflow-hidden py-0.5">
        {#each visibleUsers as user (user.user_id || user.email)}
          <div
            class="relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border-2 border-[#0F1117] transition-transform group-hover:scale-105"
            style="background-color: {user.color || '#F59E0B'};"
          >
            {#if user.avatar_url}
              <img src={user.avatar_url} alt={user.full_name} class="w-full h-full rounded-full object-cover" />
            {:else}
              <span class="font-['IBM_Plex_Mono',monospace]">{getUserInitials(user.full_name, user.email)}</span>
            {/if}

            <span class="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-[#0F1117] animate-pulse"></span>
          </div>
        {/each}

        {#if extraCount > 0}
          <div class="w-6 h-6 rounded-full bg-white/15 border-2 border-[#0F1117] text-white text-[9px] font-bold flex items-center justify-center font-['IBM_Plex_Mono',monospace]">
            +{extraCount}
          </div>
        {/if}
      </div>

      <span class="text-[11px] font-semibold text-white/70 group-hover:text-white transition-colors hidden sm:inline ml-0.5">
        {onlineUsers.length} online
      </span>
      <ChevronDown size={12} class="text-white/40 group-hover:text-white transition-transform duration-150" />
    </button>

    <!-- Popover Menu -->
    {#if isOpen}
      <!-- Backdrop overlay to dismiss popover -->
      <div class="fixed inset-0 z-[90]" role="presentation" onclick={() => (isOpen = false)}></div>

      <div class="absolute top-full right-0 mt-2 w-64 rounded-2xl border border-white/15 bg-[#141722] p-3 shadow-2xl z-[100] space-y-2 text-white animate-in fade-in duration-150">
        <div class="flex items-center justify-between border-b border-white/10 pb-2 px-1">
          <div class="flex items-center gap-1.5 text-xs font-bold text-white tracking-tight">
            <Users size={14} class="text-amber-400" />
            <span>Active Viewers ({onlineUsers.length})</span>
          </div>
          <span class="flex items-center gap-1 text-[10px] text-emerald-400 font-medium font-['IBM_Plex_Mono',monospace]">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
          </span>
        </div>

        <div class="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
          {#each onlineUsers as user (user.user_id || user.email)}
            <div class="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow"
                  style="background-color: {user.color || '#F59E0B'};"
                >
                  {#if user.avatar_url}
                    <img src={user.avatar_url} alt={user.full_name} class="w-full h-full rounded-full object-cover" />
                  {:else}
                    <span class="font-['IBM_Plex_Mono',monospace]">{getUserInitials(user.full_name, user.email)}</span>
                  {/if}
                </div>

                <div class="min-w-0">
                  <div class="text-xs font-semibold text-white truncate">
                    {user.full_name || 'Anonymous User'}
                  </div>
                  <div class="text-[10px] text-white/40 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div class="shrink-0">
                <span class="text-[9px] px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-amber-400 font-medium capitalize font-['IBM_Plex_Mono',monospace]">
                  {user.role}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
