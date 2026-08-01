export interface Folder {
  id: string;
  userId: string;
  parentId: string | null;
  organizationId?: string | null;
  name: string;
  color?: string | null;
  icon?: string | null;
  isShared?: boolean;
  shareToken?: string | null;
  shareUpdatedAt?: string | null;
  sharedCollaboratorCount?: number;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Diagram {
  id: string;
  userId: string;
  folderId: string | null;
  organizationId?: string | null;
  title: string;
  code: string;
  config: Record<string, unknown>;
  isShared: boolean;
  shareToken?: string | null;
  shareUpdatedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  ownerId?: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface DiagramCollaborator {
  id: string;
  diagramId: string;
  userId?: string | null;
  email: string;
  role: 'editor' | 'viewer';
}

export class WorkspaceStore {
  folders = $state<Folder[]>([]);
  diagrams = $state<Diagram[]>([]);
  organizations = $state<Organization[]>([]);
  activeOrgId = $state<string | null>(null);
  activeDiagramId = $state<string | null>(null);
  activeFolderId = $state<string | null>(null);
  searchQuery = $state<string>('');
  expandedFolderIds = $state<Set<string>>(new Set());
  saveStatus = $state<'saved' | 'saving' | 'error' | 'unsaved'>('saved');

  // Active Diagram derived lookup
  get activeDiagram(): Diagram | null {
    if (!this.activeDiagramId) return null;
    return this.diagrams.find((d) => d.id === this.activeDiagramId && !d.isDeleted) || null;
  }

  // Active Diagram Code
  get activeCode(): string {
    return this.activeDiagram?.code || '';
  }

  set activeCode(newCode: string) {
    const target = this.activeDiagram;
    if (target) {
      target.code = newCode;
    }
  }

  // Active Diagram Title
  get activeTitle(): string {
    return this.activeDiagram?.title || 'Untitled Diagram';
  }

  set activeTitle(newTitle: string) {
    const target = this.activeDiagram;
    if (target) {
      target.title = newTitle;
    }
  }

  // Active Folder derived lookup
  get activeFolder(): Folder | null {
    if (!this.activeFolderId) return null;
    return this.folders.find((f) => f.id === this.activeFolderId && !f.isDeleted) || null;
  }

  // Select active folder for gallery view navigation
  selectFolder(folderId: string | null) {
    this.activeFolderId = folderId;
    this.activeDiagramId = null;
  }

  // Select active space (Personal vs Team Organization space)
  selectOrg(orgId: string | null) {
    this.activeOrgId = orgId;
    this.activeFolderId = null;
    this.activeDiagramId = null;
  }

  // Initialize store from server load data
  init(folders: Folder[], diagrams: Diagram[], initialDiagramId?: string | null, orgs: Organization[] = []) {
    this.folders = folders;
    this.diagrams = diagrams;
    this.organizations = orgs;
    if (initialDiagramId && diagrams.some((d) => d.id === initialDiagramId)) {
      this.activeDiagramId = initialDiagramId;
    } else if (diagrams.length > 0) {
      this.activeDiagramId = diagrams[0].id;
    }
  }

  // Expand / collapse folder node
  toggleFolder(folderId: string) {
    const next = new Set(this.expandedFolderIds);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    this.expandedFolderIds = next;
  }

  // Select active diagram
  selectDiagram(diagramId: string | null) {
    this.activeDiagramId = diagramId;
  }

  // Update active diagram code
  updateActiveCode(newCode: string) {
    const target = this.diagrams.find((d) => d.id === this.activeDiagramId);
    if (target) {
      target.code = newCode;
    }
  }

  // Update active diagram title
  updateActiveTitle(newTitle: string) {
    const target = this.diagrams.find((d) => d.id === this.activeDiagramId);
    if (target) {
      target.title = newTitle;
    }
  }

  // Rename specific diagram by ID
  renameDiagram(id: string, newTitle: string) {
    const target = this.diagrams.find((d) => d.id === id);
    if (target) {
      target.title = newTitle;
    }
  }

  // Rename specific folder by ID
  renameFolder(id: string, newName: string) {
    const target = this.folders.find((f) => f.id === id);
    if (target) {
      target.name = newName;
    }
  }


  // Active Folders derived lookup (non-deleted & current space)
  get activeFolders(): Folder[] {
    return this.folders.filter(
      (f) => !f.isDeleted && (this.activeOrgId ? f.organizationId === this.activeOrgId : !f.organizationId)
    );
  }

  // Trashed items
  get trashedFolders(): Folder[] {
    return this.folders.filter((f) => f.isDeleted);
  }

  get trashedDiagrams(): Diagram[] {
    return this.diagrams.filter((d) => d.isDeleted);
  }

  get trashedCount(): number {
    return this.trashedFolders.length + this.trashedDiagrams.length;
  }

  // Filter active diagrams and folders by search query and active space
  get filteredDiagrams(): Diagram[] {
    const query = this.searchQuery.trim().toLowerCase();
    let base = this.diagrams.filter(
      (d) => !d.isDeleted && (this.activeOrgId ? d.organizationId === this.activeOrgId : !d.organizationId)
    );
    if (!query) return base;
    return base.filter(
      (d) => d.title.toLowerCase().includes(query) || d.code.toLowerCase().includes(query)
    );
  }

  // Get child folders of parent (null for root), filtering out deleted folders and matching current or target space
  getChildFolders(parentId: string | null = null, orgId?: string | null): Folder[] {
    const targetOrgId = orgId !== undefined ? orgId : this.activeOrgId;
    return this.folders.filter(
      (f) =>
        f.parentId === parentId &&
        !f.isDeleted &&
        (targetOrgId ? f.organizationId === targetOrgId : !f.organizationId)
    );
  }

  // Get diagrams in folder (null for root), filtering out deleted diagrams and matching current or target space
  getFolderDiagrams(folderId: string | null = null, orgId?: string | null): Diagram[] {
    const targetOrgId = orgId !== undefined ? orgId : this.activeOrgId;
    return this.diagrams.filter(
      (d) =>
        d.folderId === folderId &&
        !d.isDeleted &&
        (targetOrgId ? d.organizationId === targetOrgId : !d.organizationId)
    );
  }

  // Toggle Diagram Share state
  updateDiagramShareState(diagramId: string, isShared: boolean, shareToken?: string | null) {
    const target = this.diagrams.find((d) => d.id === diagramId);
    if (target) {
      target.isShared = isShared;
      if (shareToken !== undefined) {
        target.shareToken = shareToken;
      }
      target.shareUpdatedAt = new Date().toISOString();
    }
  }

  // Toggle Folder Share state
  updateFolderShareState(folderId: string, isShared: boolean, shareToken?: string | null, count?: number) {
    const target = this.folders.find((f) => f.id === folderId);
    if (target) {
      target.isShared = isShared;
      if (shareToken !== undefined) {
        target.shareToken = shareToken;
      }
      if (count !== undefined) {
        target.sharedCollaboratorCount = count;
      }
      target.shareUpdatedAt = new Date().toISOString();
    }
  }

  // Soft Delete Diagram
  softDeleteDiagram(diagramId: string) {
    const target = this.diagrams.find((d) => d.id === diagramId);
    if (target) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();

      // If active diagram was deleted, switch to next available active diagram
      if (this.activeDiagramId === diagramId) {
        const remaining = this.diagrams.filter((d) => !d.isDeleted);
        this.activeDiagramId = remaining.length > 0 ? remaining[0].id : null;
      }
    }
  }

  // Soft Delete Folder
  softDeleteFolder(folderId: string) {
    const target = this.folders.find((f) => f.id === folderId);
    if (target) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();
    }
  }

  // Restore Diagram from Trash
  restoreDiagram(diagramId: string) {
    const target = this.diagrams.find((d) => d.id === diagramId);
    if (target) {
      target.isDeleted = false;
      target.deletedAt = null;
    }
  }

  // Restore Folder from Trash
  restoreFolder(folderId: string) {
    const target = this.folders.find((f) => f.id === folderId);
    if (target) {
      target.isDeleted = false;
      target.deletedAt = null;
    }
  }

  // Permanently Purge Diagram
  purgeDiagram(diagramId: string) {
    this.diagrams = this.diagrams.filter((d) => d.id !== diagramId);
    if (this.activeDiagramId === diagramId) {
      const remaining = this.diagrams.filter((d) => !d.isDeleted);
      this.activeDiagramId = remaining.length > 0 ? remaining[0].id : null;
    }
  }

  // Permanently Purge Folder
  purgeFolder(folderId: string) {
    this.folders = this.folders.filter((f) => f.id !== folderId);
  }

  // Empty Trash completely
  emptyTrash() {
    this.diagrams = this.diagrams.filter((d) => !d.isDeleted);
    this.folders = this.folders.filter((f) => !f.isDeleted);
  }
}


export const workspaceStore = new WorkspaceStore();
