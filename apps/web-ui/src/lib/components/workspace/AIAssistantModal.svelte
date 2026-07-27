<script lang="ts">
  import { onMount } from 'svelte';
  import { Sparkles, Loader2, Play, Check, X, Settings } from 'lucide-svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { decryptApiKey } from '$lib/crypto';
  import { AIRouter, type AIProvider } from '@txtgrph/ai-router';
  import type { UserKeyRecord } from '../../../routes/settings/+page.js';

  let {
    isOpen = $bindable(false),
    currentCode = '',
    onApply = (newCode: string) => {},
  } = $props();

  const supabase = createSupabaseBrowserClient();

  let userKeys = $state<UserKeyRecord[]>([]);
  let isLoadingKeys = $state(true);
  let selectedProvider = $state<AIProvider>('anthropic');
  let promptText = $state('');
  let mode = $state<'create' | 'refine'>('create');
  let isGenerating = $state(false);
  let streamedText = $state('');
  let sanitizedCode = $state('');
  let errorMessage = $state('');

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
          provider: selectedProvider,
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[var(--color-border-default)] pb-4">
        <div class="flex items-center gap-2 text-[var(--color-brass-text)]">
          <Sparkles class="w-5 h-5" />
          <h2 class="text-base font-semibold text-[var(--color-text-primary)]">BYOK AI Diagram Assistant</h2>
        </div>
        <button onclick={handleClose} class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      {#if isLoadingKeys}
        <div class="p-8 text-center text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" /> Loading your saved keys...
        </div>
      {:else if userKeys.length === 0}
        <div class="p-6 text-center space-y-4 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-default)]">
          <p class="text-sm text-[var(--color-text-secondary)]">No BYOK AI API keys found in your vault.</p>
          <a
            href="/settings"
            class="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-brass)] text-white text-xs font-medium rounded hover:opacity-90 transition-opacity"
          >
            <Settings class="w-4 h-4" /> Add API Key in Settings
          </a>
        </div>
      {:else}
        <!-- Form Controls -->
        <div class="space-y-4 flex-1 overflow-y-auto">
          <!-- Provider Selector -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="ai-provider-select" class="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">AI Provider</label>
              <select
                id="ai-provider-select"
                bind:value={selectedProvider}
                class="w-full px-3 py-2 text-xs rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
              >
                {#each userKeys as key}
                  <option value={key.provider}>
                    {key.provider.toUpperCase()} ({key.key_hint})
                  </option>
                {/each}
              </select>
            </div>

            <div>
              <label for="ai-action-mode-select" class="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Action Mode</label>
              <select
                id="ai-action-mode-select"
                bind:value={mode}
                class="w-full px-3 py-2 text-xs rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
              >
                <option value="create">Create New Diagram</option>
                <option value="refine" disabled={!currentCode}>Refine Current Diagram</option>
              </select>
            </div>
          </div>

          <!-- Prompt Input -->
          <div>
            <label for="ai-prompt-input" class="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Instructions / Diagram Prompt
            </label>
            <textarea
              id="ai-prompt-input"
              bind:value={promptText}
              placeholder={mode === 'create' ? 'e.g. Create a sequence diagram showing user login, JWT issue, and DB lookup' : 'e.g. Add an error handling node and style it red'}
              rows={3}
              class="w-full px-3 py-2 text-xs rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
            ></textarea>
          </div>

          {#if errorMessage}
            <div class="p-3 text-xs rounded bg-[var(--color-error-bg)] text-[var(--color-error-text)] font-mono">
              {errorMessage}
            </div>
          {/if}

          <!-- Live Output Preview -->
          {#if streamedText || isGenerating}
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
                <span>Generated Output:</span>
                {#if isGenerating}
                  <span class="flex items-center gap-1 text-[var(--color-brass-text)]">
                    <Loader2 class="w-3 h-3 animate-spin" /> Streaming...
                  </span>
                {/if}
              </div>
              <pre class="p-3 rounded bg-[var(--color-surface-subtle)] border border-[var(--color-border-default)] font-mono text-xs overflow-x-auto max-h-48 whitespace-pre-wrap text-[var(--color-text-primary)]">
{sanitizedCode || streamedText}
              </pre>
            </div>
          {/if}
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-[var(--color-border-default)]">
          <a href="/settings" class="text-xs text-[var(--color-text-muted)] hover:underline flex items-center gap-1">
            <Settings class="w-3.5 h-3.5" /> Manage Keys
          </a>

          <div class="flex items-center gap-2">
            <button
              onclick={handleClose}
              class="px-3 py-1.5 text-xs rounded border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)] transition-colors"
            >
              Cancel
            </button>

            {#if sanitizedCode || streamedText}
              <button
                onclick={handleApply}
                class="px-4 py-1.5 text-xs rounded bg-[var(--color-success)] text-white font-medium hover:opacity-90 flex items-center gap-1.5 transition-opacity"
              >
                <Check class="w-3.5 h-3.5" /> Apply to Editor
              </button>
            {:else}
              <button
                onclick={handleGenerate}
                disabled={isGenerating || !promptText.trim()}
                class="px-4 py-1.5 text-xs rounded bg-[var(--color-brass)] text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-opacity"
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
