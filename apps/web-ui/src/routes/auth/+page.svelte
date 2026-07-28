<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { goto } from '$app/navigation';
  import {
    Code2,
    Mail,
    Lock,
    ArrowRight,
    Sparkles,
    KeyRound,
    CheckCircle2,
    ShieldAlert,
    UserPlus,
    LogIn,
  } from 'lucide-svelte';

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
        message = { type: 'success', text: 'Magic link sent! Please check your email inbox to verify.' };
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        message = { type: 'success', text: 'Account created! Please check your email to confirm registration.' };
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await goto('/workspace');
      }
    } catch (err: any) {
      message = { type: 'error', text: err.message || 'Authentication failed. Please try again.' };
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative flex items-center justify-center min-h-screen p-4 bg-[#090A0F] font-['Instrument_Sans',sans-serif] select-none overflow-hidden">
  <!-- Glowing Background Orbs -->
  <div class="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px] pointer-events-none"></div>
  <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none"></div>

  <!-- Auth Card -->
  <div class="w-full max-w-md p-8 rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl space-y-6 text-white backdrop-blur-xl relative z-10">
    <!-- Header & Brand Logo -->
    <div class="text-center space-y-3">
      <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 p-2 flex items-center justify-center shadow-lg">
        <img src="/assets/logo-short-dark.png" alt="TxtGrph Logo" class="w-full h-full object-contain" />
      </div>
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-white">
          {authMode === 'magic-link' ? 'Sign In with Magic Link' : isSignUp ? 'Create TxtGrph Account' : 'Welcome Back'}
        </h2>
        <p class="text-xs text-white/50 mt-1 font-medium">
          {authMode === 'magic-link'
            ? 'Enter your email to receive a passwordless authentication link'
            : isSignUp
              ? 'Join TxtGrph to create, share, & collaborate on Mermaid diagrams'
              : 'Sign in to access your saved diagrams, workspaces, & vaults'}
        </p>
      </div>
    </div>

    <!-- Auth Method Switcher Tabs -->
    <div class="p-1 bg-white/5 border border-white/10 rounded-xl grid grid-cols-2 gap-1 text-xs font-semibold">
      <button
        type="button"
        onclick={() => {
          authMode = 'password';
          message = null;
        }}
        class="py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer {authMode === 'password' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}"
      >
        <KeyRound size={14} />
        <span>Password</span>
      </button>
      <button
        type="button"
        onclick={() => {
          authMode = 'magic-link';
          message = null;
        }}
        class="py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer {authMode === 'magic-link' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}"
      >
        <Sparkles size={14} />
        <span>Magic Link</span>
      </button>
    </div>

    <!-- Alert Status Messages -->
    {#if message}
      <div class="p-3.5 text-xs rounded-xl flex items-start gap-2.5 border transition-all animate-in fade-in duration-200 {message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}">
        {#if message.type === 'error'}
          <ShieldAlert size={16} class="shrink-0 text-red-400 mt-0.5" />
        {:else}
          <CheckCircle2 size={16} class="shrink-0 text-emerald-400 mt-0.5" />
        {/if}
        <span class="leading-relaxed">{message.text}</span>
      </div>
    {/if}

    <!-- Form Controls -->
    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Email Field -->
      <div class="space-y-1.5 text-left">
        <label for="email-input" class="block text-xs font-semibold text-white/80">
          Email address
        </label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-3 h-4 w-4 text-white/30" />
          <input
            id="email-input"
            type="email"
            bind:value={email}
            required
            placeholder="developer@example.com"
            class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] pl-10 pr-4 py-2.5 text-xs font-['IBM_Plex_Mono',monospace] text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      <!-- Password Field (if password mode) -->
      {#if authMode === 'password'}
        <div class="space-y-1.5 text-left animate-in fade-in duration-150">
          <label for="password-input" class="block text-xs font-semibold text-white/80">
            Password
          </label>
          <div class="relative">
            <Lock class="absolute left-3.5 top-3 h-4 w-4 text-white/30" />
            <input
              id="password-input"
              type="password"
              bind:value={password}
              required={authMode === 'password'}
              placeholder="••••••••••••"
              class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] pl-10 pr-4 py-2.5 text-xs font-['IBM_Plex_Mono',monospace] text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
        </div>
      {/if}

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={loading}
        class="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer btn-premium mt-2"
      >
        {#if loading}
          <div class="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
          <span>Processing...</span>
        {:else if authMode === 'magic-link'}
          <Sparkles size={15} />
          <span>Send Magic Link</span>
        {:else if isSignUp}
          <UserPlus size={15} />
          <span>Create Account</span>
        {:else}
          <LogIn size={15} />
          <span>Sign In to Workspace</span>
        {/if}
      </button>
    </form>

    <!-- Sign In / Sign Up Mode Toggle (For Password Mode) -->
    {#if authMode === 'password'}
      <div class="pt-4 border-t border-white/10 text-center">
        <button
          type="button"
          onclick={() => {
            isSignUp = !isSignUp;
            message = null;
          }}
          class="text-xs text-white/60 hover:text-white transition-colors font-medium cursor-pointer"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>
      </div>
    {/if}
  </div>
</div>
