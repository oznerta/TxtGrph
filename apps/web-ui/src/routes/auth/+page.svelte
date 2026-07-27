<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let authMode = $state<'password' | 'magic-link'>('password');
  let isSignUp = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let loading = $state(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    message = null;

    try {
      if (authMode === 'magic-link') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        message = { type: 'success', text: 'Magic link sent! Check your email inbox.' };
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        message = { type: 'success', text: 'Account created! Check your email to confirm registration.' };
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await goto('/workspace');
      }
    } catch (err: any) {
      message = { type: 'error', text: err.message || 'Authentication failed' };
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex items-center justify-center min-h-screen p-4 bg-[--color-surface-app]">
  <div class="w-full max-w-md p-6 sm:p-8 rounded-[8px] bg-[--color-surface-card] border border-[--color-border-default] shadow-sm space-y-6">
    <div class="text-center space-y-2">
      <h2 class="font-['Instrument_Sans',sans-serif] text-[22px] font-semibold text-[--color-text-primary]">
        {isSignUp ? 'Create Account' : 'Welcome Back'}
      </h2>
      <p class="text-[13px] text-[--color-text-secondary]">
        Sign in to manage and edit your Mermaid diagrams
      </p>
    </div>

    {#if message}
      <div class="p-3 text-[13px] rounded-[5px] {message.type === 'error' ? 'bg-[#F7EBEA] text-[#601A25] dark:bg-[#2B1113] dark:text-[#D89AA0]' : 'bg-[#EDF3EC] text-[#245538] dark:bg-[#0E1F16] dark:text-[#8FBE9E]'}">
        {message.text}
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="space-y-1 text-left">
        <label for="email-input" class="block text-[13px] font-semibold text-[--color-text-primary]">
          Email address
        </label>
        <input
          id="email-input"
          type="email"
          bind:value={email}
          required
          placeholder="developer@example.com"
          class="w-full h-9 px-3 text-[14px] rounded-[5px] bg-[--color-surface-subtle] border border-[--color-border-strong] text-[--color-text-primary] placeholder:[--color-text-muted] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass] focus-visible:ring-offset-2"
        />
      </div>

      {#if authMode === 'password'}
        <div class="space-y-1 text-left">
          <label for="password-input" class="block text-[13px] font-semibold text-[--color-text-primary]">
            Password
          </label>
          <input
            id="password-input"
            type="password"
            bind:value={password}
            required={authMode === 'password'}
            placeholder="••••••••"
            class="w-full h-9 px-3 text-[14px] rounded-[5px] bg-[--color-surface-subtle] border border-[--color-border-strong] text-[--color-text-primary] placeholder:[--color-text-muted] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass] focus-visible:ring-offset-2"
          />
        </div>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full h-10 text-[14px] font-medium rounded-[5px] bg-[--color-ink] text-[#FAF9F6] shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass] focus-visible:ring-offset-2"
      >
        {loading ? 'Processing...' : authMode === 'magic-link' ? 'Send Magic Link' : isSignUp ? 'Sign Up' : 'Sign In'}
      </button>
    </form>

    <div class="pt-4 border-t border-[--color-border-default] flex flex-col gap-2 text-[13px]">
      <button
        type="button"
        onclick={() => {
          authMode = authMode === 'password' ? 'magic-link' : 'password';
          message = null;
        }}
        class="text-[--color-brass-text] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass]"
      >
        {authMode === 'password' ? 'Use Magic Link instead' : 'Use Password instead'}
      </button>

      {#if authMode === 'password'}
        <button
          type="button"
          onclick={() => {
            isSignUp = !isSignUp;
            message = null;
          }}
          class="text-[--color-text-secondary] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brass]"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      {/if}
    </div>
  </div>
</div>
