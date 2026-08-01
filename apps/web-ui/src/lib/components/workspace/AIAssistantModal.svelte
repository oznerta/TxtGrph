<script lang="ts">
  import { onMount } from 'svelte';
  import { Sparkles, Loader2, Play, Check, X, Settings, Cpu, Wrench, RefreshCw, Lightbulb, HelpCircle, ArrowRight } from 'lucide-svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { decryptApiKey } from '$lib/crypto';
  import { AIRouter, type AIProvider } from '@txtgrph/ai-router';
  import type { UserKeyRecord } from '../../../routes/settings/+page.js';
  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';

  interface Props {
    isOpen?: boolean;
    currentCode?: string;
    onApply?: (newCode: string, mode: 'create' | 'refine', promptTitle?: string) => Promise<void> | void;
    onOpenSettings?: () => void;
  }

  let {
    isOpen = $bindable(false),
    currentCode = '',
    onApply = () => {},
    onOpenSettings = () => {},
  }: Props = $props();

  const supabase = createSupabaseBrowserClient();

  let userKeys = $state<UserKeyRecord[]>([]);
  let isLoadingKeys = $state(true);
  let selectedProvider = $state<string>('');
  let promptText = $state('');
  let mode = $state<'create' | 'refine'>('create');
  let isGenerating = $state(false);
  let isApplying = $state(false);
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

  const createPromptTemplates = [
    { label: '🚀 User Auth Flow', text: 'Create a sequence diagram showing user login, password verification, JWT generation, and dashboard redirect' },
    { label: '🏗️ System Architecture', text: 'Create an architecture diagram with Client App, API Gateway, Microservices, Redis Cache, and PostgreSQL Database' },
    { label: '🛒 E-Commerce Checkout', text: 'Create a flowchart for e-commerce checkout from cart item check to Stripe payment and email receipt' },
    { label: '🔄 Data Pipeline', text: 'Create a flowchart of a data ingestion pipeline from Kafka stream to ETL processing, S3 bucket, and Snowflake' }
  ];

  const refinePromptTemplates = [
    { label: '🎨 Vibrant Styling', text: 'Apply modern vibrant colors, curved edges, and custom stroke styling to all nodes' },
    { label: '🛡️ Error Handling', text: 'Add error handling branches, retry loops, and fallback alert nodes' },
    { label: '📝 Detailed Labels', text: 'Add descriptive labels and notes explaining each processing step in detail' }
  ];

  function resetState() {
    promptText = '';
    streamedText = '';
    sanitizedCode = '';
    errorMessage = '';
    isGenerating = false;
    isApplying = false;
  }

  $effect(() => {
    if (isOpen) {
      if (currentCode && currentCode.trim()) {
        mode = 'refine';
      } else {
        mode = 'create';
      }
      resetState();
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
      errorMessage = 'No API key configured for the selected provider.';
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
      errorMessage = err?.message || 'Generation failed.';
    } finally {
      isGenerating = false;
    }
  }

  async function handleApply() {
    const finalCode = sanitizedCode || streamedText;
    if (!finalCode) return;
    
    isApplying = true;
    try {
      const generatedTitle = promptText.trim().slice(0, 35) || 'AI Generated Diagram';
      await onApply(finalCode, mode, generatedTitle);
      resetState();
      isOpen = false;
    } catch (err: any) {
      console.error('Failed to apply generated diagram:', err);
      errorMessage = err?.message || 'Failed to apply diagram code.';
    } finally {
      isApplying = false;
    }
  }

  function handleClose() {
    resetState();
    isOpen = false;
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-['Instrument_Sans',sans-serif] select-none"
    role="presentation"
    onclick={handleClose}
  >
    <!-- Modal Card Container -->
    <div
      class="bg-[#0F1117] border border-white/15 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] text-white overflow-visible relative"
      role="dialog"
      aria-labelledby="ai-assistant-title"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-white/10 pb-4 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 id="ai-assistant-title" class="text-base font-bold text-white tracking-tight">AI Diagram Assistant</h2>
              <span class="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 font-['IBM_Plex_Mono',monospace]">
                BYOK Mode
              </span>
            </div>
            <p class="text-xs text-white/50 mt-0.5">
              Turn your ideas into visual diagrams using your personal AI API key.
            </p>
          </div>
        </div>
        <button
          onclick={handleClose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close assistant"
        >
          <X class="w-4.5 h-4.5" />
        </button>
      </div>

      {#if isLoadingKeys}
        <div class="p-10 text-center text-xs text-white/50 flex items-center justify-center gap-2 font-['IBM_Plex_Mono',monospace]">
          <Loader2 class="w-4 h-4 animate-spin text-amber-400" /> Loading your saved AI keys...
        </div>
      {:else if userKeys.length === 0}
        <div class="p-6 text-center space-y-4 rounded-xl bg-white/[0.03] border border-white/10 my-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Settings class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">No AI Keys Configured</h3>
            <p class="text-xs text-white/60 max-w-md mx-auto mt-1">
              Add your API key (OpenAI, Anthropic, Gemini, DeepSeek, Groq, Ollama) in Settings. Your keys are encrypted and stored safely in your browser.
            </p>
          </div>
          <button
            onclick={() => {
              handleClose();
              onOpenSettings();
            }}
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-md cursor-pointer"
          >
            <Settings class="w-4 h-4" /> Open Key Settings
          </button>
        </div>
      {:else}
        <!-- Main Form Body -->
        <div class="space-y-4 py-4 overflow-y-auto custom-scrollbar flex-1 pr-1 overflow-x-visible">
          <!-- AI Provider & Action Mode Selection -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label for="ai-provider-select-box" class="block text-xs font-semibold text-white/80">AI Provider Key</label>
              <button
                onclick={() => {
                  handleClose();
                  onOpenSettings();
                }}
                class="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors font-['IBM_Plex_Mono',monospace] cursor-pointer"
              >
                <Settings class="w-3 h-3" /> Key Vault
              </button>
            </div>
            <CustomSelect
              id="ai-provider-select-box"
              options={providerOptions}
              bind:value={selectedProvider}
            />
          </div>

          <!-- Action Mode Radio Cards (Eliminates dropdown clipping & clear for non-technical users) -->
          <div>
            <label class="block text-xs font-semibold text-white/80 mb-2">What would you like to do?</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onclick={() => (mode = 'create')}
                class={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  mode === 'create'
                    ? 'border-amber-400 bg-amber-500/10 text-white ring-1 ring-amber-400/40 shadow-inner'
                    : 'border-white/15 bg-[#0A0B0E] hover:border-white/30 text-white/70 hover:text-white'
                }`}
              >
                <div class={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${mode === 'create' ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-white/50'}`}>
                  <Sparkles size={14} />
                </div>
                <div>
                  <div class="text-xs font-bold text-white">Create New Diagram</div>
                  <div class="text-[11px] text-white/50 leading-tight mt-0.5">Generate a brand-new diagram from scratch</div>
                </div>
              </button>

              <button
                type="button"
                onclick={() => (mode = 'refine')}
                disabled={!currentCode || !currentCode.trim()}
                class={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  mode === 'refine'
                    ? 'border-amber-400 bg-amber-500/10 text-white ring-1 ring-amber-400/40 shadow-inner'
                    : 'border-white/15 bg-[#0A0B0E] hover:border-white/30 text-white/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <div class={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${mode === 'refine' ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-white/50'}`}>
                  <Wrench size={14} />
                </div>
                <div>
                  <div class="text-xs font-bold text-white">Refine Open Diagram</div>
                  <div class="text-[11px] text-white/50 leading-tight mt-0.5">Modify & update currently open editor code</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Prompt Input & Starter Templates -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="ai-prompt-input" class="block text-xs font-semibold text-white/80">
                Instructions / Diagram Prompt
              </label>
              <span class="text-[10px] text-white/40 font-['IBM_Plex_Mono',monospace]">Describe what you want to visualize</span>
            </div>

            <textarea
              id="ai-prompt-input"
              bind:value={promptText}
              placeholder={mode === 'create' ? 'e.g. Create a sequence diagram showing user login, JWT issue, and DB lookup' : 'e.g. Add an error handling node and style it red'}
              rows={3}
              class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/15 bg-[#0A0B0E] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 font-['IBM_Plex_Mono',monospace] transition-colors"
            ></textarea>

            <!-- Starter Template Chips for Non-Technical Users -->
            <div class="mt-2.5 space-y-1.5">
              <div class="flex items-center gap-1.5 text-[11px] text-white/40 font-medium">
                <Lightbulb size={12} class="text-amber-400" />
                <span>Click a starter example:</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                {#each mode === 'create' ? createPromptTemplates : refinePromptTemplates as tmpl}
                  <button
                    type="button"
                    onclick={() => (promptText = tmpl.text)}
                    class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 text-[11px] text-white/70 transition-colors cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                {/each}
              </div>
            </div>
          </div>

          <!-- Error Message Display -->
          {#if errorMessage}
            <div class="p-3 text-xs rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 font-['IBM_Plex_Mono',monospace]">
              {errorMessage}
            </div>
          {/if}

          <!-- Live Streaming Code Preview -->
          {#if streamedText || isGenerating || sanitizedCode}
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs text-white/60 font-semibold">
                <span>Generated Mermaid Code:</span>
                {#if isGenerating}
                  <span class="flex items-center gap-1.5 text-amber-400 font-['IBM_Plex_Mono',monospace] text-[11px]">
                    <Loader2 class="w-3.5 h-3.5 animate-spin" /> Streaming response...
                  </span>
                {:else}
                  <span class="text-emerald-400 font-['IBM_Plex_Mono',monospace] text-[11px] flex items-center gap-1">
                    <Check size={12} /> Ready to apply
                  </span>
                {/if}
              </div>
              <pre class="p-3 rounded-xl bg-[#0A0B0E] border border-white/15 font-['IBM_Plex_Mono',monospace] text-xs overflow-x-auto max-h-40 whitespace-pre-wrap text-emerald-300 leading-relaxed">
{sanitizedCode || streamedText}
              </pre>
            </div>
          {/if}
        </div>

        <!-- Footer Action Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-white/10 shrink-0">
          {#if sanitizedCode || streamedText}
            <button
              type="button"
              onclick={() => {
                streamedText = '';
                sanitizedCode = '';
                errorMessage = '';
              }}
              class="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer font-['IBM_Plex_Mono',monospace]"
            >
              <RefreshCw class="w-3.5 h-3.5" /> Start Over / Try Another
            </button>
          {:else}
            <button
              type="button"
              onclick={() => {
                handleClose();
                onOpenSettings();
              }}
              class="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings class="w-3.5 h-3.5" /> Key Settings
            </button>
          {/if}

          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={handleClose}
              class="px-4 py-2 text-xs font-semibold rounded-xl border border-white/15 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {#if sanitizedCode || streamedText}
              <button
                type="button"
                onclick={handleApply}
                disabled={isApplying || isGenerating}
                class="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                {#if isApplying}
                  <Loader2 class="w-3.5 h-3.5 animate-spin" /> Applying...
                {:else}
                  <Check class="w-3.5 h-3.5" />
                  <span>{mode === 'create' ? 'Create Diagram' : 'Apply to Editor'}</span>
                {/if}
              </button>
            {:else}
              <button
                type="button"
                onclick={handleGenerate}
                disabled={isGenerating || !promptText.trim()}
                class="px-5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
              >
                {#if isGenerating}
                  <Loader2 class="w-3.5 h-3.5 animate-spin" /> Generating...
                {:else}
                  <Play class="w-3.5 h-3.5 fill-black" />
                  <span>Generate Diagram</span>
                {/if}
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
