<script lang="ts">
  import { X, KeyRound, Palette, User, Sparkles, ShieldCheck, Lock, Sliders, Check, Loader2, Key, Eye, EyeOff, AlertCircle } from 'lucide-svelte';
  import TokenManager from '$lib/components/settings/TokenManager.svelte';
  import ByokKeyManager from '$lib/components/settings/ByokKeyManager.svelte';
  import ProfileManager from '$lib/components/settings/ProfileManager.svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';

  interface Props {
    open: boolean;
    userEmail: string;
    onclose: () => void;
  }

  let { open = false, userEmail = '', onclose }: Props = $props();

  const supabase = createSupabaseBrowserClient();
  let userId = $state('');

  $effect(() => {
    if (open) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          userId = data.session.user.id;
        }
      });
    }
  });

  let activeTab = $state<'byok' | 'tokens' | 'theme' | 'profile' | 'security' | 'preferences'>('byok');
  let selectedTheme = $state('dark');

  const themeOptions: SelectOption[] = [
    { value: 'dark', label: 'Dark Theme (Default)', description: 'Sleek dark high contrast mode' },
    { value: 'default', label: 'Light Theme', description: 'Clean light background mode' },
    { value: 'forest', label: 'Forest Green', description: 'Emerald and organic accents' },
    { value: 'neutral', label: 'Neutral Monochrome', description: 'Minimalist black and white' }
  ];

  const exportFormatOptions: SelectOption[] = [
    { value: 'PNG', label: 'PNG Image (.png)' },
    { value: 'SVG', label: 'Vector SVG (.svg)' },
    { value: 'PDF', label: 'PDF Document (.pdf)' }
  ];

  const exportBgOptions: SelectOption[] = [
    { value: 'dark-mesh', label: 'Dark Mesh' },
    { value: 'pitch-black', label: 'Pitch Black' },
    { value: 'transparent', label: 'Transparent' }
  ];

  // Profile Form State
  let displayName = $state('Developer');
  let isSavingProfile = $state(false);
  let profileSuccess = $state(false);

  // Security Form State
  let newPassword = $state('');
  let confirmPassword = $state('');
  let showPassword = $state(false);
  let isChangingPassword = $state(false);
  let passwordSuccess = $state(false);
  let passwordError = $state<string | null>(null);

  // Editor Preferences State
  let autoSaveEnabled = $state(true);
  let lineNumbersEnabled = $state(true);
  let wordWrapEnabled = $state(true);
  let defaultExportFormat = $state<'PNG' | 'SVG' | 'PDF'>('PNG');
  let defaultExportBg = $state<'dark-mesh' | 'pitch-black' | 'transparent'>('dark-mesh');

  async function handleSaveProfile() {
    isSavingProfile = true;
    try {
      await supabase.auth.updateUser({
        data: { full_name: displayName }
      });
      profileSuccess = true;
      setTimeout(() => (profileSuccess = false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      isSavingProfile = false;
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      passwordError = 'Passwords do not match';
      return;
    }
    if (newPassword.length < 6) {
      passwordError = 'Password must be at least 6 characters long';
      return;
    }

    isChangingPassword = true;
    passwordError = null;

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      passwordSuccess = true;
      newPassword = '';
      confirmPassword = '';
      setTimeout(() => (passwordSuccess = false), 3000);
    } catch (err: any) {
      passwordError = err?.message || 'Failed to update password';
    } finally {
      isChangingPassword = false;
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      class="w-full max-w-6xl h-[85vh] rounded-3xl bg-[#0C0E14] border border-white/15 shadow-2xl flex overflow-hidden text-white"
      onclick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <!-- Left Sidebar Tabs -->
      <div class="w-64 bg-[#08090D] border-r border-white/10 p-6 flex flex-col justify-between select-none shrink-0">
        <div class="space-y-6">
          <div class="flex items-center gap-3 px-1">
            <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sliders size={16} />
            </div>
            <h2 class="text-base font-bold text-white tracking-tight">Settings</h2>
          </div>

          <div class="space-y-1.5">
            <div class="text-[10.5px] font-bold text-white/40 uppercase tracking-wider px-2 mb-1.5 font-['IBM_Plex_Mono',monospace]">AI & Integrations</div>
            <button
              onclick={() => (activeTab = 'byok')}
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {activeTab === 'byok' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
            >
              <Sparkles size={15} />
              <span>BYOK AI Keys</span>
            </button>

            <button
              onclick={() => (activeTab = 'tokens')}
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {activeTab === 'tokens' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
            >
              <KeyRound size={15} />
              <span>Secure Tokens (MCP)</span>
            </button>
          </div>

          <div class="space-y-1.5">
            <div class="text-[10.5px] font-bold text-white/40 uppercase tracking-wider px-2 mb-1.5 font-['IBM_Plex_Mono',monospace]">Account & Security</div>
            <button
              onclick={() => (activeTab = 'profile')}
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {activeTab === 'profile' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
            >
              <User size={15} />
              <span>Profile</span>
            </button>

            <button
              onclick={() => (activeTab = 'security')}
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {activeTab === 'security' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
            >
              <ShieldCheck size={15} />
              <span>Security & Passwords</span>
            </button>
          </div>

          <div class="space-y-1.5">
            <div class="text-[10.5px] font-bold text-white/40 uppercase tracking-wider px-2 mb-1.5 font-['IBM_Plex_Mono',monospace]">Preferences</div>
            <button
              onclick={() => (activeTab = 'theme')}
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {activeTab === 'theme' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
            >
              <Palette size={15} />
              <span>Diagram Theme</span>
            </button>

            <button
              onclick={() => (activeTab = 'preferences')}
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {activeTab === 'preferences' ? 'bg-white text-black font-bold shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
            >
              <Sliders size={15} />
              <span>Editor & Export</span>
            </button>
          </div>
        </div>

        <div class="text-[11px] text-white/40 px-2 font-['IBM_Plex_Mono',monospace]">
          TxtGrph v1.0.0 (Production)
        </div>
      </div>

      <!-- Right Tab Content Panel -->
      <div class="flex-1 flex flex-col bg-[#0A0B10] relative min-w-0">
        <!-- Close Button Header -->
        <div class="px-8 py-5 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#08090D]">
          <div>
            <h3 class="text-base font-bold text-white tracking-tight">
              {activeTab === 'byok'
                ? 'BYOK AI Provider Keys'
                : activeTab === 'tokens'
                ? 'Secure API & MCP Access Tokens'
                : activeTab === 'profile'
                ? 'User Profile Settings'
                : activeTab === 'security'
                ? 'Account Security & Password'
                : activeTab === 'theme'
                ? 'Diagram Theme Engine'
                : 'Editor & Export Preferences'}
            </h3>
            <p class="text-xs text-white/50 mt-0.5">
              {activeTab === 'byok'
                ? 'Configure client-side encrypted personal API keys for BYOK streaming assistance'
                : activeTab === 'tokens'
                ? 'Manage access tokens and MCP server integration snippets for Cursor & Claude Desktop'
                : activeTab === 'profile'
                ? 'Manage your personal account profile, display name, and plan options'
                : activeTab === 'security'
                ? 'Update account credentials, security parameters, and active session status'
                : activeTab === 'theme'
                ? 'Customize live Mermaid preview themes and visual rendering engine'
                : 'Configure default editor behavior and canvas export defaults'}
            </p>
          </div>
          <button
            onclick={onclose}
            class="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <!-- Scrollable Tab Content Body -->
        <div class="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <!-- Tab 1: BYOK Keys -->
          {#if activeTab === 'byok'}
            <div class="w-full">
              <ByokKeyManager />
            </div>

          <!-- Tab 2: MCP Tokens -->
          {:else if activeTab === 'tokens'}
            <div class="w-full">
              <TokenManager />
            </div>

          <!-- Tab 3: Profile (Full Width ProfileManager) -->
          {:else if activeTab === 'profile'}
            <div class="w-full">
              <ProfileManager {userId} {userEmail} />
            </div>

          <!-- Tab 4: Security & Passwords (Full Width) -->
          {:else if activeTab === 'security'}
            <div class="w-full space-y-6">
              <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-5">
                <div class="flex items-center gap-3 text-amber-400">
                  <Lock size={20} />
                  <div>
                    <h4 class="text-sm font-bold text-white">Update Account Password</h4>
                    <p class="text-xs text-white/50">Ensure your password is at least 6 characters long</p>
                  </div>
                </div>

                {#if passwordError}
                  <div class="p-4 text-xs rounded-2xl bg-red-500/10 text-red-300 border border-red-500/30 flex items-center gap-2.5">
                    <AlertCircle size={16} class="shrink-0 text-red-400" />
                    <span>{passwordError}</span>
                  </div>
                {/if}

                {#if passwordSuccess}
                  <div class="p-4 text-xs rounded-2xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-2.5 font-['IBM_Plex_Mono',monospace]">
                    <Check size={16} class="shrink-0 text-emerald-400" />
                    <span>Password changed successfully!</span>
                  </div>
                {/if}

                <div class="space-y-4">
                  <div>
                    <label for="new-password-input" class="block text-xs font-bold text-white mb-1.5">New Password</label>
                    <div class="relative">
                      <input
                        id="new-password-input"
                        type={showPassword ? 'text' : 'password'}
                        bind:value={newPassword}
                        placeholder="••••••••••••"
                        class="w-full px-4 py-3 text-xs rounded-2xl border border-white/15 bg-[#07080C] text-white focus:outline-none focus:border-amber-400 pr-12 font-['IBM_Plex_Mono',monospace] transition-colors"
                      />
                      <button
                        type="button"
                        onclick={() => (showPassword = !showPassword)}
                        class="absolute right-4 top-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                      >
                        {#if showPassword}
                          <EyeOff size={16} />
                        {:else}
                          <Eye size={16} />
                        {/if}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label for="confirm-password-input" class="block text-xs font-bold text-white mb-1.5">Confirm New Password</label>
                    <input
                      id="confirm-password-input"
                      type={showPassword ? 'text' : 'password'}
                      bind:value={confirmPassword}
                      placeholder="••••••••••••"
                      class="w-full px-4 py-3 text-xs rounded-2xl border border-white/15 bg-[#07080C] text-white focus:outline-none focus:border-amber-400 font-['IBM_Plex_Mono',monospace] transition-colors"
                    />
                  </div>
                </div>

                <div class="flex items-center justify-end pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onclick={handleChangePassword}
                    disabled={isChangingPassword || !newPassword}
                    class="px-6 py-2.5 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {#if isChangingPassword}
                      <Loader2 size={14} class="animate-spin" />
                      <span>Updating...</span>
                    {:else}
                      <ShieldCheck size={14} />
                      <span>Update Password</span>
                    {/if}
                  </button>
                </div>
              </div>

              <!-- Vault Security Info -->
              <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-3">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">Vault & Client Encryption Status</h4>
                <p class="text-xs text-white/60 leading-relaxed">
                  Your personal BYOK keys are encrypted client-side using WebCrypto AES-GCM (256-bit) before storage. Supabase JWT sessions automatically handle rotation.
                </p>
              </div>
            </div>

          <!-- Tab 5: Diagram Theme (Full Width) -->
          {:else if activeTab === 'theme'}
            <div class="w-full space-y-6">
              <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-4">
                <label for="diagram-theme-select" class="block text-xs font-bold text-white">Diagram Rendering Engine Theme</label>
                <p class="text-xs text-white/60 mb-2">Select default theme presets applied to live Mermaid diagram rendering.</p>
                <div class="w-full">
                  <CustomSelect
                    id="diagram-theme-select"
                    options={themeOptions}
                    bind:value={selectedTheme}
                  />
                </div>
              </div>
            </div>

          <!-- Tab 6: Editor & Export Preferences (Full Width) -->
          {:else if activeTab === 'preferences'}
            <div class="w-full space-y-6">
              <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-5">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">Editor Options</h4>

                <div class="space-y-4">
                  <div class="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div>
                      <div class="font-bold text-white">Auto-Save Diagrams</div>
                      <div class="text-[11.5px] text-white/50">Automatically record edit checkpoints while typing</div>
                    </div>
                    <input type="checkbox" bind:checked={autoSaveEnabled} class="w-4 h-4 rounded border-white/20 bg-[#07080C] accent-amber-400 cursor-pointer" />
                  </div>

                  <div class="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div>
                      <div class="font-bold text-white">Editor Line Numbers</div>
                      <div class="text-[11.5px] text-white/50">Display line numbers gutter in code editor</div>
                    </div>
                    <input type="checkbox" bind:checked={lineNumbersEnabled} class="w-4 h-4 rounded border-white/20 bg-[#07080C] accent-amber-400 cursor-pointer" />
                  </div>

                  <div class="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div>
                      <div class="font-bold text-white">Soft Word Wrapping</div>
                      <div class="text-[11.5px] text-white/50">Wrap long statement lines within editor width</div>
                    </div>
                    <input type="checkbox" bind:checked={wordWrapEnabled} class="w-4 h-4 rounded border-white/20 bg-[#07080C] accent-amber-400 cursor-pointer" />
                  </div>
                </div>
              </div>

              <!-- Default Export Settings -->
              <div class="p-6 rounded-3xl bg-[#0F111A] border border-white/10 space-y-4">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">Default Export Settings</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label for="default-export-fmt" class="block text-xs font-bold text-white/70 mb-2">Export Format</label>
                    <CustomSelect
                      id="default-export-fmt"
                      options={exportFormatOptions}
                      bind:value={defaultExportFormat}
                    />
                  </div>

                  <div>
                    <label for="default-export-bg" class="block text-xs font-bold text-white/70 mb-2">Canvas Background</label>
                    <CustomSelect
                      id="default-export-bg"
                      options={exportBgOptions}
                      bind:value={defaultExportBg}
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
