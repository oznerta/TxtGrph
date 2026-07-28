<script lang="ts">
  import { onMount } from 'svelte';
  import { Sparkles, Loader2, Play, Check, X, Settings, Cpu, Wrench } from 'lucide-svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { decryptApiKey } from '$lib/crypto';
  import { AIRouter, type AIProvider } from '@txtgrph/ai-router';
  import type { UserKeyRecord } from '../../../routes/settings/+page.js';
  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';

  let {
    isOpen = $bindable(false),
    currentCode = '',
    onApply = (newCode: string) => {},
    onOpenSettings = () => {},
  } = $props();

  const supabase = createSupabaseBrowserClient();

  let userKeys = $state<UserKeyRecord[]>([]);
  let isLoadingKeys = $state(true);
  let selectedProvider = $state<string>('');
  let promptText = $state('');
  let mode = $state<'create' | 'refine'>('create');
  let isGenerating = $state(false);
  let streamedText = $state('');
  let sanitizedCode = $state('');
  let errorMessage = $state('');

  let providerOptions = $derived.by<SelectOption[]>(() => {
    return userKeys.map((k) => ({
      value: k.provider,
      label: `${k.provider.toUpperCase()} (${k.key_hint})`,
      icon: Cpu
    }));
  });

  let modeOptions: SelectOption[] = [
    { value: 'create', label: 'Create New Diagram', description: 'Generate diagram from prompt scratch', icon: Sparkles },
    { value: 'refine', label: 'Refine Current Diagram', description: 'Modify and update existing canvas code', icon: Wrench }
  ];

  $effect(() => {
    if (isOpen) {
      if (currentCode && currentCode.trim()) {
        mode = 'refine';
      } else {
        mode = 'create';
      }
    }
  });

  onMount(async () => {
    await fetchKeys();
  });

  async function fetchKeys() {
    isLoadingKeys = true;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        userKeys = [];
        return;
      }
      const { data } = await supabase
        .from('user_keys')
        .select('*')
        .order('created_at', { ascending: true });

      userKeys = (data || []) as UserKeyRecord[];
      if (userKeys.length > 0) {
        selectedProvider = userKeys[0].provider;
      }
    } catch (err) {
      console.error('Error loading user keys:', err);
    } finally {
      isLoadingKeys = false;
    }
  }

  async function handleGenerate() {
    if (!promptText.trim()) return;
    const activeKeyRecord = userKeys.find((k) => k.provider === selectedProvider);
    if (!activeKeyRecord) {
      errorMessage = 'No API key configured for selected provider.';
      return;
    }

    try {
      isGenerating = true;
      errorMessage = '';
      streamedText = '';
      sanitizedCode = '';

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Authentication session expired.');

      const rawApiKey = await decryptApiKey(activeKeyRecord.encrypted_key, sessionData.session.user.id);

      await AIRouter.streamGenerate(
        {
          provider: selectedProvider as any,
          apiKey: rawApiKey,
          baseUrl: activeKeyRecord.base_url || undefined,
          model: activeKeyRecord.model || undefined,
        },
        {
          prompt: promptText.trim(),
          currentCode: mode === 'refine' ? currentCode : undefined,
        },
        (chunk) => {
          if (chunk.type === 'token' && chunk.fullText) {
            streamedText = chunk.fullText;
          } else if (chunk.type === 'complete' && chunk.sanitizedCode) {
            sanitizedCode = chunk.sanitizedCode;
          } else if (chunk.type === 'error' && chunk.error) {
            errorMessage = chunk.error;
          }
        }
      );
    } catch (err: any) {
      errorMessage = err.message || 'Generation failed.';
    } finally {
      isGenerating = false;
    }
  }

  function handleApply() {
    const finalCode = sanitizedCode || streamedText;
    if (finalCode) {
      onApply(finalCode);
      isOpen = false;
    }
  }

  function handleClose() {
    isOpen = false;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-['Instrument_Sans',sans-serif] select-none">
    <div class="bg-[#0F1117] border border-white/15 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[85vh] text-white">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles class="w-4.5 h-4.5" />
          </div>
          <h2 class="text-base font-bold text-white tracking-tight">BYOK AI Diagram Assistant</h2>
        </div>
        <button onclick={handleClose} class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
          <X class="w-4.5 h-4.5" />
        </button>
      </div>

      {#if isLoadingKeys}
        <div class="p-8 text-center text-xs text-white/50 flex items-center justify-center gap-2 font-['IBM_Plex_Mono',monospace]">
          <Loader2 class="w-4 h-4 animate-spin text-amber-400" /> Loading your saved keys...
        </div>
      {:else if userKeys.length === 0}
        <div class="p-6 text-center space-y-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p class="text-xs text-white/70">No BYOK AI API keys found in your vault.</p>
          <button
            onclick={() => {
              isOpen = false;
              onOpenSettings();
            }}
            class="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-md cursor-pointer"
          >
            <Settings class="w-4 h-4" /> Add API Key in Settings
          </button>
        </div>
      {:else}
        <!-- Form Controls -->
        <div class="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <!-- Provider Selector -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="ai-provider-select" class="block text-xs font-semibold text-white/70 mb-1.5">AI Provider</label>
              <CustomSelect
                id="ai-provider-select"
                options={providerOptions}
                bind:value={selectedProvider}
              />
            </div>

            <div>
              <label for="ai-action-mode-select" class="block text-xs font-semibold text-white/70 mb-1.5">Action Mode</label>
              <CustomSelect
                id="ai-action-mode-select"
                options={modeOptions}
                bind:value={mode}
              />
            </div>
          </div>

          <!-- Prompt Input -->
          <div>
            <label for="ai-prompt-input" class="block text-xs font-semibold text-white/70 mb-1.5">
              Instructions / Diagram Prompt
            </label>
            <textarea
              id="ai-prompt-input"
              bind:value={promptText}
              placeholder={mode === 'create' ? 'e.g. Create a sequence diagram showing user login, JWT issue, and DB lookup' : 'e.g. Add an error handling node and style it red'}
              rows={3}
              class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/15 bg-[#0A0B0E] text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-['IBM_Plex_Mono',monospace]"
            ></textarea>
          </div>

          {#if errorMessage}
            <div class="p-3 text-xs rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 font-['IBM_Plex_Mono',monospace]">
              {errorMessage}
            </div>
          {/if}

          <!-- Live Output Preview -->
          {#if streamedText || isGenerating}
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs text-white/60 font-semibold">
                <span>Generated Output:</span>
                {#if isGenerating}
                  <span class="flex items-center gap-1.5 text-amber-400 font-['IBM_Plex_Mono',monospace] text-[11px]">
                    <Loader2 class="w-3.5 h-3.5 animate-spin" /> Streaming...
                  </span>
                {/if}
              </div>
              <pre class="p-3 rounded-xl bg-[#0A0B0E] border border-white/15 font-['IBM_Plex_Mono',monospace] text-xs overflow-x-auto max-h-48 whitespace-pre-wrap text-emerald-300">
{sanitizedCode || streamedText}
              </pre>
            </div>
          {/if}
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onclick={() => {
              isOpen = false;
              onOpenSettings();
            }}
            class="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings class="w-3.5 h-3.5" /> Manage Keys in Settings
          </button>

          <div class="flex items-center gap-2">
            <button
              onclick={handleClose}
              class="px-4 py-2 text-xs font-semibold rounded-xl border border-white/15 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {#if sanitizedCode || streamedText}
              <button
                onclick={handleApply}
                class="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Check class="w-3.5 h-3.5" /> Apply to Editor
              </button>
            {:else}
              <button
                onclick={handleGenerate}
                disabled={isGenerating || !promptText.trim()}
                class="px-5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
              >
                {#if isGenerating}
                  <Loader2 class="w-3.5 h-3.5 animate-spin" /> Generating...
                {:else}
                  <Play class="w-3.5 h-3.5" /> Generate Diagram
                {/if}
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
