export interface UserProfile {
  fullName: string;
  headline: string;
  avatarUrl: string;
}

export class ProfileStore {
  fullName = $state<string>('');
  headline = $state<string>('Diagram Architect');
  avatarUrl = $state<string>('');

  get initials(): string {
    const name = this.fullName.trim();
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return 'U';
  }

  get displayName(): string {
    return this.fullName.trim() || 'User Account';
  }

  init(profile?: Partial<UserProfile> | null, fallbackEmail?: string) {
    if (profile?.fullName) {
      this.fullName = profile.fullName;
    } else if (!this.fullName && fallbackEmail) {
      this.fullName = fallbackEmail.split('@')[0];
    }

    if (profile?.headline) {
      this.headline = profile.headline;
    }

    if (profile?.avatarUrl !== undefined) {
      this.avatarUrl = profile.avatarUrl || '';
    }

    this.saveToLocal();
  }

  updateProfile(profile: Partial<UserProfile>) {
    if (profile.fullName !== undefined) this.fullName = profile.fullName;
    if (profile.headline !== undefined) this.headline = profile.headline;
    if (profile.avatarUrl !== undefined) this.avatarUrl = profile.avatarUrl;
    this.saveToLocal();
  }

  loadFromLocal() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('txtgrph_user_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.fullName) this.fullName = parsed.fullName;
          if (parsed.headline) this.headline = parsed.headline;
          if (parsed.avatarUrl !== undefined) this.avatarUrl = parsed.avatarUrl;
        }
      } catch (err) {
        console.error('Failed to load profile from localStorage:', err);
      }
    }
  }

  private saveToLocal() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'txtgrph_user_profile',
          JSON.stringify({
            fullName: this.fullName,
            headline: this.headline,
            avatarUrl: this.avatarUrl
          })
        );
      } catch (err) {
        console.error('Failed to save profile to localStorage:', err);
      }
    }
  }
}

export const profileStore = new ProfileStore();
