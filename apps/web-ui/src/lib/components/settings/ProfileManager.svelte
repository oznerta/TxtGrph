<script lang="ts">
  import { onMount } from 'svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { User, Check, AlertCircle, Sparkles, Shield, Camera } from 'lucide-svelte';

  import { profileStore } from '$lib/stores/profileStore.svelte';

  interface Props {
    userId: string;
    userEmail: string;
  }

  let { userId, userEmail }: Props = $props();
  const supabase = createSupabaseBrowserClient();

  let fullName = $state(profileStore.fullName || '');
  let avatarUrl = $state(profileStore.avatarUrl || '');
  let headline = $state(profileStore.headline || 'Diagram Architect');
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let errorMessage = $state<string | null>(null);

  const userInitials = $derived.by(() => {
    if (fullName.trim()) {
      const parts = fullName.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return fullName.slice(0, 2).toUpperCase();
    }
    return userEmail.slice(0, 2).toUpperCase();
  });

  onMount(() => {
    loadProfile();
  });

  async function loadProfile() {
    profileStore.loadFromLocal();
    if (profileStore.fullName) fullName = profileStore.fullName;
    if (profileStore.headline) headline = profileStore.headline;
    if (profileStore.avatarUrl) avatarUrl = profileStore.avatarUrl;

    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, headline')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        fullName = data.full_name || fullName;
        avatarUrl = data.avatar_url || avatarUrl;
        headline = data.headline || headline;
        profileStore.updateProfile({ fullName, headline, avatarUrl });
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }

  async function handleSaveProfile() {
    profileStore.updateProfile({
      fullName: fullName.trim(),
      headline: headline.trim(),
      avatarUrl: avatarUrl.trim()
    });

    if (!userId) {
      saveSuccess = true;
      setTimeout(() => (saveSuccess = false), 2500);
      return;
    }
    isSaving = true;
    errorMessage = null;

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null,
        headline: headline.trim(),
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      saveSuccess = true;
      setTimeout(() => (saveSuccess = false), 2500);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      errorMessage = err?.message || 'Failed to update profile settings';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="rounded-2xl border border-white/10 bg-[#0F1117] p-6 shadow-2xl space-y-5 text-white font-['Instrument_Sans',sans-serif]">
  <!-- Card Header -->
  <div class="flex items-center justify-between border-b border-white/10 pb-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
        <User class="h-5 w-5" />
      </div>
      <div>
        <h2 class="text-base font-bold text-white tracking-tight">
          User Profile & Identity
        </h2>
        <p class="text-xs text-white/50">
          Customize how your identity appears to team members across real-time diagram sessions
        </p>
      </div>
    </div>
  </div>

  {#if errorMessage}
    <div class="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-300 border border-red-500/30">
      <AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
      <span>{errorMessage}</span>
    </div>
  {/if}

  <!-- Profile Form Grid -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
    <!-- Avatar Preview -->
    <div class="flex flex-col items-center justify-center p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-center space-y-3">
      <div class="relative">
        {#if avatarUrl.trim()}
          <img
            src={avatarUrl}
            alt={fullName || 'Avatar'}
            class="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/40 shadow-xl"
          />
        {:else}
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-2xl flex items-center justify-center border-2 border-amber-400/40 shadow-xl font-['IBM_Plex_Mono',monospace]">
            {userInitials}
          </div>
        {/if}
        <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0F1117] flex items-center justify-center" title="Active Account">
          <Sparkles class="h-3 w-3 text-black" />
        </div>
      </div>

      <div>
        <div class="text-sm font-bold text-white truncate max-w-[180px]">
          {fullName || 'Anonymous Architect'}
        </div>
        <div class="text-xs text-amber-400/80 font-medium font-['IBM_Plex_Mono',monospace] mt-0.5">
          {headline}
        </div>
        <div class="text-[11px] text-white/40 truncate max-w-[180px] mt-1">
          {userEmail}
        </div>
      </div>
    </div>

    <!-- Inputs -->
    <div class="md:col-span-2 space-y-4">
      <div>
        <label for="profile-name-input" class="block text-xs font-semibold text-white/70 mb-1.5">
          Full Display Name
        </label>
        <input
          id="profile-name-input"
          type="text"
          bind:value={fullName}
          placeholder="e.g. Sarah Jenkins"
          class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors"
        />
      </div>

      <div>
        <label for="profile-headline-input" class="block text-xs font-semibold text-white/70 mb-1.5">
          Headline / Role Title
        </label>
        <input
          id="profile-headline-input"
          type="text"
          bind:value={headline}
          placeholder="e.g. Lead Systems Architect"
          class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors"
        />
      </div>

      <div>
        <label for="profile-avatar-input" class="block text-xs font-semibold text-white/70 mb-1.5">
          Avatar Image URL (Optional)
        </label>
        <input
          id="profile-avatar-input"
          type="url"
          bind:value={avatarUrl}
          placeholder="https://example.com/avatar.jpg"
          class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors font-['IBM_Plex_Mono',monospace]"
        />
      </div>

      <div class="flex items-center justify-between pt-2">
        {#if saveSuccess}
          <div class="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-['IBM_Plex_Mono',monospace]">
            <Check class="h-4 w-4 text-emerald-400" />
            <span>Profile saved successfully!</span>
          </div>
        {:else}
          <div></div>
        {/if}

        <button
          type="button"
          onclick={handleSaveProfile}
          disabled={isSaving}
          class="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-md cursor-pointer"
        >
          <span>{isSaving ? 'Saving Profile...' : 'Save Profile'}</span>
        </button>
      </div>
    </div>
  </div>
</div>
