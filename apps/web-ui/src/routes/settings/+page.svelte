<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { encryptApiKey, generateKeyHint } from '$lib/crypto';
  import { AIRouter, type AIProvider } from '@txtgrph/ai-router';
  import type { UserKeyRecord } from './+page.js';

  let { data } = $props();

  const supabase = createSupabaseBrowserClient();

  let session = $derived(data.session);
  let userKeys = $state<UserKeyRecord[]>([]);

  $effect(() => {
    userKeys = data.userKeys || [];
  });
  const PROVIDERS: AIProvider[] = ['anthropic', 'openai', 'gemini', 'custom'];

  let activeModalProvider = $state<AIProvider | null>(null);
  let modalApiKey = $state('');
  let modalBaseUrl = $state('');
  let modalModel = $state('');
  let modalError = $state('');
  let modalSuccess = $state('');
  let isSubmitting = $state(false);
  let isTesting = $state(false);
  let testStatus = $state<{ [key in AIProvider]?: { success: boolean; message: string } }>({});

  const PROVIDER_METADATA: Record<
    AIProvider,
    { name: string; description: string; defaultModel: string; defaultBaseUrl?: string }
  > = {
    anthropic: {
      name: 'Anthropic Claude',
      description: 'Claude 3.5 Sonnet & Claude 3.7 Sonnet API keys.',
      defaultModel: 'claude-3-5-sonnet-latest',
    },
    openai: {
      name: 'OpenAI',
      description: 'GPT-4o & GPT-4o-mini API keys.',
      defaultModel: 'gpt-4o',
    },
    gemini: {
      name: 'Google Gemini',
      description: 'Gemini 2.5 Flash & Gemini 2.5 Pro API keys.',
      defaultModel: 'gemini-2.5-flash',
    },
    custom: {
      name: 'Custom OpenAI-Compatible',
      description: 'Custom base URL & model name (Ollama, Together AI, vLLM).',
      defaultModel: 'deepseek-ai/DeepSeek-V3',
      defaultBaseUrl: 'https://api.together.xyz/v1',
    },
  };

  function openModal(provider: AIProvider) {
    const existing = userKeys.find((k) => k.provider === provider);
    activeModalProvider = provider;
    modalApiKey = '';
    modalBaseUrl = existing?.base_url || PROVIDER_METADATA[provider].defaultBaseUrl || '';
    modalModel = existing?.model || PROVIDER_METADATA[provider].defaultModel || '';
    modalError = '';
    modalSuccess = '';
  }

  function closeModal() {
    activeModalProvider = null;
  }

  async function handleSaveKey() {
    if (!session || !activeModalProvider) return;
    if (!modalApiKey.trim()) {
      modalError = 'API key is required';
      return;
    }

    try {
      isSubmitting = true;
      modalError = '';
      modalSuccess = '';

      const encryptedKey = await encryptApiKey(modalApiKey.trim(), session.user.id);
      const hint = generateKeyHint(modalApiKey.trim());

      const payload = {
        user_id: session.user.id,
        provider: activeModalProvider,
        encrypted_key: encryptedKey,
        key_hint: hint,
        base_url: modalBaseUrl.trim() || null,
        model: modalModel.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data: upserted, error } = await supabase
        .from('user_keys')
        .upsert(payload, { onConflict: 'user_id,provider' })
        .select('*')
        .single();

      if (error) throw error;

      // Update local state
      userKeys = userKeys.filter((k) => k.provider !== activeModalProvider);
      userKeys.push(upserted as UserKeyRecord);

      modalSuccess = 'Key saved securely!';
      setTimeout(() => {
        closeModal();
      }, 800);
    } catch (err: any) {
      modalError = err.message || 'Failed to save API key';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteKey(provider: AIProvider) {
    if (!session) return;
    if (!confirm(`Are you sure you want to remove your ${PROVIDER_METADATA[provider].name} key?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_keys')
        .delete()
        .eq('user_id', session.user.id)
        .eq('provider', provider);

      if (error) throw error;

      userKeys = userKeys.filter((k) => k.provider !== provider);
      delete testStatus[provider];
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  }

  async function handleTestKey(provider: AIProvider) {
    const existing = userKeys.find((k) => k.provider === provider);
    if (!existing) return;

    try {
      isTesting = true;
      // Test key requires decrypting client side key
      const { decryptApiKey } = await import('$lib/crypto');
      const rawKey = await decryptApiKey(existing.encrypted_key, session!.user.id);

      const res = await AIRouter.testConnection({
        provider,
        apiKey: rawKey,
        baseUrl: existing.base_url || undefined,
        model: existing.model || undefined,
      });

      testStatus[provider] = res;
    } catch (err: any) {
      testStatus[provider] = { success: false, message: err.message || 'Test failed' };
    } finally {
      isTesting = false;
    }
  }
</script>

<svelte:head>
  <title>Settings — TxtGrph</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
  <!-- Header Navbar -->
  <header class="h-14 border-b border-[var(--color-border-default)] px-6 flex items-center justify-between bg-[var(--color-surface-card)]">
    <div class="flex items-center gap-4">
      <a href="/workspace" class="text-sm font-semibold hover:opacity-80 text-[var(--color-text-secondary)]">
        &larr; Back to Workspace
      </a>
      <span class="text-[var(--color-border-strong)]">|</span>
      <h1 class="text-base font-semibold text-[var(--color-text-primary)]">AI Settings & BYOK Keys</h1>
    </div>
    {#if session}
      <div class="text-xs text-[var(--color-text-muted)] font-mono">
        User: {session.user.email}
      </div>
    {/if}
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-4xl w-full mx-auto p-6 space-y-8">
    {#if !session}
      <div class="p-8 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-center space-y-4">
        <h2 class="text-lg font-semibold">Authentication Required</h2>
        <p class="text-sm text-[var(--color-text-secondary)]">Please sign in to configure your personal BYOK AI API keys.</p>
        <a href="/auth" class="inline-block px-4 py-2 bg-[var(--color-brass)] text-white rounded text-sm font-medium hover:opacity-90">
          Sign In
        </a>
      </div>
    {:else}
      <!-- Security Notice -->
      <div class="p-4 rounded-lg bg-[var(--color-info-bg)] text-[var(--color-info-text)] text-sm space-y-1">
        <div class="font-semibold flex items-center gap-2">
          <span>🔒 Zero-Trust BYOK Envelope Encryption</span>
        </div>
        <p>
          Your API keys are encrypted client-side using WebCrypto (AES-256-GCM) before being stored in your personal vault. TxtGrph servers never view, log, or proxy your unencrypted keys.
        </p>
      </div>

      <!-- Provider Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each PROVIDERS as provider}
          {@const meta = PROVIDER_METADATA[provider]}
          {@const keyRecord = userKeys.find((k) => k.provider === provider)}
          {@const testRes = testStatus[provider]}

          <div class="p-5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-base text-[var(--color-text-primary)]">{meta.name}</h3>
                {#if keyRecord}
                  <span class="text-xs px-2 py-0.5 rounded font-medium bg-[var(--color-success-bg)] text-[var(--color-success-text)]">
                    Configured ({keyRecord.key_hint})
                  </span>
                {:else}
                  <span class="text-xs px-2 py-0.5 rounded font-medium bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
                    Not Configured
                  </span>
                {/if}
              </div>
              <p class="text-xs text-[var(--color-text-secondary)] mt-1">{meta.description}</p>

              {#if keyRecord}
                <div class="mt-3 text-xs space-y-1 text-[var(--color-text-muted)] font-mono bg-[var(--color-surface-subtle)] p-2 rounded">
                  <div>Model: {keyRecord.model || meta.defaultModel}</div>
                  {#if keyRecord.base_url}
                    <div class="truncate">Base URL: {keyRecord.base_url}</div>
                  {/if}
                </div>
              {/if}

              {#if testRes}
                <div class="mt-2 text-xs p-2 rounded font-mono {testRes.success ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error-text)]'}">
                  {testRes.message}
                </div>
              {/if}
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-default)]">
              {#if keyRecord}
                <button
                  onclick={() => handleTestKey(provider)}
                  disabled={isTesting}
                  class="px-3 py-1.5 text-xs rounded border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)]"
                >
                  Test Connection
                </button>
                <button
                  onclick={() => openModal(provider)}
                  class="px-3 py-1.5 text-xs rounded border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)]"
                >
                  Edit Key
                </button>
                <button
                  onclick={() => handleDeleteKey(provider)}
                  class="px-3 py-1.5 text-xs rounded text-[var(--color-error-text)] hover:bg-[var(--color-error-bg)]"
                >
                  Delete
                </button>
              {:else}
                <button
                  onclick={() => openModal(provider)}
                  class="px-3 py-1.5 text-xs rounded bg-[var(--color-ink)] text-white font-medium hover:opacity-90"
                >
                  Add API Key
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<!-- Modal Dialog for Key Editing -->
{#if activeModalProvider}
  {@const meta = PROVIDER_METADATA[activeModalProvider]}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-[var(--color-text-primary)]">
          Configure {meta.name}
        </h3>
        <button onclick={closeModal} class="text-[var(--color-text-muted)] hover:text-black">
          ✕
        </button>
      </div>

      {#if modalError}
        <div class="p-3 text-xs rounded bg-[var(--color-error-bg)] text-[var(--color-error-text)]">
          {modalError}
        </div>
      {/if}

      {#if modalSuccess}
        <div class="p-3 text-xs rounded bg-[var(--color-success-bg)] text-[var(--color-success-text)]">
          {modalSuccess}
        </div>
      {/if}

      <div class="space-y-3 text-sm">
        <div>
          <label for="settings-api-key-input" class="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">
            API Key (Secret)
          </label>
          <input
            id="settings-api-key-input"
            type="password"
            bind:value={modalApiKey}
            placeholder="Paste your API key here"
            class="w-full px-3 py-2 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] font-mono"
          />
        </div>

        <div>
          <label for="settings-model-input" class="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">
            Model Name (Optional)
          </label>
          <input
            id="settings-model-input"
            type="text"
            bind:value={modalModel}
            placeholder={meta.defaultModel}
            class="w-full px-3 py-2 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] font-mono"
          />
        </div>

        {#if activeModalProvider === 'custom' || activeModalProvider === 'openai' || activeModalProvider === 'anthropic'}
          <div>
            <label for="settings-base-url-input" class="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">
              Base URL (Optional override)
            </label>
            <input
              id="settings-base-url-input"
              type="text"
              bind:value={modalBaseUrl}
              placeholder={meta.defaultBaseUrl || 'https://api.openai.com/v1'}
              class="w-full px-3 py-2 text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-surface-app)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)] font-mono"
            />
          </div>
        {/if}
      </div>

      <div class="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-default)]">
        <button
          onclick={closeModal}
          class="px-4 py-2 text-xs rounded border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)]"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveKey}
          disabled={isSubmitting}
          class="px-4 py-2 text-xs rounded bg-[var(--color-brass)] text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Encrypting & Saving...' : 'Save API Key'}
        </button>
      </div>
    </div>
  </div>
{/if}
