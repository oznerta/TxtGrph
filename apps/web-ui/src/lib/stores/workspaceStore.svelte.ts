import type { Folder, Diagram } from '@txtgrph/core';

export class WorkspaceStore {
  folders = $state<Folder[]>([]);
  diagrams = $state<Diagram[]>([]);
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

  // Active Diagram Title
  get activeTitle(): string {
    return this.activeDiagram?.title || 'Untitled Diagram';
  }

  // Initialize store from server load data
  init(folders: Folder[], diagrams: Diagram[], initialDiagramId?: string | null) {
    this.folders = folders;
    this.diagrams = diagrams;
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
  selectDiagram(diagramId: string) {
    this.activeDiagramId = diagramId;
  }

  // Active Folders derived lookup (non-deleted)
  get activeFolders(): Folder[] {
    return this.folders.filter((f) => !f.isDeleted);
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

  // Filter active diagrams and folders by search query
  get filteredDiagrams(): Diagram[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.diagrams.filter((d) => !d.isDeleted);
    return this.diagrams.filter(
      (d) => !d.isDeleted && (d.title.toLowerCase().includes(query) || d.code.toLowerCase().includes(query))
    );
  }

  // Get child folders of parent (null for root), filtering out deleted folders
  getChildFolders(parentId: string | null = null): Folder[] {
    return this.folders.filter((f) => f.parentId === parentId && !f.isDeleted);
  }

  // Get diagrams in folder (null for root), filtering out deleted diagrams
  getFolderDiagrams(folderId: string | null = null): Diagram[] {
    return this.diagrams.filter((d) => d.folderId === folderId && !d.isDeleted);
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
