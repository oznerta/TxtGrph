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

  // Filter diagrams and folders by search query
  get filteredDiagrams(): Diagram[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.diagrams.filter((d) => !d.isDeleted);
    return this.diagrams.filter(
      (d) => !d.isDeleted && (d.title.toLowerCase().includes(query) || d.code.toLowerCase().includes(query))
    );
  }

  // Get child folders of parent (null for root)
  getChildFolders(parentId: string | null = null): Folder[] {
    return this.folders.filter((f) => f.parentId === parentId);
  }

  // Get diagrams in folder (null for root)
  getFolderDiagrams(folderId: string | null = null): Diagram[] {
    return this.diagrams.filter((d) => d.folderId === folderId && !d.isDeleted);
  }
}

export const workspaceStore = new WorkspaceStore();
