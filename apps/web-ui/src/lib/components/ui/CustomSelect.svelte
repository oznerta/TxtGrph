<script lang="ts">
  import { ChevronDown, Check } from 'lucide-svelte';

  export interface SelectOption {
    value: string | number;
    label: string;
    description?: string;
    icon?: any;
  }

  interface Props {
    options: SelectOption[];
    value: string | number;
    placeholder?: string;
    onChange?: (value: any) => void;
    class?: string;
    id?: string;
    dropUp?: boolean;
  }

  let { options = [], value = $bindable(), placeholder = 'Select option...', onChange, class: className = '', id, dropUp = false }: Props = $props();

  let isOpen = $state(false);

  let selectedOption = $derived.by(() => {
    return options.find((o) => o.value === value) || options[0];
  });

  function handleSelect(option: SelectOption) {
    value = option.value;
    isOpen = false;
    if (onChange) onChange(option.value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative inline-block w-full text-left font-['Instrument_Sans',sans-serif] {className}">
  <!-- Trigger Button -->
  <button
    {id}
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-sm focus:outline-none {isOpen ? 'border-white/40 bg-[#12141F] ring-2 ring-white/10' : 'border-white/15 bg-[#0A0B0E] hover:border-white/30 text-white'}"
  >
    <div class="flex items-center gap-2.5 truncate">
      {#if selectedOption?.icon}
        {@const SelectedIcon = selectedOption.icon}
        <SelectedIcon size={15} class="text-amber-400 shrink-0" />
      {/if}
      <span class="text-xs font-semibold text-white truncate">{selectedOption?.label || placeholder}</span>
    </div>
    <ChevronDown size={14} class="text-white/50 transition-transform duration-200 shrink-0 ml-2 {isOpen ? 'rotate-180 text-white' : ''}" />
  </button>

  {#if isOpen}
    <!-- Floating Backdrop dismiss -->
    <div class="fixed inset-0 z-[90]" onclick={() => (isOpen = false)} role="presentation"></div>

    <!-- Ultra-Sleek Glassmorphic Dropdown Body -->
    <div
      class="absolute left-0 right-0 z-[100] rounded-2xl border border-white/20 bg-[#141622] shadow-2xl p-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in duration-150 ease-out {dropUp ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}"
    >
      <div class="space-y-1">
        {#each options as opt (opt.value)}
          {@const isSelected = value === opt.value}
          <button
            type="button"
            onclick={() => handleSelect(opt)}
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer group {isSelected ? 'bg-white/15 text-white font-bold border-l-2 border-amber-400 pl-3 shadow-inner' : 'text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-0.5'}"
          >
            <div class="flex items-center gap-2.5 truncate min-w-0">
              {#if opt.icon}
                {@const OptIcon = opt.icon}
                <div class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors {isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/50 group-hover:text-white group-hover:bg-white/10'}">
                  <OptIcon size={13} />
                </div>
              {/if}

              <div class="truncate">
                <div class="truncate text-xs font-semibold leading-tight {isSelected ? 'text-white' : 'text-white/90'}">{opt.label}</div>
                {#if opt.description}
                  <div class="text-[10.5px] text-white/40 font-normal truncate mt-0.5">{opt.description}</div>
                {/if}
              </div>
            </div>

            {#if isSelected}
              <div class="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 ml-2">
                <Check size={12} />
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
