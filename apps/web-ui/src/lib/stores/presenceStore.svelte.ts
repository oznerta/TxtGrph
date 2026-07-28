import { createSupabaseBrowserClient } from '$lib/supabase/client';

export interface PresenceUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  online_at: string;
}

const ACCENT_COLORS = [
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#A855F7'  // Violet
];

class PresenceStore {
  onlineUsers = $state<PresenceUser[]>([]);
  activeChannel = $state<any>(null);
  activeDiagramId = $state<string | null>(null);

  joinDiagram(diagramId: string, currentUser: { id: string; email: string; fullName?: string; avatarUrl?: string; role?: 'owner' | 'editor' | 'viewer' }) {
    if (this.activeDiagramId === diagramId && this.activeChannel) return;

    this.leaveDiagram();

    const supabase = createSupabaseBrowserClient();
    this.activeDiagramId = diagramId;

    // Pick deterministic accent color based on user_id hash
    let hash = 0;
    for (let i = 0; i < currentUser.id.length; i++) {
      hash = currentUser.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % ACCENT_COLORS.length;
    const userColor = ACCENT_COLORS[colorIndex];

    const rawName = currentUser.fullName?.trim();
    const isEmailAsName = !rawName || rawName === currentUser.email;
    const displayName = !isEmailAsName ? rawName : (currentUser.email ? currentUser.email.split('@')[0] : 'Guest Viewer');

    const presencePayload: PresenceUser = {
      user_id: currentUser.id,
      full_name: displayName,
      email: currentUser.email,
      avatar_url: currentUser.avatarUrl || null,
      color: userColor,
      role: currentUser.role || 'viewer',
      online_at: new Date().toISOString()
    };

    const channelName = `diagram-presence-${diagramId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        for (const key in state) {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            users.push(presences[0] as PresenceUser);
          }
        }
        this.onlineUsers = users;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(presencePayload);
        }
      });

    this.activeChannel = channel;
  }

  leaveDiagram() {
    if (this.activeChannel) {
      this.activeChannel.unsubscribe();
      this.activeChannel = null;
    }
    this.activeDiagramId = null;
    this.onlineUsers = [];
  }
}

export const presenceStore = new PresenceStore();
