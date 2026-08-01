<script lang="ts">
  import { onMount } from 'svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { workspaceStore } from '$lib/stores/workspaceStore.svelte';
  import { presenceStore } from '$lib/stores/presenceStore.svelte';
  import { profileStore } from '$lib/stores/profileStore.svelte';
  import FolderTree from '$lib/components/workspace/FolderTree.svelte';
  import FavoriteIcon from '$lib/components/ui/FavoriteIcon.svelte';
  import DiagramCanvas from '$lib/components/workspace/DiagramCanvas.svelte';
  import VersionHistoryModal from '$lib/components/workspace/VersionHistoryModal.svelte';
  import CommentsModal from '$lib/components/workspace/CommentsModal.svelte';
  import {
    Plus,
    LogOut,
    PanelLeftClose,
    PanelLeft,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Download,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    Sparkles,
    Settings,
    Share2,
    Trash2,
    Code,
    Hand,
    Palette,
    RefreshCw,
    X,
    ChevronDown,
    ArrowDown,
    ArrowUp,
    ArrowRight,
    ArrowLeft,
    Network,
    GitFork,
    Check,
    Sun,
    Moon,
    MousePointer,
    FolderKanban,
    BookOpen,
    FolderPlus,
    Copy,
    MoreVertical,
    Heart,
    Pencil,
    FolderOutput,
    History,
    MessageSquare
  } from 'lucide-svelte';
  import AIAssistantModal from '$lib/components/workspace/AIAssistantModal.svelte';
  import ShareModal from '$lib/components/workspace/ShareModal.svelte';
  import TrashBinModal from '$lib/components/workspace/TrashBinModal.svelte';
  import DashboardGallery from '$lib/components/workspace/DashboardGallery.svelte';
  import SettingsModal from '$lib/components/workspace/SettingsModal.svelte';
  import CreateOrgModal from '$lib/components/workspace/CreateOrgModal.svelte';
  import AdvancedExportModal from '$lib/components/workspace/AdvancedExportModal.svelte';
  import TemplatesModal from '$lib/components/workspace/TemplatesModal.svelte';
  import OrgSettingsModal from '$lib/components/workspace/OrgSettingsModal.svelte';
  import MultiMoveModal from '$lib/components/workspace/MultiMoveModal.svelte';
  import RenameModal from '$lib/components/workspace/RenameModal.svelte';
  import type { Diagram, Folder } from '$lib/stores/workspaceStore.svelte';
  import { goto } from '$app/navigation';
  import mermaid from 'mermaid';

  let { data } = $props();
  const supabase = createSupabaseBrowserClient();

  let sidebarOpen = $state(true);
  let isEditingTitle = $state(false);
  let activeTitleInput = $state('');

  let shareModalOpen = $state(false);
  let shareModalFolder = $state<Folder | null>(null);
  let trashModalOpen = $state(false);
  let settingsModalOpen = $state(false);
  let aiModalOpen = $state(false);
  let createOrgModalOpen = $state(false);
  let advancedExportModalOpen = $state(false);
  let templatesModalOpen = $state(false);
  let orgSettingsModalOpen = $state(false);
  let versionHistoryModalOpen = $state(false);
  let commentsModalOpen = $state(false);
  let multiMoveModalOpen = $state(false);
  let multiMoveModalIds = $state<string[]>([]);
  let nameModalOpen = $state(false);
  let nameModalMode = $state<'rename' | 'create'>('rename');
  let nameModalType = $state<'folder' | 'diagram'>('diagram');
  let nameModalId = $state<string | null>(null);
  let nameModalInitial = $state('');
  let nameModalParentFolderId = $state<string | null>(null);

  function openCreateModal(type: 'folder' | 'diagram', parentOrFolderId: string | null = null) {
    nameModalMode = 'create';
    nameModalType = type;
    nameModalId = null;
    nameModalInitial = type === 'folder' ? 'New Folder' : 'Untitled Diagram';
    nameModalParentFolderId = parentOrFolderId;
    nameModalOpen = true;
  }

  function openRenameModal(type: 'folder' | 'diagram', id: string, currentName: string) {
    nameModalMode = 'rename';
    nameModalType = type;
    nameModalId = id;
    nameModalInitial = currentName;
    nameModalParentFolderId = null;
    nameModalOpen = true;
  }
  let activeOrgSettingsId = $state<string | null>(null);
  let activeOrgSettingsName = $state('Team Space');
  let organizations = $state<{ id: string; name: string; slug?: string; ownerId?: string }[]>([]);
  const LOCAL_ORGS_KEY = 'txtgrph_local_organizations';

  function getLocalOrgs(): { id: string; name: string; slug?: string; ownerId?: string }[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_ORGS_KEY);
        if (stored) return JSON.parse(stored);
      } catch (err) {
        console.error('Failed to load local orgs:', err);
      }
    }
    return [];
  }

  function saveLocalOrgs(orgs: { id: string; name: string; slug?: string; ownerId?: string }[]) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_ORGS_KEY, JSON.stringify(orgs));
      } catch (err) {
        console.error('Failed to save local orgs:', err);
      }
    }
  }

  $effect(() => {
    loadOrganizations();
  });

  async function loadOrganizations() {
    const localOrgs = getLocalOrgs();
    let dbOrgs: { id: string; name: string; slug?: string; ownerId?: string }[] = [];

    if (data.organizations && data.organizations.length > 0) {
      dbOrgs = data.organizations.map((o: any) => ({ id: o.id, name: o.name }));
    }

    try {
      const { data: fetchResult, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('created_at', { ascending: true });

      if (!error && fetchResult && fetchResult.length > 0) {
        dbOrgs = fetchResult.map((o: any) => ({ id: o.id, name: o.name }));
      }
    } catch (err) {
      console.error('Failed to fetch orgs from Supabase:', err);
    }

    const dbIds = new Set(dbOrgs.map((o) => o.id));
    const merged = [...dbOrgs, ...localOrgs.filter((o) => !dbIds.has(o.id))];

    organizations = merged;
    workspaceStore.organizations = merged;
    saveLocalOrgs(merged);
  }

  async function handleCreateOrg(name: string) {
    if (!name.trim()) return;

    const newOrgId = crypto.randomUUID();
    const newOrg = { id: newOrgId, name: name.trim() };
    const userId = data.session?.user?.id;

    if (userId) {
      try {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
        const { data: createdOrg, error } = await supabase
          .from('organizations')
          .insert({
            id: newOrgId,
            name: name.trim(),
            slug,
            owner_id: userId
          })
          .select('id, name')
          .single();

        if (error) {
          console.error('Failed to create organization in Supabase:', error);
        } else if (createdOrg) {
          await supabase
            .from('organization_members')
            .insert({
              organization_id: createdOrg.id,
              user_id: userId,
              role: 'owner'
            });
        }
      } catch (err) {
        console.error('Error creating organization:', err);
      }
    }

    const nextOrgs = [...organizations, newOrg];
    organizations = nextOrgs;
    workspaceStore.organizations = nextOrgs;
    saveLocalOrgs(nextOrgs);
    workspaceStore.selectOrg(newOrg.id);
    createOrgModalOpen = false;
  }

  let favoriteIds = $state<Set<string>>(new Set());

  // Canvas Actions Menu State (Matching Homepage)
  let actionsMenuOpen = $state(false);
  let copySvgSuccess = $state(false);
  let copiedError = $state(false);

  // Header 3-dot menu state
  let headerMenuOpen = $state(false);

  $effect(() => {
    if (workspaceStore.activeDiagram && data.session?.user) {
      const user = data.session.user;
      const fullName = profileStore.displayName !== 'User Account' ? profileStore.displayName : (user.email?.split('@')[0] || 'User');
      const headline = profileStore.headline || 'Diagram Architect';

      presenceStore.joinDiagram(workspaceStore.activeDiagram.id, {
        id: user.id,
        email: user.email || '',
        fullName,
        headline,
        avatarUrl: profileStore.avatarUrl || user.user_metadata?.avatar_url,
        role: 'owner'
      });
    } else {
      presenceStore.leaveDiagram();
    }
  });

  // Breadcrumb: resolve space name & folder name for active diagram
  let activeSpaceName = $derived.by(() => {
    const diagram = workspaceStore.activeDiagram;
    const orgId = diagram?.organizationId || workspaceStore.activeOrgId;
    if (orgId) {
      const org = organizations.find((o) => o.id === orgId);
      return org ? org.name : 'Team space';
    }
    return 'Personal files';
  });

  let activeFolderName = $derived.by(() => {
    const diagram = workspaceStore.activeDiagram;
    if (!diagram || !diagram.folderId) return null;
    const folder = workspaceStore.folders.find((f) => f.id === diagram.folderId && !f.isDeleted);
    return folder?.name || null;
  });

  // ── Canvas Editor Floating UI States (Matching Homepage Playground) ──
  let editorCollapsed = $state(false);
  let activeInteractionMode = $state<'select' | 'pan'>('select');
  let isAutoLayoutEnabled = $state(true);
  let activeToolbarPopover = $state<'none' | 'theme' | 'direction' | 'layout'>('none');

  // Mermaid Theme & Canvas Styling (Exact match from homepage)
  let selectedMermaidTheme = $state<'dark' | 'forest' | 'neutral' | 'base' | 'default' | 'ocean' | 'rose' | 'monochrome'>('dark');
  let canvasMode = $state<'dark' | 'light'>('dark');
  let canvasPattern = $state<'dots' | 'grid' | 'crosses' | 'solid'>('dots');
  let currentDirection = $state<'TD' | 'BT' | 'LR' | 'RL'>('TD');
  let currentLayoutAlgorithm = $state<'hierarchical' | 'adaptive'>('hierarchical');
  let selectedFontFamily = $state('Instrument Sans, sans-serif');

  // Interactive Pan & Zoom Canvas State (Exact match from homepage)
  let zoomScale = $state(1.0);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let startPanX = $state(0);
  let startPanY = $state(0);
  let isCanvasFullscreen = $state(false);

  // Mermaid Live Render State
  let svgContent = $state('');
  let renderError = $state<string | null>(null);
  let isRendering = $state(false);

  onMount(() => {
    try {
      mermaid.parseError = () => {};
    } catch (e) {
      console.error('Mermaid parseError handler init error:', e);
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: selectedFontFamily
    });

    const handleFullscreenChange = () => {
      isCanvasFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    profileStore.loadFromLocal();
    profileStore.init(data.userProfile, data.session?.user?.email);

    if (data.diagrams && data.diagrams.length > 0) {
      workspaceStore.diagrams = data.diagrams;
    }
    if (data.folders && data.folders.length > 0) {
      workspaceStore.folders = data.folders;
    }

    if (workspaceStore.diagrams.length > 0) {
      favoriteIds = new Set(workspaceStore.diagrams.filter((d) => d.isShared).map((d) => d.id));
    }

    // Hydrate workspace selection from URL search params on mount/refresh
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlSpace = searchParams.get('space');
      const urlFolder = searchParams.get('folder');
      const urlDiagram = searchParams.get('diagram');

      if (urlSpace) {
        workspaceStore.selectOrg(urlSpace);
      }
      if (urlFolder) {
        workspaceStore.selectFolder(urlFolder);
      }
      if (urlDiagram) {
        workspaceStore.selectDiagram(urlDiagram);
      }
    }

    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const searchParams = new URLSearchParams(window.location.search);
      const urlSpace = searchParams.get('space');
      const urlFolder = searchParams.get('folder');
      const urlDiagram = searchParams.get('diagram');

      workspaceStore.selectOrg(urlSpace || null);
      workspaceStore.selectFolder(urlFolder || null);
      workspaceStore.selectDiagram(urlDiagram || null);
    };
    window.addEventListener('popstate', handlePopState);

    const handleGlobalKeydown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          shareModalOpen = true;
        } else {
          performManualSave();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (e.shiftKey) {
          advancedExportModalOpen = true;
        } else {
          editorCollapsed = !editorCollapsed;
        }
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        templatesModalOpen = true;
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleGlobalKeydown);
      window.removeEventListener('popstate', handlePopState);
    };
  });

  // Two-way reactive URL synchronization with workspaceStore state
  let isInitialUrlHydration = true;
  $effect(() => {
    const activeOrg = workspaceStore.activeOrgId;
    const activeFolder = workspaceStore.activeFolderId;
    const activeDiagram = workspaceStore.activeDiagramId;

    if (typeof window === 'undefined') return;

    if (isInitialUrlHydration) {
      isInitialUrlHydration = false;
      return;
    }

    const currentUrl = new URL(window.location.href);
    let urlChanged = false;

    // 1. Sync Space / Organization search param
    if (activeOrg) {
      if (currentUrl.searchParams.get('space') !== activeOrg) {
        currentUrl.searchParams.set('space', activeOrg);
        urlChanged = true;
      }
    } else if (currentUrl.searchParams.has('space')) {
      currentUrl.searchParams.delete('space');
      urlChanged = true;
    }

    // 2. Sync Active Diagram or Active Folder search param
    if (activeDiagram) {
      if (currentUrl.searchParams.get('diagram') !== activeDiagram) {
        currentUrl.searchParams.set('diagram', activeDiagram);
        urlChanged = true;
      }
      if (currentUrl.searchParams.has('folder')) {
        currentUrl.searchParams.delete('folder');
        urlChanged = true;
      }
    } else {
      if (currentUrl.searchParams.has('diagram')) {
        currentUrl.searchParams.delete('diagram');
        urlChanged = true;
      }

      if (activeFolder) {
        if (currentUrl.searchParams.get('folder') !== activeFolder) {
          currentUrl.searchParams.set('folder', activeFolder);
          urlChanged = true;
        }
      } else if (currentUrl.searchParams.has('folder')) {
        currentUrl.searchParams.delete('folder');
        urlChanged = true;
      }
    }

    if (urlChanged) {
      goto(currentUrl.search || '/workspace', {
        replaceState: false,
        keepFocus: true,
        noScroll: true
      });
    }
  });

  $effect(() => {
    const code = workspaceStore.activeCode;
    if (code) {
      renderDiagram(code);
    }
  });

  async function renderDiagram(code: string) {
    if (!code || !code.trim()) {
      svgContent = '';
      renderError = null;
      return;
    }

    isRendering = true;
    renderError = null;
    const renderId = `mermaid-render-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const isValid = await mermaid.parse(code, { suppressErrors: true });
      if (!isValid) {
        throw new Error('Syntax error in text');
      }
      const { svg } = await mermaid.render(renderId, code);
      svgContent = svg;
      renderError = null;
    } catch (err: any) {
      renderError = err?.message || 'Syntax error in Mermaid diagram';
    } finally {
      isRendering = false;
      const errEl = document.getElementById(renderId) || document.getElementById('d' + renderId);
      if (errEl) errEl.remove();
      document.querySelectorAll('svg[id^="dmermaid-render-"], svg[id^="mermaid-render-"]').forEach((el) => el.remove());
      document.querySelectorAll('svg[id*="mermaid"], .error-icon').forEach((el) => {
        if (el.parentNode === document.body) el.remove();
      });
    }
  }

  // ── Theme System (Exact replication from homepage playground) ──
  function toggleCanvasMode(mode: 'dark' | 'light') {
    canvasMode = mode;
    changeMermaidTheme(selectedMermaidTheme);
  }

  function changeMermaidTheme(newTheme: typeof selectedMermaidTheme) {
    selectedMermaidTheme = newTheme;
    const isLight = canvasMode === 'light';

    let resolvedTheme: string = newTheme;
    let resolvedThemeVars: Record<string, string> = {
      fontFamily: selectedFontFamily,
    };

    if (newTheme === 'dark') {
      resolvedTheme = 'dark';
      resolvedThemeVars = isLight
        ? { fontFamily: selectedFontFamily, lineColor: '#1E293B', defaultLinkColor: '#1E293B' }
        : { fontFamily: selectedFontFamily, lineColor: '#CBD5E1', defaultLinkColor: '#CBD5E1', actorLineColor: '#CBD5E1', signalColor: '#CBD5E1' };
    } else if (newTheme === 'default') {
      resolvedTheme = 'default';
      resolvedThemeVars = isLight
        ? { fontFamily: selectedFontFamily, lineColor: '#1E293B', defaultLinkColor: '#1E293B' }
        : { fontFamily: selectedFontFamily, lineColor: '#CBD5E1', defaultLinkColor: '#CBD5E1', actorLineColor: '#CBD5E1', signalColor: '#CBD5E1' };
    } else if (newTheme === 'forest') {
      resolvedTheme = 'forest';
      resolvedThemeVars = isLight
        ? { fontFamily: selectedFontFamily, lineColor: '#0F172A', defaultLinkColor: '#0F172A' }
        : { fontFamily: selectedFontFamily, lineColor: '#6EE7B7', defaultLinkColor: '#6EE7B7', actorLineColor: '#6EE7B7', signalColor: '#6EE7B7' };
    } else if (newTheme === 'neutral') {
      resolvedTheme = 'neutral';
      resolvedThemeVars = isLight
        ? { fontFamily: selectedFontFamily, lineColor: '#0F172A', defaultLinkColor: '#0F172A' }
        : { fontFamily: selectedFontFamily, lineColor: '#C084FC', defaultLinkColor: '#C084FC', actorLineColor: '#C084FC', signalColor: '#C084FC' };
    } else if (newTheme === 'base') {
      resolvedTheme = 'base';
      resolvedThemeVars = isLight
        ? {
            fontFamily: selectedFontFamily,
            primaryColor: '#F1F5F9',
            primaryTextColor: '#0F172A',
            primaryBorderColor: '#64748B',
            lineColor: '#1E293B',
            secondaryColor: '#E2E8F0',
            tertiaryColor: '#FFFFFF',
            edgeLabelBackground: '#FFFFFF',
            nodeBorder: '#475569',
          }
        : {
            fontFamily: selectedFontFamily,
            primaryColor: '#1E293B',
            primaryTextColor: '#F8FAFC',
            primaryBorderColor: '#64748B',
            lineColor: '#38BDF8',
            secondaryColor: '#334155',
            tertiaryColor: '#0F172A',
            edgeLabelBackground: '#0F172A',
            nodeBorder: '#64748B',
          };
    } else if (newTheme === 'ocean') {
      resolvedTheme = 'base';
      resolvedThemeVars = isLight
        ? {
            fontFamily: selectedFontFamily,
            primaryColor: '#E0F2FE',
            primaryTextColor: '#0369A1',
            primaryBorderColor: '#0284C7',
            lineColor: '#0284C7',
            secondaryColor: '#BAE6FD',
            tertiaryColor: '#F0F9FF',
            edgeLabelBackground: '#FFFFFF',
            nodeBorder: '#0284C7',
          }
        : {
            fontFamily: selectedFontFamily,
            primaryColor: '#0A192F',
            primaryTextColor: '#E0F2FE',
            primaryBorderColor: '#38BDF8',
            lineColor: '#38BDF8',
            secondaryColor: '#1E293B',
            tertiaryColor: '#0284C7',
            edgeLabelBackground: '#0A192F',
            nodeBorder: '#38BDF8',
          };
    } else if (newTheme === 'rose') {
      resolvedTheme = 'base';
      resolvedThemeVars = isLight
        ? {
            fontFamily: selectedFontFamily,
            primaryColor: '#FFE4E6',
            primaryTextColor: '#9F1239',
            primaryBorderColor: '#E11D48',
            lineColor: '#E11D48',
            secondaryColor: '#FECDD3',
            tertiaryColor: '#FFF1F2',
            edgeLabelBackground: '#FFFFFF',
            nodeBorder: '#E11D48',
          }
        : {
            fontFamily: selectedFontFamily,
            primaryColor: '#2A0815',
            primaryTextColor: '#FFE4E6',
            primaryBorderColor: '#FB7185',
            lineColor: '#FB7185',
            secondaryColor: '#4C1D2F',
            tertiaryColor: '#881337',
            edgeLabelBackground: '#2A0815',
            nodeBorder: '#FB7185',
          };
    } else if (newTheme === 'monochrome') {
      resolvedTheme = 'base';
      resolvedThemeVars = isLight
        ? {
            fontFamily: selectedFontFamily,
            primaryColor: '#F8FAFC',
            primaryTextColor: '#000000',
            primaryBorderColor: '#000000',
            lineColor: '#000000',
            secondaryColor: '#E2E8F0',
            tertiaryColor: '#FFFFFF',
            edgeLabelBackground: '#FFFFFF',
            nodeBorder: '#000000',
          }
        : {
            fontFamily: selectedFontFamily,
            primaryColor: '#000000',
            primaryTextColor: '#FFFFFF',
            primaryBorderColor: '#FFFFFF',
            lineColor: '#FFFFFF',
            secondaryColor: '#18181B',
            tertiaryColor: '#27272A',
            edgeLabelBackground: '#000000',
            nodeBorder: '#FFFFFF',
          };
    }

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme as any,
        fontFamily: selectedFontFamily,
        securityLevel: 'loose',
        themeVariables: resolvedThemeVars,
      });
      const code = workspaceStore.activeCode;
      if (code) renderDiagram(code);
    } catch (e) {
      console.error('Theme change error', e);
    }
  }

  function toggleToolbarPopover(popover: 'theme' | 'direction' | 'layout') {
    if (activeToolbarPopover === popover) {
      activeToolbarPopover = 'none';
    } else {
      activeToolbarPopover = popover;
    }
  }

  function setDirection(dir: 'TD' | 'BT' | 'LR' | 'RL') {
    currentDirection = dir;
    let code = workspaceStore.activeCode;
    if (code.match(/graph (TD|TB|BT|LR|RL)/)) {
      code = code.replace(/graph (TD|TB|BT|LR|RL)/, `graph ${dir}`);
    } else if (code.match(/flowchart (TD|TB|BT|LR|RL)/)) {
      code = code.replace(/flowchart (TD|TB|BT|LR|RL)/, `flowchart ${dir}`);
    }
    workspaceStore.updateActiveCode(code);
    activeToolbarPopover = 'none';
  }

  function setLayoutAlgorithm(algo: 'hierarchical' | 'adaptive') {
    currentLayoutAlgorithm = algo;
    const renderer = algo === 'adaptive' ? 'elk' : 'dagre-wrapper';
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: selectedMermaidTheme as any,
        fontFamily: selectedFontFamily,
        securityLevel: 'loose',
        flowchart: {
          defaultRenderer: renderer,
        },
      });
    } catch (e) {
      console.error('Mermaid layout init error', e);
    }

    let code = workspaceStore.activeCode;
    if (code.includes('graph ') || code.includes('flowchart ')) {
      let cleanCode = code.replace(/%%\{init:\s*\{\s*["']flowchart["']:\s*\{\s*["']defaultRenderer["']:\s*["'](elk|dagre)["']\s*\}\s*\}\s*\}%%\n?/gi, '');
      code = `%%{init: {"flowchart": {"defaultRenderer": "${renderer}"}}}%%\n` + cleanCode.trimStart();
    }

    workspaceStore.updateActiveCode(code);
    activeToolbarPopover = 'none';
  }

  function setDiagramFont(fontName: string) {
    selectedFontFamily = fontName;
    changeMermaidTheme(selectedMermaidTheme);
    activeToolbarPopover = 'none';
  }

  function toggleAutoLayout() {
    isAutoLayoutEnabled = !isAutoLayoutEnabled;
    let code = workspaceStore.activeCode;
    if (isAutoLayoutEnabled) {
      if (code.match(/graph (LR|RL|BT)/)) {
        code = code.replace(/graph (LR|RL|BT)/, 'graph TD');
        currentDirection = 'TD';
      }
    } else {
      if (code.match(/graph (TD|TB)/)) {
        code = code.replace(/graph (TD|TB)/, 'graph LR');
        currentDirection = 'LR';
      }
    }
    workspaceStore.updateActiveCode(code);
  }

  // ── Interactive Pan & Zoom (Exact replication from homepage playground) ──
  function zoomIn() {
    zoomScale = Math.min(3.5, Math.round((zoomScale + 0.15) * 100) / 100);
  }

  function zoomOut() {
    zoomScale = Math.max(0.3, Math.round((zoomScale - 0.15) * 100) / 100);
  }

  function resetZoom() {
    zoomScale = 1.0;
    panX = 0;
    panY = 0;
  }

  function startPan(e: MouseEvent) {
    if ((activeInteractionMode === 'pan' && e.button === 0) || e.button === 2) {
      if (e.button === 2) {
        e.preventDefault();
      }
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;
    }
  }

  function onPanMove(e: MouseEvent) {
    if (isPanning) {
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
    }
  }

  function endPan() {
    isPanning = false;
  }

  function handleCanvasWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomScale = Math.min(3.5, Math.max(0.3, Math.round(zoomScale * zoomFactor * 100) / 100));
    } else if (activeInteractionMode === 'pan') {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }
  }

  function toggleCanvasFullscreen() {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          isCanvasFullscreen = true;
        }).catch(() => {
          isCanvasFullscreen = true;
        });
      } else {
        document.exitFullscreen().then(() => {
          isCanvasFullscreen = false;
        }).catch(() => {
          isCanvasFullscreen = false;
        });
      }
    }
  }

  // ── Canvas Background Style (Exact replication from homepage playground) ──
  let canvasBgStyle = $derived.by(() => {
    if (canvasMode === 'dark') {
      if (canvasPattern === 'dots') return 'background-color: #0B0C10; background-image: radial-gradient(rgba(255, 255, 255, 0.22) 1.2px, transparent 1.2px); background-size: 20px 20px;';
      if (canvasPattern === 'grid') return 'background-color: #0B0C10; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px); background-size: 24px 24px;';
      if (canvasPattern === 'crosses') return 'background-color: #0B0C10; background-image: radial-gradient(rgba(255, 255, 255, 0.3) 1.5px, transparent 1.5px); background-size: 28px 28px;';
      return 'background-color: #0B0C10;';
    } else {
      if (canvasPattern === 'dots') return 'background-color: #F8FAFC; background-image: radial-gradient(rgba(0, 0, 0, 0.25) 1.2px, transparent 1.2px); background-size: 20px 20px;';
      if (canvasPattern === 'grid') return 'background-color: #F8FAFC; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 1px, transparent 1px); background-size: 24px 24px;';
      if (canvasPattern === 'crosses') return 'background-color: #F8FAFC; background-image: radial-gradient(rgba(0, 0, 0, 0.35) 1.5px, transparent 1.5px); background-size: 28px 28px;';
      return 'background-color: #F8FAFC;';
    }
  });

  let autoSaveEnabled = $state(true);
  let showSaveToast = $state(false);
  let toastTimer: any = null;

  let localSaveTimer: any = null;
  function recordLocalEdit(diagramId: string, code: string) {
    if (typeof window === 'undefined' || !diagramId || !code) return;
    clearTimeout(localSaveTimer);
    localSaveTimer = setTimeout(() => {
      try {
        const key = `txtgrph_local_edits_${diagramId}`;
        const stored = localStorage.getItem(key);
        let list: any[] = stored ? JSON.parse(stored) : [];

        const newCheckpoint = {
          id: `edit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          code,
          charCount: code.length,
          summary: `Local Edit (${code.length} chars)`
        };

        if (list.length === 0 || list[0].code !== code) {
          list = [newCheckpoint, ...list].slice(0, 25);
          localStorage.setItem(key, JSON.stringify(list));
        }
      } catch (e) {
        console.warn('Failed to record local edit:', e);
      }
    }, 1500);
  }

  // ── Code Change & Save Handlers ──
  function handleCodeChange(newCode: string) {
    workspaceStore.updateActiveCode(newCode);
    if (workspaceStore.activeDiagramId) {
      recordLocalEdit(workspaceStore.activeDiagramId, newCode);
      if (autoSaveEnabled && data.session?.user?.id) {
        saveDiagramDebounced(workspaceStore.activeDiagramId, newCode);
      } else {
        workspaceStore.saveStatus = 'unsaved';
      }
    }
  }

  let saveTimer: any = null;
  function saveDiagramDebounced(diagramId: string, code: string) {
    workspaceStore.saveStatus = 'saving';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await supabase
        .from('diagrams')
        .update({ code, updated_at: new Date().toISOString() })
        .eq('id', diagramId);
      workspaceStore.saveStatus = 'saved';
    }, 1000);
  }

  async function performManualSave() {
    if (!workspaceStore.activeDiagramId || !data.session?.user?.id) return;
    workspaceStore.saveStatus = 'saving';
    try {
      await supabase
        .from('diagrams')
        .update({ code: workspaceStore.activeCode, updated_at: new Date().toISOString() })
        .eq('id', workspaceStore.activeDiagramId);
      workspaceStore.saveStatus = 'saved';

      showSaveToast = true;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (showSaveToast = false), 2500);
    } catch (err) {
      console.error('Failed manual save:', err);
      workspaceStore.saveStatus = 'error';
    }
  }

  function handleTitleSave() {
    isEditingTitle = false;
    if (activeTitleInput.trim() && workspaceStore.activeDiagramId) {
      workspaceStore.updateActiveTitle(activeTitleInput.trim());
      supabase
        .from('diagrams')
        .update({ title: activeTitleInput.trim(), updated_at: new Date().toISOString() })
        .eq('id', workspaceStore.activeDiagramId);
    }
  }

  // ── Code Editor Line Numbers (Exact homepage textarea approach) ──
  let lineNumbers = $derived(
    Array.from({ length: Math.max(1, workspaceStore.activeCode.split('\n').length) }, (_, i) => i + 1)
  );

  function handleCodeInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    handleCodeChange(target.value);
  }

  // ── Export Functions (Exact homepage approach) ──
  function handleExport(format: 'svg' | 'png' | 'jpeg' | 'mmd' | 'md' | 'copy-svg') {
    const baseFilename = (workspaceStore.activeTitle || 'diagram').replace(/\s+/g, '-');

    if (format === 'svg') {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      downloadBlob(blob, `${baseFilename}.svg`);
    } else if (format === 'mmd') {
      const blob = new Blob([workspaceStore.activeCode], { type: 'text/plain' });
      downloadBlob(blob, `${baseFilename}.mmd`);
    } else if (format === 'md') {
      const mdContent = `# ${workspaceStore.activeTitle}\n\n\`\`\`mermaid\n${workspaceStore.activeCode}\n\`\`\`\n`;
      const blob = new Blob([mdContent], { type: 'text/markdown' });
      downloadBlob(blob, `${baseFilename}.md`);
    } else if (format === 'copy-svg') {
      navigator.clipboard.writeText(svgContent);
      copySvgSuccess = true;
      setTimeout(() => (copySvgSuccess = false), 2000);
    } else if (format === 'png' || format === 'jpeg') {
      rasterizeSvgToImage(svgContent, format, `${baseFilename}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    }

    actionsMenuOpen = false;
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function rasterizeSvgToImage(svgString: string, format: 'png' | 'jpeg', filename: string) {
    const img = new window.Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = (img.width || 1200) * scale;
      canvas.height = (img.height || 900) * scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (format === 'jpeg') {
          ctx.fillStyle = '#0E0F12';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, filename);
        }, format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  async function copyErrorToClipboard() {
    if (!renderError) return;
    try {
      await navigator.clipboard.writeText(renderError);
      copiedError = true;
      setTimeout(() => (copiedError = false), 2000);
    } catch (err) {
      console.error('Copy error failed', err);
    }
  }

  function toggleFavorite(diagramId: string) {
    const next = new Set(favoriteIds);
    if (next.has(diagramId)) {
      next.delete(diagramId);
    } else {
      next.add(diagramId);
    }
    favoriteIds = next;
  }

  function downloadSvg() {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceStore.activeTitle || 'diagram'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreateDiagram(
    title = 'Untitled Diagram',
    folderId: string | null = null,
    customCode?: string
  ) {
    const userId = data.session?.user?.id || 'guest-user';
    const diagramId = crypto.randomUUID();
    const initialCode = customCode || `graph TD\n  Start[Start Process] --> Process[Execute Task]\n  Process --> End[Finish]`;

    const newDiagram = {
      id: diagramId,
      userId,
      folderId,
      organizationId: workspaceStore.activeOrgId,
      title,
      code: initialCode,
      config: {},
      isShared: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (data.session?.user?.id) {
      try {
        await supabase
          .from('diagrams')
          .insert({
            id: diagramId,
            title,
            folder_id: folderId,
            user_id: userId,
            code: initialCode,
            organization_id: workspaceStore.activeOrgId
          });
      } catch (err) {
        console.error('Failed to insert diagram to Supabase:', err);
      }
    }

    workspaceStore.diagrams = [newDiagram, ...workspaceStore.diagrams];
    workspaceStore.selectDiagram(newDiagram.id);
    sidebarOpen = false;
  }

  async function handleCreateFolder(name: string, parentId: string | null = null) {
    const userId = data.session?.user?.id || 'guest-user';
    const folderId = crypto.randomUUID();

    const newFolder = {
      id: folderId,
      userId,
      parentId,
      organizationId: workspaceStore.activeOrgId,
      name,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (data.session?.user?.id) {
      try {
        await supabase
          .from('folders')
          .insert({
            id: folderId,
            name,
            parent_id: parentId,
            user_id: userId,
            organization_id: workspaceStore.activeOrgId
          });
      } catch (err) {
        console.error('Failed to insert folder to Supabase:', err);
      }
    }

    workspaceStore.folders = [...workspaceStore.folders, newFolder];
  }

  async function handleDeleteDiagram(id: string) {
    workspaceStore.softDeleteDiagram(id);
    await supabase
      .from('diagrams')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
  }

  async function handleDeleteFolder(id: string) {
    workspaceStore.softDeleteFolder(id);
    await supabase
      .from('folders')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
  }

  async function handleDuplicateDiagrams(ids: string[]) {
    if (!data.session?.user?.id) return;

    for (const id of ids) {
      const source = workspaceStore.diagrams.find((d) => d.id === id);
      if (!source) continue;

      const { data: created, error } = await supabase
        .from('diagrams')
        .insert({
          title: `${source.title} (Copy)`,
          folder_id: source.folderId,
          user_id: data.session.user.id,
          code: source.code,
          organization_id: source.organizationId || workspaceStore.activeOrgId
        })
        .select()
        .single();

      if (created && !error) {
        const newDiagram = {
          id: created.id,
          userId: created.user_id,
          folderId: created.folder_id,
          organizationId: created.organization_id || null,
          title: created.title,
          code: created.code,
          config: created.config || {},
          isShared: created.is_shared || false,
          shareToken: created.share_token || null,
          shareUpdatedAt: created.share_updated_at || null,
          isDeleted: created.is_deleted || false,
          deletedAt: created.deleted_at || null,
          createdAt: created.created_at,
          updatedAt: created.updated_at
        };

        workspaceStore.diagrams = [newDiagram, ...workspaceStore.diagrams];
      }
    }
  }

  async function handleMoveDiagrams(ids: string[], targetFolderId: string | null) {
    for (const id of ids) {
      const target = workspaceStore.diagrams.find((d) => d.id === id);
      if (target) {
        target.folderId = targetFolderId;
      }
    }

    await supabase
      .from('diagrams')
      .update({ folder_id: targetFolderId, updated_at: new Date().toISOString() })
      .in('id', ids);
  }

  async function handleMoveFolders(ids: string[], targetFolderId: string | null) {
    for (const id of ids) {
      const target = workspaceStore.folders.find((f) => f.id === id);
      if (target) {
        target.parentId = targetFolderId;
      }
    }

    await supabase
      .from('folders')
      .update({ parent_id: targetFolderId, updated_at: new Date().toISOString() })
      .in('id', ids);
  }

  async function handleRenameDiagram(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    workspaceStore.renameDiagram(id, newTitle.trim());
    await supabase
      .from('diagrams')
      .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  async function handleRenameFolder(id: string, newName: string) {
    if (!newName.trim()) return;
    workspaceStore.renameFolder(id, newName.trim());
    await supabase
      .from('folders')
      .update({ name: newName.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);
  }


  async function handleSignOut() {
    await supabase.auth.signOut();
    await goto('/auth');
  }
</script>

<div class="h-screen w-screen flex bg-[#090A0F] overflow-hidden select-none font-['Instrument_Sans',sans-serif]">
  <!-- Left Navigation Sidebar -->
  {#if sidebarOpen && !isCanvasFullscreen}
    <div class="w-64 shrink-0 h-full">
      <FolderTree
        userEmail={data.session?.user?.email || ''}
        {sidebarOpen}
        {favoriteIds}
        {organizations}
        onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
        onCreateFolder={(parentId?: string | null) => openCreateModal('folder', parentId || null)}
        onCreateDiagram={(folderId?: string | null) => openCreateModal('diagram', folderId || null)}
        onRenameFolder={(id, currentName) => openRenameModal('folder', id, currentName)}
        onRenameDiagram={(id, currentTitle) => openRenameModal('diagram', id, currentTitle)}
        onDeleteFolder={handleDeleteFolder}
        onDeleteDiagram={handleDeleteDiagram}
        onOpenTrash={() => (trashModalOpen = true)}
        onOpenSettings={() => (settingsModalOpen = true)}
        onOpenCreateOrg={() => (createOrgModalOpen = true)}
        onOpenOrgSettings={(id: string, name: string) => { activeOrgSettingsId = id; activeOrgSettingsName = name; orgSettingsModalOpen = true; }}
        onShareFolder={(folder: Folder) => {
          shareModalFolder = folder;
          shareModalOpen = true;
        }}
      />
    </div>
  {/if}

  {#if showSaveToast}
    <div class="fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-2xl bg-[#0F1117]/95 border border-emerald-500/30 text-emerald-400 font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-xl font-['Instrument_Sans',sans-serif]">
      <Check size={16} class="text-emerald-400 shrink-0" />
      <span>Diagram saved to cloud (Ctrl+S)</span>
    </div>
  {/if}

  <!-- Main Viewport Content Container -->
  <main class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
    {#if workspaceStore.activeDiagramId}
      <DiagramCanvas
        bind:code={workspaceStore.activeCode}
        bind:autoSaveEnabled={autoSaveEnabled}
        title={workspaceStore.activeTitle}
        readOnly={false}
        saveStatus={workspaceStore.saveStatus}
        isFavorite={favoriteIds.has(workspaceStore.activeDiagramId || '')}
        spaceName={activeSpaceName}
        folderName={activeFolderName}
        onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
        onCodeChange={handleCodeChange}
        onTitleChange={(newTitle: string) => {
          if (workspaceStore.activeDiagramId) handleRenameDiagram(workspaceStore.activeDiagramId, newTitle);
        }}
        onToggleFavorite={() => {
          if (workspaceStore.activeDiagramId) toggleFavorite(workspaceStore.activeDiagramId);
        }}
        onOpenComments={() => (commentsModalOpen = true)}
        onOpenHistory={() => (versionHistoryModalOpen = true)}
        onOpenShare={() => (shareModalOpen = true)}
        onOpenExport={() => (advancedExportModalOpen = true)}
        onOpenTemplates={() => (templatesModalOpen = true)}
        onOpenAI={() => (aiModalOpen = true)}
        onDuplicate={() => {
          if (workspaceStore.activeDiagramId) handleDuplicateDiagrams([workspaceStore.activeDiagramId]);
        }}
        onMove={() => {
          if (workspaceStore.activeDiagramId) {
            multiMoveModalIds = [workspaceStore.activeDiagramId];
            multiMoveModalOpen = true;
          }
        }}
        onDelete={() => {
          if (workspaceStore.activeDiagramId) handleDeleteDiagram(workspaceStore.activeDiagramId);
        }}
      />
    {:else}
      <DashboardGallery
        diagrams={workspaceStore.diagrams}
        folders={workspaceStore.folders}
        activeFolderId={workspaceStore.activeFolderId}
        {favoriteIds}
        {sidebarOpen}
        onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
        onSelectDiagram={(id: string) => { workspaceStore.selectDiagram(id); sidebarOpen = false; }}
        onSelectFolder={(id: string | null) => workspaceStore.selectFolder(id)}
        onCreateDiagram={(folderId?: string | null) => openCreateModal('diagram', folderId || null)}
        onCreateFolder={(parentId?: string | null) => openCreateModal('folder', parentId || null)}
        onOpenAiModal={() => (aiModalOpen = true)}
        onToggleFavorite={toggleFavorite}
        onShareDiagram={(diagram: Diagram) => {
          workspaceStore.selectDiagram(diagram.id);
          sidebarOpen = false;
          shareModalOpen = true;
        }}
        onRenameFolder={(id, currentName) => openRenameModal('folder', id, currentName)}
        onRenameDiagram={(id, currentTitle) => openRenameModal('diagram', id, currentTitle)}
        onDeleteDiagram={(id: string) => handleDeleteDiagram(id)}
        onDeleteFolder={(id: string) => handleDeleteFolder(id)}
        onDuplicateDiagrams={handleDuplicateDiagrams}
        onMoveDiagrams={handleMoveDiagrams}
        onMoveFolders={handleMoveFolders}
        onShareFolder={(folder: Folder) => {
          shareModalFolder = folder;
          shareModalOpen = true;
        }}
      />
    {/if}
  </main>
</div>

<AIAssistantModal
  bind:isOpen={aiModalOpen}
  currentCode={workspaceStore.activeCode}
  onApply={async (newCode: string, mode: 'create' | 'refine', promptTitle?: string) => {
    if (mode === 'create' || !workspaceStore.activeDiagramId) {
      await handleCreateDiagram(promptTitle || 'AI Diagram', workspaceStore.activeFolderId, newCode);
    } else {
      await handleCodeChange(newCode);
    }
  }}
  onOpenSettings={() => (settingsModalOpen = true)}
/>

<ShareModal
  open={shareModalOpen}
  diagram={shareModalFolder ? null : workspaceStore.activeDiagram}
  folder={shareModalFolder}
  onclose={() => {
    shareModalOpen = false;
    shareModalFolder = null;
  }}
/>

<TrashBinModal
  open={trashModalOpen}
  onclose={() => (trashModalOpen = false)}
/>

<SettingsModal
  open={settingsModalOpen}
  userEmail={data.session?.user?.email || ''}
  onclose={() => (settingsModalOpen = false)}
/>

<CreateOrgModal
  open={createOrgModalOpen}
  onCreateOrg={handleCreateOrg}
  onclose={() => (createOrgModalOpen = false)}
/>

<AdvancedExportModal
  open={advancedExportModalOpen}
  code={workspaceStore.activeCode}
  title={workspaceStore.activeTitle}
  onclose={() => (advancedExportModalOpen = false)}
/>

<TemplatesModal
  open={templatesModalOpen}
  onSelectTemplate={(code, title) => {
    handleCodeChange(code);
    workspaceStore.updateActiveTitle(title);
  }}
  onclose={() => (templatesModalOpen = false)}
/>

<OrgSettingsModal
  open={orgSettingsModalOpen}
  orgId={activeOrgSettingsId}
  orgName={activeOrgSettingsName}
  userEmail={data.session?.user?.email || ''}
  onclose={() => (orgSettingsModalOpen = false)}
/>

<VersionHistoryModal
  open={versionHistoryModalOpen}
  diagramId={workspaceStore.activeDiagramId}
  currentCode={workspaceStore.activeCode}
  userEmail={data.session?.user?.email || ''}
  onRestore={(versionCode) => {
    handleCodeChange(versionCode);
  }}
  onclose={() => (versionHistoryModalOpen = false)}
/>

<CommentsModal
  open={commentsModalOpen}
  diagramId={workspaceStore.activeDiagramId}
  userEmail={data.session?.user?.email || ''}
  onclose={() => (commentsModalOpen = false)}
/>

<MultiMoveModal
  open={multiMoveModalOpen}
  selectedCount={multiMoveModalIds.length}
  folders={workspaceStore.folders}
  onMove={(targetFolderId: string | null) => {
    handleMoveDiagrams(multiMoveModalIds, targetFolderId);
    multiMoveModalOpen = false;
  }}
  onclose={() => (multiMoveModalOpen = false)}
/>

<RenameModal
  open={nameModalOpen}
  mode={nameModalMode}
  itemType={nameModalType}
  itemId={nameModalId}
  initialName={nameModalInitial}
  parentOrFolderId={nameModalParentFolderId}
  onrename={(id, newName) => {
    if (nameModalType === 'folder') {
      handleRenameFolder(id, newName);
    } else {
      handleRenameDiagram(id, newName);
    }
  }}
  oncreate={(name, type, parentOrFolderId) => {
    if (type === 'folder') {
      handleCreateFolder(name, parentOrFolderId || null);
    } else {
      handleCreateDiagram(name, parentOrFolderId || null);
    }
  }}
  onclose={() => (nameModalOpen = false)}
/>

