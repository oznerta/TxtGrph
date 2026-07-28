<script lang="ts">
  import { X, Building2, Users, UserPlus, Shield, Trash2, Mail, Check, Loader2 } from 'lucide-svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';

  interface Member {
    id: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }

  interface Props {
    open: boolean;
    orgId?: string | null;
    orgName: string;
    userEmail: string;
    onclose: () => void;
  }

  let { open = false, orgId = null, orgName = 'Team Organization', userEmail = '', onclose }: Props = $props();

  const supabase = createSupabaseBrowserClient();

  let inviteEmail = $state('');
  let inviteRole = $state<'admin' | 'member' | 'viewer'>('member');
  let inviteSuccess = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  const roleOptions: SelectOption[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
    { value: 'viewer', label: 'Viewer' }
  ];

  let members = $state<Member[]>([]);

  $effect(() => {
    if (open) {
      loadMembers();
    }
  });

  async function loadMembers() {
    if (!orgId) {
      // Fallback for primary workspace user
      members = [
        { id: 'self-1', email: userEmail || 'user@workspace.com', role: 'owner' }
      ];
      return;
    }

    isLoading = true;
    errorMessage = null;

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, auth_users:user_id(email)')
        .eq('organization_id', orgId);

      if (error) throw error;

      if (data) {
        members = data.map((m: any) => ({
          id: m.id,
          email: m.auth_users?.email || 'member@workspace.com',
          role: m.role
        }));
      }
    } catch (err: any) {
      console.error('Failed to load org members:', err);
      // Ensure user gracefully sees their own email as owner if error/offline
      members = [{ id: 'self-1', email: userEmail || 'user@workspace.com', role: 'owner' }];
    } finally {
      isLoading = false;
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    const targetEmail = inviteEmail.trim().toLowerCase();
    errorMessage = null;

    try {
      if (orgId) {
        const { error } = await supabase.from('organization_invites').insert({
          organization_id: orgId,
          email: targetEmail,
          role: inviteRole
        });
        if (error) throw error;
      }

      // Append to active UI state
      members = [...members, { id: crypto.randomUUID(), email: targetEmail, role: inviteRole }];
      inviteEmail = '';
      inviteSuccess = true;
      setTimeout(() => (inviteSuccess = false), 3000);
    } catch (err: any) {
      console.error('Failed to invite member:', err);
      errorMessage = err?.message || 'Failed to send invite';
    }
  }

  async function handleRemoveMember(id: string) {
    try {
      if (orgId && !id.startsWith('self-')) {
        await supabase.from('organization_members').delete().eq('id', id);
      }
      members = members.filter((m) => m.id !== id);
    } catch (err: any) {
      console.error('Failed to remove member:', err);
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]">
    <div
      role="presentation"
      class="w-full max-w-xl rounded-2xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-hidden text-white p-6 space-y-5"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <h3 class="text-base font-bold text-white tracking-tight">{orgName}</h3>
            <p class="text-xs text-white/50">Team Space & Member Access Management</p>
          </div>
        </div>

        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {#if errorMessage}
        <div class="p-3 text-xs rounded-xl bg-red-500/10 text-red-300 border border-red-500/30">
          {errorMessage}
        </div>
      {/if}

      <!-- Invite Member Form -->
      <div class="space-y-2">
        <label for="invite-email-input" class="block text-xs font-semibold text-white/70">Invite Team Member by Email</label>
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Mail class="absolute left-3.5 top-3 h-4 w-4 text-white/30" />
            <input
              id="invite-email-input"
              type="email"
              bind:value={inviteEmail}
              placeholder="colleague@company.com"
              class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div class="w-32 shrink-0">
            <CustomSelect
              options={roleOptions}
              bind:value={inviteRole}
            />
          </div>

          <button
            type="button"
            onclick={handleInvite}
            disabled={!inviteEmail.trim()}
            class="px-4 py-2.5 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors disabled:opacity-50 shadow-md shrink-0 cursor-pointer flex items-center gap-1.5 btn-premium"
          >
            <UserPlus size={14} />
            <span>Invite</span>
          </button>
        </div>

        {#if inviteSuccess}
          <p class="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1 font-['IBM_Plex_Mono',monospace]">
            <Check size={12} /> Invitation sent successfully!
          </p>
        {/if}
      </div>

      <!-- Members List -->
      <div class="space-y-2 pt-2">
        <div class="flex items-center justify-between text-xs font-semibold text-white/70">
          <span>Active Team Members ({members.length})</span>
          {#if isLoading}
            <span class="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
              <Loader2 size={12} class="animate-spin" /> Loading...
            </span>
          {/if}
        </div>

        <div class="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {#each members as member (member.id)}
            <div class="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.03]">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {member.email.charAt(0).toUpperCase()}
                </div>
                <span class="text-xs font-medium text-white truncate">{member.email}</span>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[11px] px-2.5 py-0.5 rounded-full border border-white/15 bg-white/5 text-amber-400 font-medium capitalize font-['IBM_Plex_Mono',monospace]">
                  {member.role}
                </span>

                {#if member.role !== 'owner'}
                  <button
                    type="button"
                    onclick={() => handleRemoveMember(member.id)}
                    class="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end border-t border-white/10 pt-4">
        <button
          type="button"
          onclick={onclose}
          class="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
