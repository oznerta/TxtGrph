<script lang="ts">
  import { onMount } from 'svelte';
  import { Sparkles, Loader2, Play, Check, X, Settings, Cpu, Wrench, RefreshCw, Lightbulb } from 'lucide-svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { decryptApiKey } from '$lib/crypto';
  import { AIRouter } from '@txtgrph/ai-router';
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
    { label: 'Auth Flow', text: 'Sequence diagram showing user login, password verification, JWT issuance, and dashboard redirect' },
    { label: 'System Architecture', text: 'Architecture diagram with Client App, API Gateway, Microservices, Redis Cache, and PostgreSQL' },
    { label: 'Checkout Flow', text: 'Flowchart for e-commerce checkout from cart validation to Stripe payment and order confirmation' },
    { label: 'Data Pipeline', text: 'Flowchart of a data pipeline from Kafka stream to ETL processing, S3 bucket, and Snowflake warehouse' }
  ];

  const refinePromptTemplates = [
    { label: 'Vibrant Colors', text: 'Apply modern vibrant colors, curved edges, and custom stroke styling to all nodes' },
    { label: 'Error Handling', text: 'Add error handling branches, retry loops, and fallback alert nodes' },
    { label: 'Descriptive Labels', text: 'Add descriptive labels and notes explaining each processing step in detail' }
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

      const config = {
        provider: selectedProvider as any,
        apiKey: rawApiKey,
        baseUrl: activeKeyRecord.base_url || undefined,
        model: activeKeyRecord.model || undefined,
      };

      const options = {
        prompt: promptText.trim(),
        currentCode: mode === 'refine' ? currentCode : undefined,
      };

      // Server-side SSE stream
      try {
        const response = await fetch('/api/v1/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, options }),
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;
              const dataStr = trimmed.substring(5).trim();

              try {
                const chunk = JSON.parse(dataStr);
                if (chunk.type === 'token' && chunk.fullText) {
                  streamedText = chunk.fullText;
                } else if (chunk.type === 'complete' && chunk.sanitizedCode) {
                  sanitizedCode = chunk.sanitizedCode;
                } else if (chunk.type === 'error' && chunk.error) {
                  errorMessage = chunk.error;
                }
              } catch {
                // ignore partial parse error
              }
            }
          }
          return;
        }
      } catch (proxyErr) {
        console.warn('Server proxy error, trying client fallback:', proxyErr);
      }

      // Client direct call fallback
      await AIRouter.streamGenerate(
        config,
        options,
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
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-['Instrument_Sans',sans-serif] select-none"
    role="presentation"
    onclick={handleClose}
  >
    <!-- Modal Container -->
    <div
      class="bg-[#0D0F15] border border-white/12 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col text-white relative animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-labelledby="ai-assistant-title"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Sleek Minimal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <h2 id="ai-assistant-title" class="text-sm font-bold text-white tracking-tight">AI Diagram Assistant</h2>
        </div>

        <!-- Mode Toggle (Create / Refine) -->
        <div class="flex items-center gap-1 p-0.5 rounded-lg bg-black/50 border border-white/10 text-[11px] font-medium">
          <button
            type="button"
            onclick={() => (mode = 'create')}
            class="px-2.5 py-1 rounded-md transition-colors cursor-pointer {mode === 'create' ? 'bg-amber-400 text-black font-bold shadow-xs' : 'text-white/60 hover:text-white'}"
          >
            Create New
          </button>
          <button
            type="button"
            onclick={() => (mode = 'refine')}
            disabled={!currentCode || !currentCode.trim()}
            class="px-2.5 py-1 rounded-md transition-colors cursor-pointer {mode === 'refine' ? 'bg-amber-400 text-black font-bold shadow-xs' : 'text-white/60 hover:text-white'} disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Refine Current
          </button>
        </div>

        <button
          onclick={handleClose}
          class="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
          aria-label="Close assistant"
        >
          <X size={15} />
        </button>
      </div>

      {#if isLoadingKeys}
        <div class="py-8 text-center text-xs text-white/50 flex items-center justify-center gap-2 font-['IBM_Plex_Mono',monospace]">
          <Loader2 class="w-3.5 h-3.5 animate-spin text-amber-400" /> Loading AI keys...
        </div>
      {:else if userKeys.length === 0}
        <div class="py-6 text-center space-y-3 rounded-xl bg-white/[0.02] border border-white/10 my-3">
          <div class="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
            <Settings size={16} />
          </div>
          <div>
            <h3 class="text-xs font-bold text-white">No AI API Key Found</h3>
            <p class="text-[11px] text-white/50 max-w-xs mx-auto mt-0.5">
              Add your OpenAI, Anthropic, or Gemini key in Settings to generate diagrams.
            </p>
          </div>
          <button
            onclick={() => {
              handleClose();
              onOpenSettings();
            }}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-black text-xs font-bold rounded-lg hover:bg-amber-300 transition-colors cursor-pointer"
          >
            <Settings size={12} /> Configure API Keys
          </button>
        </div>
      {:else}
        <!-- Body -->
        <div class="space-y-3 pt-3 flex-1">
          <!-- Compact Provider Selector Row -->
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 w-full">
              <span class="text-white/50 text-[11px] shrink-0">Model Key:</span>
              <div class="flex-1">
                <CustomSelect
                  id="ai-provider-select-box"
                  options={providerOptions}
                  bind:value={selectedProvider}
                />
              </div>
              <button
                onclick={() => {
                  handleClose();
                  onOpenSettings();
                }}
                class="text-[11px] text-amber-400 hover:text-amber-300 font-['IBM_Plex_Mono',monospace] transition-colors cursor-pointer shrink-0 ml-1"
                title="Manage API Keys"
              >
                Vault ⚙️
              </button>
            </div>
          </div>

          <!-- Prompt Textarea -->
          <div class="space-y-1.5">
            <textarea
              id="ai-prompt-input"
              bind:value={promptText}
              placeholder={mode === 'create' ? 'e.g. Create a sequence diagram showing user login, JWT issue, and DB lookup...' : 'e.g. Add an error handling branch and highlight failed states in red...'}
              rows={3}
              class="w-full px-3 py-2 text-xs rounded-xl border border-white/12 bg-[#06070A] text-white placeholder-white/25 focus:outline-none focus:border-amber-400 font-['IBM_Plex_Mono',monospace] transition-colors resize-none leading-relaxed"
            ></textarea>

            <!-- Starter Chips -->
            <div class="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
              {#each mode === 'create' ? createPromptTemplates : refinePromptTemplates as tmpl}
                <button
                  type="button"
                  onclick={() => (promptText = tmpl.text)}
                  class="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-amber-400/15 hover:text-amber-300 border border-white/10 hover:border-amber-400/30 text-[10px] text-white/60 transition-colors cursor-pointer shrink-0"
                >
                  {tmpl.label}
                </button>
              {/each}
            </div>
          </div>

          <!-- Error Alert -->
          {#if errorMessage}
            <div class="p-2.5 text-[11px] rounded-lg bg-red-500/10 text-red-300 border border-red-500/25 font-['IBM_Plex_Mono',monospace]">
              {errorMessage}
            </div>
          {/if}

          <!-- Live Code Stream Preview -->
          {#if streamedText || isGenerating || sanitizedCode}
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] text-white/60">
                <span>Mermaid Preview</span>
                {#if isGenerating}
                  <span class="text-amber-400 font-['IBM_Plex_Mono',monospace] flex items-center gap-1">
                    <Loader2 size={11} class="animate-spin" /> Generating...
                  </span>
                {:else}
                  <span class="text-emerald-400 font-['IBM_Plex_Mono',monospace] flex items-center gap-1">
                    <Check size={11} /> Ready
                  </span>
                {/if}
              </div>
              <pre class="p-2.5 rounded-xl bg-black/60 border border-white/10 font-['IBM_Plex_Mono',monospace] text-[11px] overflow-x-auto max-h-32 whitespace-pre-wrap text-emerald-300 leading-normal">{sanitizedCode || streamedText}</pre>
            </div>
          {/if}
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between pt-3 mt-2 border-t border-white/10 shrink-0">
          <div>
            {#if sanitizedCode || streamedText}
              <button
                type="button"
                onclick={() => {
                  streamedText = '';
                  sanitizedCode = '';
                  errorMessage = '';
                }}
                class="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer font-['IBM_Plex_Mono',monospace]"
              >
                <RefreshCw size={11} /> Reset
              </button>
            {:else}
              <button
                type="button"
                onclick={() => {
                  handleClose();
                  onOpenSettings();
                }}
                class="text-[11px] text-white/40 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Settings size={11} /> API Keys
              </button>
            {/if}
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={handleClose}
              class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 hover:bg-white/10 text-white/70 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {#if sanitizedCode || streamedText}
              <button
                type="button"
                onclick={handleApply}
                disabled={isApplying || isGenerating}
                class="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {#if isApplying}
                  <Loader2 size={12} class="animate-spin" />
                {:else}
                  <Check size={12} strokeWidth={2.5} />
                {/if}
                <span>{mode === 'create' ? 'Create Diagram' : 'Apply Changes'}</span>
              </button>
            {:else}
              <button
                type="button"
                onclick={handleGenerate}
                disabled={isGenerating || !promptText.trim()}
                class="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                {#if isGenerating}
                  <Loader2 size={12} class="animate-spin text-black" />
                  <span>Generating...</span>
                {:else}
                  <Play size={11} class="fill-black" />
                  <span>Generate</span>
                {/if}
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
