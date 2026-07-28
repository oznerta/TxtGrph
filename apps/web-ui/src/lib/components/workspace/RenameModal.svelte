<script lang="ts">
  import { Edit3, Folder, FileText, X } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    itemType?: 'folder' | 'diagram';
    itemId?: string | null;
    initialName?: string;
    onrename?: (id: string, newName: string) => void;
    onclose?: () => void;
  }

  let {
    open = false,
    itemType = 'diagram',
    itemId = null,
    initialName = '',
    onrename = () => {},
    onclose = () => {}
  }: Props = $props();

  let nameValue = $state('');

  $effect(() => {
    if (open) {
      nameValue = initialName;
    }
  });

  function handleSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && itemId) {
      onrename(itemId, trimmed);
      onclose();
    }
  }
</script>

{#if open}
  <!-- Backdrop Overlay -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    role="presentation"
    tabindex="-1"
    onclick={onclose}
    class="fixed inset-0 z-[150] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-['Instrument_Sans',sans-serif]"
  >
    <!-- Modal Card Container -->
    <div
      role="presentation"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      class="w-full max-w-md bg-[#0F1117] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-white"
    >
      <!-- Header Bar -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            {#if itemType === 'folder'}
              <Folder size={18} />
            {:else}
              <FileText size={18} />
            {/if}
          </div>
          <div>
            <h3 class="text-base font-bold text-white tracking-tight">
              Rename {itemType === 'folder' ? 'Folder' : 'Diagram'}
            </h3>
            <p class="text-xs text-white/50">Enter a new name for this {itemType}</p>
          </div>
        </div>

        <button
          onclick={onclose}
          aria-label="Close modal"
          class="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <!-- Input Form -->
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <div class="space-y-1.5">
          <label for="rename-input" class="block text-xs font-semibold text-white/70">
            Name
          </label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="rename-input"
            type="text"
            bind:value={nameValue}
            placeholder={itemType === 'folder' ? 'Folder name...' : 'Diagram title...'}
            class="w-full h-11 px-4 text-sm rounded-xl bg-[#161824] border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
            autofocus
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onclick={onclose}
            class="px-4 py-2.5 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!nameValue.trim()}
            class="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 size={14} />
            <span>Save Name</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
