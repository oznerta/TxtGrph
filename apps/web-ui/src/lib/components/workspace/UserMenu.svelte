<script lang="ts">
  import { User, Settings, KeyRound, LogOut, ChevronDown } from 'lucide-svelte';

  let {
    userEmail = '',
    userName = '',
    onSignOut = () => {}
  } = $props();

  let isOpen = $state(false);

  const displayName = $derived(userName && userName.trim() ? userName : (userEmail ? userEmail.split('@')[0] : 'Developer'));

  const initials = $derived.by(() => {
    if (userName && userName.trim()) {
      const parts = userName.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return userName.slice(0, 2).toUpperCase();
    }
    if (userEmail) return userEmail.charAt(0).toUpperCase();
    return 'U';
  });

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }
</script>

<svelte:window onclick={closeMenu} />

<div class="relative shrink-0 select-none">
  <!-- Avatar Pill Trigger Button -->
  <button
    onclick={toggleMenu}
    title="Account Settings"
    class="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-white/15 bg-white/5 hover:border-amber-400/50 hover:bg-white/10 transition-all cursor-pointer"
  >
    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-sm font-['IBM_Plex_Mono',monospace]">
      {initials}
    </div>
    <span class="text-xs font-bold text-white max-w-[130px] truncate hidden md:inline">
      {displayName}
    </span>
    <ChevronDown size={14} class="text-white/50 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" />
  </button>

  <!-- Popover Menu -->
  {#if isOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      role="presentation"
      onclick={(e) => e.stopPropagation()}
      class="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-[#0F111A] border border-white/15 shadow-2xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150 font-['Instrument_Sans',sans-serif]"
    >
      <!-- User Info Header -->
      <div class="px-4 py-3 border-b border-white/10 space-y-0.5">
        <div class="font-bold text-white text-xs truncate">{displayName}</div>
        <div class="text-[11px] text-white/50 truncate font-['IBM_Plex_Mono',monospace]">{userEmail}</div>
      </div>

      <!-- Menu Options -->
      <div class="py-1">
        <a
          href="/settings"
          onclick={closeMenu}
          class="flex items-center gap-2.5 px-3.5 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
        >
          <Settings size={15} class="text-[var(--color-text-muted)]" />
          <span>Settings & API Tokens</span>
        </a>
      </div>

      <!-- Divider & Sign Out -->
      <div class="border-t border-[var(--color-border-default)] pt-1">
        <button
          onclick={() => {
            closeMenu();
            onSignOut();
          }}
          class="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors font-medium"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  {/if}
</div>
