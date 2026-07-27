<script lang="ts">
  import { ChevronDown, Check } from 'lucide-svelte';

  export interface DropdownOption {
    value: string;
    label: string;
    description?: string;
  }

  interface Props {
    options: (string | DropdownOption)[];
    value: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
  }

  let {
    options = [],
    value = $bindable(''),
    onChange,
    placeholder = 'Select option...',
    className = '',
  }: Props = $props();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | null = $state(null);

  // Normalize options to DropdownOption format
  const normalizedOptions = $derived(
    options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    )
  );

  const selectedOption = $derived(
    normalizedOptions.find((opt) => opt.value === value) || {
      value,
      label: value || placeholder,
    }
  );

  function toggleOpen(e: MouseEvent) {
    e.stopPropagation();
    isOpen = !isOpen;
  }

  function selectOption(optValue: string, e: MouseEvent) {
    e.stopPropagation();
    value = optValue;
    if (onChange) {
      onChange(optValue);
    }
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      window.addEventListener('click', handleClickOutside);
    } else {
      window.removeEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div bind:this={dropdownRef} class="relative inline-block text-left {className}">
  <!-- Trigger Button -->
  <button
    type="button"
    onclick={toggleOpen}
    class="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] font-['IBM_Plex_Mono',monospace] font-semibold text-white bg-[#161822] hover:bg-[#1E2130] border border-white/20 hover:border-white/35 rounded-xl transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer min-w-[150px]"
    aria-expanded={isOpen}
  >
    <span class="truncate">{selectedOption.label}</span>
    <ChevronDown
      size={16}
      class="text-white/60 transition-transform duration-200 shrink-0 {isOpen ? 'rotate-180 text-blue-400' : ''}"
    />
  </button>

  <!-- Options Menu Dropdown -->
  {#if isOpen}
    <div
      class="absolute left-0 mt-2 w-max min-w-full p-1.5 rounded-xl bg-[#181A26] border border-white/20 shadow-2xl backdrop-blur-xl z-50 font-['IBM_Plex_Mono',monospace] space-y-0.5"
    >
      {#each normalizedOptions as option}
        <button
          type="button"
          onclick={(e) => selectOption(option.value, e)}
          class="w-full flex items-center justify-between gap-3 px-3 py-2 text-[12px] text-left rounded-lg transition-colors cursor-pointer {value === option.value
            ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
            : 'text-white/80 hover:bg-white/10 hover:text-white'}"
        >
          <div class="flex flex-col">
            <span>{option.label}</span>
            {#if option.description}
              <span class="text-[10px] text-white/40 font-normal">{option.description}</span>
            {/if}
          </div>
          {#if value === option.value}
            <Check size={13} class="text-blue-400 shrink-0" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
