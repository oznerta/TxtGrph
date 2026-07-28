<script lang="ts">
  import { onMount } from 'svelte';
  import { X, MessageSquare, Send, CheckCircle2, Trash2, User, Clock, Loader2 } from 'lucide-svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export interface Comment {
    id: string;
    diagram_id: string;
    author_email: string;
    author_name?: string;
    content: string;
    is_resolved: boolean;
    created_at: string;
  }

  interface Props {
    open: boolean;
    diagramId: string | null;
    userEmail: string;
    onclose: () => void;
  }

  let { open = false, diagramId = null, userEmail = '', onclose }: Props = $props();

  const supabase = createSupabaseBrowserClient();

  let comments = $state<Comment[]>([]);
  let newCommentText = $state('');
  let isLoading = $state(false);
  let isSending = $state(false);
  let activeTab = $state<'active' | 'resolved'>('active');

  $effect(() => {
    if (open && diagramId) {
      fetchComments();
    }
  });

  async function fetchComments() {
    if (!diagramId) return;
    isLoading = true;
    try {
      const { data, error } = await supabase
        .from('diagram_comments')
        .select('*')
        .eq('diagram_id', diagramId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      comments = data || [];
    } catch (err) {
      console.warn('Comments fetch error:', err);
    } finally {
      isLoading = false;
    }
  }

  async function handlePostComment() {
    if (!diagramId || !newCommentText.trim()) return;
    isSending = true;
    const newComment = {
      diagram_id: diagramId,
      author_email: userEmail || 'you@domain.com',
      author_name: 'You',
      content: newCommentText.trim(),
      is_resolved: false
    };

    try {
      const { data, error } = await supabase
        .from('diagram_comments')
        .insert(newComment)
        .select()
        .single();

      if (!error && data) {
        comments = [...comments, data];
        newCommentText = '';
      }
    } catch (err) {
      console.warn('Post comment error:', err);
    } finally {
      isSending = false;
    }
  }

  async function toggleResolve(commentId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('diagram_comments')
        .update({ is_resolved: !currentStatus })
        .eq('id', commentId);

      if (!error) {
        comments = comments.map((c) => (c.id === commentId ? { ...c, is_resolved: !currentStatus } : c));
      }
    } catch (err) {
      console.warn('Toggle resolve error:', err);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const { error } = await supabase
        .from('diagram_comments')
        .delete()
        .eq('id', commentId);

      if (!error) {
        comments = comments.filter((c) => c.id !== commentId);
      }
    } catch (err) {
      console.warn('Delete comment error:', err);
    }
  }

  let filteredComments = $derived.by(() => {
    return comments.filter((c) => (activeTab === 'resolved' ? c.is_resolved : !c.is_resolved));
  });

  function formatTimeAgo(isoDate: string) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  }
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
    <div class="absolute inset-0" onclick={onclose} role="presentation"></div>

    <div class="relative w-full max-w-lg h-[600px] rounded-3xl bg-[#0F1117] border border-white/15 shadow-2xl overflow-hidden flex flex-col z-10 glass-panel">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 class="text-base font-bold text-white tracking-tight">Team Comments & Annotations</h3>
            <p class="text-xs text-white/50">Collaborate with team members on diagram feedback</p>
          </div>
        </div>

        <button
          onclick={onclose}
          class="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Tab Filters -->
      <div class="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-white/10 text-xs shrink-0 font-semibold">
        <button
          onclick={() => (activeTab = 'active')}
          class="px-3 py-1.5 rounded-xl transition-all cursor-pointer {activeTab === 'active' ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white hover:bg-white/10'}"
        >
          Active ({comments.filter((c) => !c.is_resolved).length})
        </button>
        <button
          onclick={() => (activeTab = 'resolved')}
          class="px-3 py-1.5 rounded-xl transition-all cursor-pointer {activeTab === 'resolved' ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white hover:bg-white/10'}"
        >
          Resolved ({comments.filter((c) => c.is_resolved).length})
        </button>
      </div>

      <!-- Comments List Body -->
      <div class="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
        {#if isLoading}
          <div class="flex flex-col items-center justify-center py-12 text-white/40 space-y-2">
            <Loader2 size={20} class="animate-spin text-amber-400" />
            <span class="text-xs">Loading comments...</span>
          </div>
        {:else if filteredComments.length === 0}
          <div class="p-8 rounded-2xl border border-dashed border-white/10 text-center text-white/40 space-y-2 my-auto">
            <MessageSquare size={24} class="mx-auto text-white/20" />
            <p class="text-xs font-semibold">No {activeTab} comments on this diagram yet.</p>
            <p class="text-[11px] text-white/30">Post a comment below to start a feedback thread with your team.</p>
          </div>
        {:else}
          {#each filteredComments as comment (comment.id)}
            <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 group transition-colors hover:border-white/20">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center border border-amber-500/30 uppercase">
                    {comment.author_email.charAt(0)}
                  </div>
                  <span class="text-xs font-bold text-white">{comment.author_email}</span>
                  <span class="text-[10px] text-white/40 font-['IBM_Plex_Mono',monospace]">{formatTimeAgo(comment.created_at)}</span>
                </div>

                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onclick={() => toggleResolve(comment.id, comment.is_resolved)}
                    title={comment.is_resolved ? 'Reopen comment' : 'Mark as resolved'}
                    class="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-emerald-400 transition-colors"
                  >
                    <CheckCircle2 size={14} class={comment.is_resolved ? 'text-emerald-400' : ''} />
                  </button>
                  <button
                    onclick={() => deleteComment(comment.id)}
                    title="Delete comment"
                    class="p-1 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p class="text-xs text-white/80 leading-relaxed font-['Instrument_Sans',sans-serif]">{comment.content}</p>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Post New Comment Input Footer -->
      <div class="p-4 border-t border-white/10 bg-[#090A0F] shrink-0">
        <form onsubmit={(e) => { e.preventDefault(); handlePostComment(); }} class="flex gap-2">
          <input
            type="text"
            bind:value={newCommentText}
            placeholder="Type a team comment or annotation..."
            class="flex-1 px-4 py-2.5 text-xs rounded-xl border border-white/15 bg-[#0F1117] text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-['Instrument_Sans',sans-serif]"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSending}
            class="px-4 py-2.5 text-xs font-bold rounded-xl bg-white text-black hover:bg-slate-200 transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer btn-premium"
          >
            <Send size={14} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}
