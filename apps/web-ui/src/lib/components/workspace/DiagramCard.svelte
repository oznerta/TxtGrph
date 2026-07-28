<script lang="ts">
  import type { Diagram } from '@txtgrph/core';
  import DiagramThumbnail from './DiagramThumbnail.svelte';
  import { Share2, Trash2, MoreVertical } from 'lucide-svelte';
  import FavoriteIcon from '$lib/components/ui/FavoriteIcon.svelte';

  let {
    diagram,
    isFavorite = false,
    onSelect = (id: string) => {},
    onToggleFavorite = (id: string) => {},
    onShare = (diagram: Diagram) => {},
    onDelete = (id: string) => {},
  } = $props();

  let showMenu = $state(false);

  function formatTimeAgo(isoDateStr: string) {
    if (!isoDateStr) return '';
    const date = new Date(isoDateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `created ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `created ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'created recently';
  }
</script>

<div
  role="button"
  tabindex="0"
  onclick={() => onSelect(diagram.id)}
  onkeydown={(e) => e.key === 'Enter' && onSelect(diagram.id)}
  class="group cursor-pointer rounded-2xl border border-white/15 bg-[#0F1117] hover:border-white/30 hover:shadow-2xl shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative select-none glass-panel-hover"
>
  <!-- Thumbnail Header Container -->
  <div class="relative w-full h-[155px] bg-[#090A0F] flex items-center justify-center p-2">
    <DiagramThumbnail code={diagram.code} />

    <!-- Top Right Favorite Button Overlay -->
    <button
      onclick={(e) => {
        e.stopPropagation();
        onToggleFavorite(diagram.id);
      }}
      title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      class="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-white/60 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 {isFavorite ? 'opacity-100' : ''}"
    >
      <FavoriteIcon active={isFavorite} size={15} />
    </button>
  </div>

  <!-- Card Body Footer -->
  <div class="p-4 flex items-center justify-between border-t border-white/10 bg-[#0F1117]">
    <div class="min-w-0 flex-1 pr-2">
      <h3 class="font-['Instrument_Sans',sans-serif] font-bold text-[13.5px] text-white truncate group-hover:text-amber-400 transition-colors">
        {diagram.title || 'Untitled diagram'}
      </h3>
      <p class="text-[11px] text-white/50 mt-0.5 font-medium font-['Instrument_Sans',sans-serif]">
        You {formatTimeAgo(diagram.createdAt)}
      </p>
    </div>

    <!-- Actions Popup Menu -->
    <div class="relative shrink-0">
      <button
        onclick={(e) => {
          e.stopPropagation();
          showMenu = !showMenu;
        }}
        class="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
      >
        <MoreVertical class="w-4 h-4" />
      </button>

      {#if showMenu}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          role="presentation"
          class="absolute right-0 bottom-full mb-1 w-36 rounded-xl bg-[#1E202C] border border-slate-700 shadow-2xl py-1 z-20 text-xs font-['Instrument_Sans',sans-serif]"
          onclick={(e) => e.stopPropagation()}
        >
          <button
            onclick={() => {
              showMenu = false;
              onShare(diagram);
            }}
            class="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-white"
          >
            <Share2 class="w-3.5 h-3.5" /> Share
          </button>
          <button
            onclick={() => {
              showMenu = false;
              onDelete(diagram.id);
            }}
            class="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-500/10 text-red-400"
          >
            <Trash2 class="w-3.5 h-3.5" /> Move to Trash
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
