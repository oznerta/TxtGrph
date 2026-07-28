<script lang="ts">
  import { X, Building2, Users } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    onCreateOrg?: (name: string) => void;
    onclose?: () => void;
  }

  let {
    open = false,
    onCreateOrg = () => {},
    onclose = () => {}
  }: Props = $props();

  let orgName = $state('');

  function handleSubmit() {
    if (orgName.trim()) {
      onCreateOrg(orgName.trim());
      orgName = '';
      onclose();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      role="presentation"
      class="w-full max-w-md rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-hidden text-white p-6 space-y-5"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
          <h3 class="text-base font-bold text-white tracking-tight">Create Organization Space</h3>
        </div>
        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div class="space-y-3">
        <p class="text-xs text-white/50 leading-relaxed">
          Create a shared team workspace for collaborating on diagrams with your team members.
        </p>

        <div>
          <label for="org-name-input" class="block text-xs font-semibold text-white/70 mb-1.5">
            Organization Name
          </label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="org-name-input"
            type="text"
            bind:value={orgName}
            placeholder="e.g. Acme Engineering"
            onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/15 bg-[#0A0B0E] text-white font-medium focus:outline-none focus:border-white/30 placeholder-white/30"
            autofocus
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
        <button
          onclick={onclose}
          class="px-4 py-2 text-xs font-semibold rounded-xl border border-white/15 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={handleSubmit}
          disabled={!orgName.trim()}
          class="px-5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors disabled:opacity-50 shadow-md cursor-pointer"
        >
          Create Space
        </button>
      </div>
    </div>
  </div>
{/if}
