<script lang="ts">
  import { onMount } from 'svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { encryptApiKey, generateKeyHint, decryptApiKey } from '$lib/crypto';
  import { AIRouter, type AIProvider } from '@txtgrph/ai-router';
  import { KeyRound, CheckCircle2, AlertCircle, Plus, Trash2, Zap, Lock, ShieldCheck } from 'lucide-svelte';

  interface UserKeyRecord {
    id: string;
    user_id: string;
    provider: AIProvider;
    encrypted_key: string;
    key_hint: string;
    base_url: string | null;
    model: string | null;
    created_at: string;
    updated_at: string;
  }

  const supabase = createSupabaseBrowserClient();

  let userKeys = $state<UserKeyRecord[]>([]);
  let isLoading = $state(true);

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
      description: 'Custom base URL & model (Ollama, Together AI, vLLM).',
      defaultModel: 'deepseek-ai/DeepSeek-V3',
      defaultBaseUrl: 'https://api.together.xyz/v1',
    },
  };

  onMount(async () => {
    await fetchKeys();
  });

  async function fetchKeys() {
    isLoading = true;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase
        .from('user_keys')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        userKeys = data as UserKeyRecord[];
      }
    } catch (err) {
      console.error('Error fetching BYOK keys:', err);
    } finally {
      isLoading = false;
    }
  }

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
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || !activeModalProvider) return;
    if (!modalApiKey.trim()) {
      modalError = 'API key is required';
      return;
    }

    try {
      isSubmitting = true;
      modalError = '';
      modalSuccess = '';

      const encryptedKey = await encryptApiKey(modalApiKey.trim(), sessionData.session.user.id);
      const hint = generateKeyHint(modalApiKey.trim());

      const payload = {
        user_id: sessionData.session.user.id,
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

      userKeys = userKeys.filter((k) => k.provider !== activeModalProvider);
      userKeys.push(upserted as UserKeyRecord);

      modalSuccess = 'Key encrypted and saved!';
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
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    if (!confirm(`Are you sure you want to remove your ${PROVIDER_METADATA[provider].name} key?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_keys')
        .delete()
        .eq('user_id', sessionData.session.user.id)
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
    const { data: sessionData } = await supabase.auth.getSession();
    if (!existing || !sessionData.session) return;

    try {
      isTesting = true;
      const rawKey = await decryptApiKey(existing.encrypted_key, sessionData.session.user.id);

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

<div class="space-y-6 font-['Instrument_Sans',sans-serif] w-full">
  <!-- Zero-Trust Encryption Banner -->
  <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 text-xs text-white/80 space-y-2">
    <div class="font-bold flex items-center gap-2.5 text-amber-400 text-sm">
      <Lock size={18} /> Zero-Trust BYOK Envelope Encryption
    </div>
    <p class="text-xs leading-relaxed text-white/60">
      Your API keys are encrypted client-side using WebCrypto AES-GCM (256-bit) before entering your vault. TxtGrph servers never store or view unencrypted keys.
    </p>
  </div>

  {#if isLoading}
    <div class="py-8 text-center text-xs text-amber-400/80 font-['IBM_Plex_Mono',monospace] animate-pulse">
      Loading saved BYOK keys...
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4">
      {#each PROVIDERS as provider}
        {@const meta = PROVIDER_METADATA[provider]}
        {@const keyRecord = userKeys.find((k) => k.provider === provider)}
        {@const testRes = testStatus[provider]}

        <div class="p-6 rounded-3xl border border-white/10 bg-[#0F111A] flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:border-white/20 transition-all">
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-center gap-3">
              <h4 class="font-bold text-sm text-white">{meta.name}</h4>
              {#if keyRecord}
                <span class="text-[11px] px-3 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-['IBM_Plex_Mono',monospace]">
                  {keyRecord.key_hint}
                </span>
              {:else}
                <span class="text-[11px] px-3 py-0.5 rounded-full font-medium bg-white/10 text-white/50 border border-white/10 font-['IBM_Plex_Mono',monospace]">
                  Not Configured
                </span>
              {/if}
            </div>
            <p class="text-xs text-white/50 leading-relaxed">{meta.description}</p>

            {#if testRes}
              <div class="mt-3 text-xs p-3 rounded-2xl font-['IBM_Plex_Mono',monospace] {testRes.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-red-950/40 text-red-300 border border-red-800/40'}">
                {testRes.message}
              </div>
            {/if}
          </div>

          <div class="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            {#if keyRecord}
              <button
                onclick={() => handleTestKey(provider)}
                disabled={isTesting}
                class="px-4 py-2 text-xs font-bold rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Test
              </button>
              <button
                onclick={() => openModal(provider)}
                class="px-4 py-2 text-xs font-bold rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onclick={() => handleDeleteKey(provider)}
                class="p-2 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                title="Remove Key"
              >
                <Trash2 size={14} />
              </button>
            {:else}
              <button
                onclick={() => openModal(provider)}
                class="px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} class="stroke-[3]" /> Add Key
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal Dialog for Key Editing -->
{#if activeModalProvider}
  {@const meta = PROVIDER_METADATA[activeModalProvider]}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-['Instrument_Sans',sans-serif]">
    <div class="bg-[#0F1117] border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 class="text-sm font-bold text-white">
          Configure {meta.name} API Key
        </h3>
        <button onclick={closeModal} class="text-white/50 hover:text-white cursor-pointer">
          ✕
        </button>
      </div>

      {#if modalError}
        <div class="p-3 text-xs rounded-xl bg-red-950/50 border border-red-800 text-red-200 font-['IBM_Plex_Mono',monospace]">
          {modalError}
        </div>
      {/if}

      {#if modalSuccess}
        <div class="p-3 text-xs rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 font-['IBM_Plex_Mono',monospace]">
          {modalSuccess}
        </div>
      {/if}

      <div class="space-y-3.5 text-xs">
        <div>
          <label for="byok-api-key-input" class="block font-semibold mb-1 text-white/80">
            API Key (Secret)
          </label>
          <input
            id="byok-api-key-input"
            type="password"
            bind:value={modalApiKey}
            placeholder="Paste your secret API key here"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/15 bg-[#0A0B0E] text-white font-['IBM_Plex_Mono',monospace] focus:outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label for="byok-model-input" class="block font-semibold mb-1 text-white/80">
            Model Name (Optional)
          </label>
          <input
            id="byok-model-input"
            type="text"
            bind:value={modalModel}
            placeholder={meta.defaultModel}
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/15 bg-[#0A0B0E] text-white font-['IBM_Plex_Mono',monospace] focus:outline-none focus:border-white/30"
          />
        </div>

        {#if activeModalProvider === 'custom' || activeModalProvider === 'openai' || activeModalProvider === 'anthropic'}
          <div>
            <label for="byok-base-url-input" class="block font-semibold mb-1 text-white/80">
              Base URL (Optional override)
            </label>
            <input
              id="byok-base-url-input"
              type="text"
              bind:value={modalBaseUrl}
              placeholder={meta.defaultBaseUrl || 'https://api.openai.com/v1'}
              class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/15 bg-[#0A0B0E] text-white font-['IBM_Plex_Mono',monospace] focus:outline-none focus:border-white/30"
            />
          </div>
        {/if}
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
        <button
          onclick={closeModal}
          class="px-4 py-2 text-xs font-semibold rounded-xl border border-white/15 hover:bg-white/10 text-white/70"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveKey}
          disabled={isSubmitting}
          class="px-4 py-2 text-xs rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-colors shadow-md disabled:opacity-50"
        >
          {isSubmitting ? 'Encrypting & Saving...' : 'Save API Key'}
        </button>
      </div>
    </div>
  </div>
{/if}
