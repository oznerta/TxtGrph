<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';
  import type { Diagram, Folder } from '@txtgrph/core';
  import { Share2, Copy, Check, RefreshCw, X, Link2, ShieldAlert, UserPlus, Users, Mail, Trash2, Folder as FolderIcon, Info, Globe } from 'lucide-svelte';
  import CustomSelect, { type SelectOption } from '$lib/components/ui/CustomSelect.svelte';

  interface Props {
    open: boolean;
    diagram?: Diagram | null;
    folder?: Folder | null;
    onclose: () => void;
  }

  interface Collaborator {
    id: string;
    email: string;
    role: 'editor' | 'commenter' | 'viewer';
  }

  let { open = false, diagram = null, folder = null, onclose }: Props = $props();

  const supabase = createSupabaseBrowserClient();

  let copied = $state(false);
  let isSaving = $state(false);
  let errorMessage = $state<string | null>(null);

  // Granular Sharing Permissions for Diagram
  let allowComments = $state(true);
  let allowTimeline = $state(false);
  let allowForking = $state(true);

  $effect(() => {
    if (diagram?.config) {
      const cfg = diagram.config as any;
      allowComments = cfg.allowComments !== false;
      allowTimeline = cfg.allowTimeline === true;
      allowForking = cfg.allowForking !== false;
    }
  });

  async function handleTogglePermission(perm: 'allowComments' | 'allowTimeline' | 'allowForking') {
    if (!diagram) return;
    if (perm === 'allowComments') allowComments = !allowComments;
    if (perm === 'allowTimeline') allowTimeline = !allowTimeline;
    if (perm === 'allowForking') allowForking = !allowForking;

    try {
      const updatedConfig = {
        ...(diagram.config || {}),
        allowComments,
        allowTimeline,
        allowForking
      };
      diagram.config = updatedConfig;
      await supabase
        .from('diagrams')
        .update({ config: updatedConfig, updated_at: new Date().toISOString() })
        .eq('id', diagram.id);
    } catch (err) {
      console.error('Failed to update permission config:', err);
    }
  }

  const collaboratorRoleOptions: SelectOption[] = [
    { value: 'editor', label: 'Editor' },
    { value: 'commenter', label: 'Commenter' },
    { value: 'viewer', label: 'Viewer' }
  ];

  // Collaborators State
  let inviteEmail = $state('');
  let inviteRole = $state<'editor' | 'commenter' | 'viewer'>('editor');
  let collaborators = $state<Collaborator[]>([]);
  let inviteSuccess = $state(false);

  const targetItem = $derived(folder || diagram);

  const shareUrl = $derived.by(() => {
    if (!targetItem || !targetItem.shareToken || !targetItem.isShared) return '';
    if (typeof window === 'undefined') return `/share/${targetItem.shareToken}`;
    return `${window.location.origin}/share/${targetItem.shareToken}`;
  });

  async function handleToggleShare() {
    if (!targetItem) return;
    isSaving = true;
    errorMessage = null;

    try {
      const nextIsShared = !targetItem.isShared;
      let nextToken = targetItem.shareToken;

      if (nextIsShared && !nextToken) {
        nextToken = crypto.randomUUID();
      }

      if (folder) {
        const { error } = await supabase
          .from('folders')
          .update({
            is_shared: nextIsShared,
            share_token: nextToken,
            share_updated_at: new Date().toISOString()
          })
          .eq('id', folder.id);

        if (error) throw error;
        workspaceStore.updateFolderShareState(folder.id, nextIsShared, nextToken, collaborators.length);
      } else if (diagram) {
        const { error } = await supabase
          .from('diagrams')
          .update({
            is_shared: nextIsShared,
            share_token: nextToken,
            share_updated_at: new Date().toISOString()
          })
          .eq('id', diagram.id);

        if (error) throw error;
        workspaceStore.updateDiagramShareState(diagram.id, nextIsShared, nextToken);
      }
    } catch (err: any) {
      console.error('Failed to toggle share state:', err);
      errorMessage = err?.message || 'Failed to update share settings';
    } finally {
      isSaving = false;
    }
  }

  async function handlePublicRoleChange(newRole: 'editor' | 'commenter' | 'viewer') {
    if (!targetItem) return;
    isSaving = true;
    errorMessage = null;

    try {
      if (folder) {
        const { error } = await supabase
          .from('folders')
          .update({
            public_access_role: newRole,
            share_updated_at: new Date().toISOString()
          })
          .eq('id', folder.id);

        if (error) throw error;
        folder.publicAccessRole = newRole;
      } else if (diagram) {
        const { error } = await supabase
          .from('diagrams')
          .update({
            public_access_role: newRole,
            share_updated_at: new Date().toISOString()
          })
          .eq('id', diagram.id);

        if (error) throw error;
        diagram.publicAccessRole = newRole;
      }
    } catch (err: any) {
      console.error('Failed to update public access role:', err);
      errorMessage = err?.message || 'Failed to update access role';
    } finally {
      isSaving = false;
    }
  }

  async function handleRegenerateToken() {
    if (!targetItem) return;
    isSaving = true;
    errorMessage = null;

    try {
      const newToken = crypto.randomUUID();
      if (folder) {
        const { error } = await supabase
          .from('folders')
          .update({
            share_token: newToken,
            share_updated_at: new Date().toISOString()
          })
          .eq('id', folder.id);

        if (error) throw error;
        workspaceStore.updateFolderShareState(folder.id, !!folder.isShared, newToken, collaborators.length);
      } else if (diagram) {
        const { error } = await supabase
          .from('diagrams')
          .update({
            share_token: newToken,
            share_updated_at: new Date().toISOString()
          })
          .eq('id', diagram.id);

        if (error) throw error;
        workspaceStore.updateDiagramShareState(diagram.id, diagram.isShared, newToken);
      }
    } catch (err: any) {
      console.error('Failed to regenerate share token:', err);
      errorMessage = err?.message || 'Failed to regenerate link';
    } finally {
      isSaving = false;
    }
  }

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy share URL:', err);
    }
  }

  $effect(() => {
    if (open) {
      if (folder?.id) {
        loadFolderCollaborators(folder.id);
      } else if (diagram?.id) {
        loadCollaborators(diagram.id);
      }
    }
  });

  async function loadCollaborators(diagramId: string) {
    try {
      const { data, error } = await supabase
        .from('diagram_collaborators')
        .select('id, email, role')
        .eq('diagram_id', diagramId);

      if (error) throw error;
      if (data) {
        collaborators = data.map((c: any) => ({
          id: c.id,
          email: c.email,
          role: c.role
        }));
      }
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    }
  }

  async function loadFolderCollaborators(folderId: string) {
    try {
      const { data, error } = await supabase
        .from('folder_collaborators')
        .select('id, email, role')
        .eq('folder_id', folderId);

      if (error) throw error;
      if (data) {
        collaborators = data.map((c: any) => ({
          id: c.id,
          email: c.email,
          role: c.role
        }));
      }
    } catch (err) {
      console.error('Failed to load folder collaborators:', err);
    }
  }

  async function handleInviteCollaborator() {
    if (!inviteEmail.trim()) return;
    const targetEmail = inviteEmail.trim().toLowerCase();
    errorMessage = null;

    try {
      if (folder) {
        const { data, error } = await supabase
          .from('folder_collaborators')
          .insert({
            folder_id: folder.id,
            email: targetEmail,
            role: inviteRole
          })
          .select('id')
          .single();

        if (error) throw error;
        const nextList = [...collaborators, { id: data?.id || crypto.randomUUID(), email: targetEmail, role: inviteRole }];
        collaborators = nextList;
        workspaceStore.updateFolderShareState(folder.id, true, folder.shareToken, nextList.length);
      } else if (diagram) {
        const { data, error } = await supabase
          .from('diagram_collaborators')
          .insert({
            diagram_id: diagram.id,
            email: targetEmail,
            role: inviteRole
          })
          .select('id')
          .single();

        if (error) throw error;
        collaborators = [...collaborators, { id: data?.id || crypto.randomUUID(), email: targetEmail, role: inviteRole }];
      }

      inviteEmail = '';
      inviteSuccess = true;
      setTimeout(() => (inviteSuccess = false), 2500);
    } catch (err: any) {
      console.error('Failed to invite collaborator:', err);
      errorMessage = err?.message || 'Failed to add collaborator';
    }
  }

  async function handleRemoveCollaborator(id: string) {
    try {
      if (folder) {
        await supabase.from('folder_collaborators').delete().eq('id', id);
        const nextList = collaborators.filter((c) => c.id !== id);
        collaborators = nextList;
        workspaceStore.updateFolderShareState(folder.id, !!folder.isShared || nextList.length > 0, folder.shareToken, nextList.length);
      } else {
        await supabase.from('diagram_collaborators').delete().eq('id', id);
        collaborators = collaborators.filter((c) => c.id !== id);
      }
    } catch (err: any) {
      console.error('Failed to remove collaborator:', err);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && (diagram || folder)}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus a11y_consider_explicit_label -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150 select-none font-['Instrument_Sans',sans-serif]"
    role="presentation"
    onclick={onclose}
  >
    <!-- Modal Card -->
    <div
      class="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0F1117] p-6 shadow-2xl transition-all text-white max-h-[85vh] flex flex-col relative z-10"
      role="dialog"
      tabindex="-1"
      aria-labelledby="share-modal-title"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            {#if folder}
              <FolderIcon class="h-4.5 w-4.5" />
            {:else}
              <Share2 class="h-4.5 w-4.5" />
            {/if}
          </div>
          <div>
            <h3 id="share-modal-title" class="text-base font-bold text-white tracking-tight">
              {folder ? 'Share Folder' : 'Share Diagram'}
            </h3>
            <p class="text-xs text-white/50 truncate max-w-[280px]">
              {folder ? folder.name : diagram?.title}
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={onclose}
          class="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X class="h-4.5 w-4.5" />
        </button>
      </div>

      <!-- Content -->
      <div class="mt-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 pr-1">
        {#if errorMessage}
          <div class="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-300 border border-red-500/30">
            <ShieldAlert class="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        {/if}

        {#if folder}
          <div class="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3.5 text-xs text-sky-200">
            <Info class="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
            <div>
              <span class="font-bold text-sky-300">Recursive Folder Access</span>
              <p class="text-sky-200/80 text-[11px] mt-0.5">
                Collaborators invited to <strong class="text-white">{folder.name}</strong> will automatically gain access to all current and future nested sub-folders and diagrams in this folder tree.
              </p>
            </div>
          </div>
        {/if}

        <!-- Toggle Public Access -->
        <div class="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <div class="text-sm font-semibold text-white">Public Link Access</div>
            <div class="text-xs text-white/50 mt-0.5">
              {targetItem?.isShared
                ? folder
                  ? 'Anyone with the link can view all diagrams & sub-folders inside this folder'
                  : 'Anyone with the link can view this diagram in read-only mode'
                : 'Only you & invited collaborators can view'}
            </div>
          </div>
          <button
            type="button"
            onclick={handleToggleShare}
            disabled={isSaving}
            aria-label="Toggle Public Link Access"
            class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              targetItem?.isShared ? 'bg-emerald-500' : 'bg-white/20'
            }`}
            role="switch"
            aria-checked={targetItem?.isShared}
          >
            <span
              class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                targetItem?.isShared ? 'translate-x-5' : 'translate-x-0'
              }`}
            ></span>
          </button>
        </div>

        <!-- Google Drive Style General Access Permission Dropdown -->
        {#if targetItem?.isShared}
          <div class="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5 animate-in fade-in duration-150">
            <div class="flex items-center gap-2.5">
              <Globe size={16} class="text-emerald-400 shrink-0" />
              <div>
                <div class="text-xs font-semibold text-white">General Access Role</div>
                <div class="text-[11px] text-white/40">Permission level for anyone with the public link</div>
              </div>
            </div>

            <div class="w-48">
              <CustomSelect
                value={targetItem.publicAccessRole || 'viewer'}
                options={[
                  { value: 'viewer', label: 'Viewer (Read-only)' },
                  { value: 'commenter', label: 'Commenter (View & Comment)' },
                  { value: 'editor', label: 'Editor (Can Edit)' }
                ]}
                onChange={(val) => handlePublicRoleChange(val as any)}
              />
            </div>
          </div>
        {/if}

        <!-- Share URL Field (when enabled) -->
        {#if targetItem?.isShared}
          <div class="space-y-2 animate-in fade-in duration-200">
            <label for="share-url-input" class="block text-xs font-semibold text-white/70">
              Shareable Web Link
            </label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <input
                  id="share-url-input"
                  type="text"
                  readonly
                  value={shareUrl}
                  class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3.5 py-2.5 text-xs font-['IBM_Plex_Mono',monospace] text-emerald-300 select-all focus:outline-none focus:border-white/30 pr-9"
                />
                <Link2 class="absolute right-3 top-3 h-4 w-4 text-white/30" />
              </div>
              <button
                type="button"
                onclick={copyToClipboard}
                class="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-slate-200 transition-colors shrink-0 shadow-md cursor-pointer"
              >
                {#if copied}
                  <Check class="h-4 w-4 text-emerald-600" />
                  <span>Copied</span>
                {:else}
                  <Copy class="h-4 w-4" />
                  <span>Copy</span>
                {/if}
              </button>
            </div>

            <!-- Revoke / Regenerate Token -->
            <div class="flex items-center justify-between pt-1">
              <span class="text-[11px] text-white/40">
                Need to invalidate existing links?
              </span>
              <button
                type="button"
                onclick={handleRegenerateToken}
                disabled={isSaving}
                class="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-['IBM_Plex_Mono',monospace] cursor-pointer"
              >
                <RefreshCw class={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>Regenerate Link Token</span>
              </button>
            </div>

            <!-- Granular Link Permissions (For Diagrams) -->
            {#if diagram}
              <div class="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2.5 mt-3 font-['Instrument_Sans',sans-serif]">
                <div class="text-[11px] font-bold text-white/40 uppercase tracking-wider font-['IBM_Plex_Mono',monospace]">Link Permissions</div>

                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-semibold text-white">Allow Team Comments</div>
                    <div class="text-[11px] text-white/40">Visitors can leave comments & annotations</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle Allow Team Comments"
                    onclick={() => handleTogglePermission('allowComments')}
                    class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${allowComments ? 'bg-emerald-500' : 'bg-white/20'}`}
                  >
                    <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${allowComments ? 'translate-x-4' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-semibold text-white">Allow Version Timeline</div>
                    <div class="text-[11px] text-white/40">Visitors can inspect edit version history</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle Allow Version Timeline"
                    onclick={() => handleTogglePermission('allowTimeline')}
                    class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${allowTimeline ? 'bg-emerald-500' : 'bg-white/20'}`}
                  >
                    <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${allowTimeline ? 'translate-x-4' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-semibold text-white">Allow 1-Click Forking</div>
                    <div class="text-[11px] text-white/40">Logged-in visitors can clone to their workspace</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle Allow 1-Click Forking"
                    onclick={() => handleTogglePermission('allowForking')}
                    class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${allowForking ? 'bg-emerald-500' : 'bg-white/20'}`}
                  >
                    <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${allowForking ? 'translate-x-4' : 'translate-x-0'}`}></span>
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Direct Email Collaborators Section -->
        <div class="space-y-3 pt-2 border-t border-white/10">
          <label for="invite-collab-email" class="block text-xs font-semibold text-white/70">
            Invite Direct Collaborators by Email
          </label>
          <div class="flex items-center gap-2 overflow-visible">
            <div class="relative flex-1 min-w-0">
              <Mail class="absolute left-3.5 top-3 h-4 w-4 text-white/30" />
              <input
                id="invite-collab-email"
                type="email"
                bind:value={inviteEmail}
                placeholder="colleague@domain.com"
                class="w-full rounded-xl border border-white/15 bg-[#0A0B0E] pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>

            <div class="w-32 shrink-0 relative">
              <CustomSelect
                options={collaboratorRoleOptions}
                bind:value={inviteRole}
                dropUp={true}
              />
            </div>

            <button
              type="button"
              onclick={handleInviteCollaborator}
              disabled={!inviteEmail.trim()}
              class="px-4 py-2.5 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors disabled:opacity-50 shadow-md shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              <span>Invite</span>
            </button>
          </div>

          {#if inviteSuccess}
            <p class="text-[11px] text-emerald-400 font-medium flex items-center gap-1 font-['IBM_Plex_Mono',monospace]">
              <Check size={12} /> Invite sent to {inviteEmail}!
            </p>
          {/if}

          <!-- Collaborators List -->
          {#if collaborators.length > 0}
            <div class="space-y-1.5 pt-1">
              <div class="text-[11px] font-semibold text-white/50">Active Collaborators</div>
              {#each collaborators as collab (collab.id)}
                <div class="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {collab.email.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-xs font-medium text-white truncate">{collab.email}</span>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[10px] px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-amber-400 font-medium capitalize font-['IBM_Plex_Mono',monospace]">
                      {collab.role}
                    </span>
                    <button
                      type="button"
                      onclick={() => handleRemoveCollaborator(collab.id)}
                      class="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                      title="Remove collaborator"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-4 flex justify-end border-t border-white/10 pt-4 shrink-0">
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
