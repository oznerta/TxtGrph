<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import mermaid from 'mermaid';
  import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
  import { CoreVersion } from '@txtgrph/core';
  import {
    Code2,
    FolderTree,
    Sparkles,
    Share2,
    Zap,
    ArrowRight,
    Copy,
    Check,
    Cpu,
    Layers,
    RotateCcw,
    AlertCircle,
    Search,
    BookOpen,
    CheckCircle2,
    X,
    Command,
    Github,
    Maximize2,
    Minimize2,
    PanelLeft,
    PanelLeftClose,
    Lock,
    Mic,
    MicOff,
    Send,
    Bot,
    MessageSquare,
    Wand2,
    Volume2,
    Download,
    FolderPlus,
    FolderKanban,
    ChevronRight,
    GitBranch,
    Terminal,
    Star,
    Folder,
    FileText,
    ShieldCheck,
    Image,
    FileCode,
    Code,
    ChevronDown,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    ArrowLeft,
    Filter,
    Square,
    Circle,
    Database,
    Plus,
    ArrowRightLeft,
    Palette,
    Type,
    Hand,
    MousePointer,
    Box,
    Server,
    Cloud,
    Shield,
    Globe,
    User,
    Activity,
    ArrowDown,
    ArrowUp,
    Network,
    GitFork,
    Sun,
    Moon,
    Grid,
  } from 'lucide-svelte';

  let { data } = $props();

  const presets = [
    {
      id: 'architecture',
      name: 'System Architecture',
      icon: Cpu,
      filename: 'system-architecture.mmd',
      category: 'Flowchart',
      code: `graph TD
  Client[SvelteKit Web UI] --> Core[Core Engine v${CoreVersion}]
  Core --> Parser[Mermaid 11.4 Parser]
  Parser --> SVG[Client-Side SVG]
  Client --> Auth[(Supabase Auth)]
  Client --> DB[(Supabase RLS Postgres)]`,
    },
    {
      id: 'sequence',
      name: 'OAuth 2.0 Sequence',
      icon: Zap,
      filename: 'oauth-sequence.mmd',
      category: 'Sequence Diagram',
      code: `sequenceDiagram
  autonumber
  actor User as Developer
  participant App as TxtGrph UI
  participant Auth as Supabase Auth
  participant DB as Postgres RLS

  User->>App: Request Magic Link Auth
  App->>Auth: Trigger OTP Token
  Auth-->>User: Dispatch Verification Email
  User->>App: Click Auth Token Link
  App->>DB: Verify JWT Session & RLS`,
    },
    {
      id: 'state',
      name: 'State Machine',
      icon: Layers,
      filename: 'order-lifecycle.mmd',
      category: 'State Diagram',
      code: `stateDiagram-v2
  [*] --> Draft
  Draft --> Compiling: Live Keypress Input
  Compiling --> Validated: AST Syntax Verified
  Compiling --> SyntaxError: Invalid Token
  Validated --> Rendered: Client SVG Render
  SyntaxError --> Draft: Await Fix`,
    },
    {
      id: 'mindmap',
      name: 'Feature Mindmap',
      icon: Sparkles,
      filename: 'platform-features.mmd',
      category: 'Mindmap',
      code: `mindmap
  root((TxtGrph Platform))
    Live Editor
      CodeMirror 6
      Mermaid 11.4
      Client-side SVG
    Workspace
      Folder Hierarchy
      Supabase RLS
      Shareable Links
    AI Assistance
      BYOK Anthropic
      BYOK OpenAI
      BYOK Gemini`,
    },
  ];

  const syntaxLessons = [
    {
      id: 'nodes',
      title: 'Nodes & Geometry',
      description: 'Define graph elements using brackets, rounded nodes, or circles to change geometry.',
      code: `graph LR
  A[Rectangle Box] --> B(Rounded Node)
  B --> C{Decision Diamond}
  C --> D((Double Circle))`,
    },
    {
      id: 'arrows',
      title: 'Links & Flows',
      description: 'Control arrow styles with solid, dashed, or thick lines and inline text labels.',
      code: `graph LR
  A -- Solid Link --> B
  B -. Dashed Link .-> C
  C ==> Thick Arrow ==> D`,
    },
    {
      id: 'subgraphs',
      title: 'Subgraphs & Boundary',
      description: 'Group related system components into visual boundaries for architectural isolation.',
      code: `graph TB
  subgraph Frontend Layer
    UI[SvelteKit App]
  end
  subgraph Database Layer
    DB[(Supabase Postgres)]
  end
  UI --> DB`,
    },
    {
      id: 'sequence-anatomy',
      title: 'Actor Sequence',
      description: 'Model asynchronous actor interactions, activation bars, and payload returns.',
      code: `sequenceDiagram
  Alice->>Bob: Hello Bob, how are you?
  activate Bob
  Bob-->>Alice: I am good thanks!
  deactivate Bob`,
    },
  ];

  // Interactive Workflow Scroll Steps
  const workflowSteps = [
    {
      step: '01',
      title: 'Text-Driven Specification',
      subtitle: 'Write pure Mermaid syntax in CodeMirror 6 with instant AST linting.',
      icon: Code2,
      detail: 'Eliminate manual line dragging. Define system boundaries, actors, and message payloads using clean text files stored directly in Git.',
    },
    {
      step: '02',
      title: 'Zero-Latency Compilation',
      subtitle: 'Mermaid 11.4 parses AST directly in your browser thread.',
      icon: Zap,
      detail: 'No server roundtrips or rendering delays. Experience sub-5ms compilation speeds with inline syntax error boundaries.',
    },
    {
      step: '03',
      title: 'Nested Folders & RLS Privacy',
      subtitle: 'Organize specs into subfolders secured by Supabase Postgres RLS.',
      icon: FolderTree,
      detail: 'Drag-and-drop workspace organization with strict row-level data isolation and optional view-only share link generation.',
    },
  ];

  let selectedPreset = $state<any>(presets[0]);
  let selectedWorkflowStep = $state(workflowSteps[0]);
  let SelectedStepIcon = $derived(selectedWorkflowStep.icon);
  let editorCollapsed = $state(false);
  let isEditorExpanded = $state(false);
  let code = $state(presets[0].code);
  let renderedSvg = $state('');
  let renderError = $state<string | null>(null);
  let isRendering = $state(false);
  let renderTimeMs = $state(0);
  let copiedCode = $state(false);
  let copiedCloneCmd = $state(false);
  let copySvgSuccess = $state(false);
  let exportDropdownOpen = $state(false);
  let actionsMenuOpen = $state(false);
  let commandPaletteOpen = $state(false);
  let searchQuery = $state('');
  let authModalOpen = $state(false);
  let authModalReason = $state('');

  // Templates Modal State
  let templatesModalOpen = $state(false);
  let modalActiveTab = $state<'templates' | 'types'>('templates');
  let selectedCategoryFilter = $state('All');
  let selectedLesson = $state<any>(null);

  const allDiagramTypes = [
    { name: 'Flowchart', category: 'Flowchart', code: 'graph TD\n  A[Start] --> B(Process)\n  B --> C{Decision}\n  C -- Yes --> D[Result]' },
    { name: 'Sequence', category: 'Sequence', code: 'sequenceDiagram\n  Alice->>Bob: Request\n  Bob-->>Alice: Response' },
    { name: 'Class', category: 'Class', code: 'classDiagram\n  class Animal {\n    +String name\n    +makeSound()\n  }' },
    { name: 'State', category: 'State', code: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Processing: Event\n  Processing --> [*]' },
    { name: 'Entity Relationship', category: 'ER', code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains' },
    { name: 'Mindmap', category: 'Mindmap', code: 'mindmap\n  root((Project))\n    Topic 1\n      Detail A\n    Topic 2' },
    { name: 'Architecture', category: 'Architecture', code: 'graph TB\n  subgraph Frontend\n    UI[Web UI]\n  end\n  subgraph Backend\n    API[REST API]\n  end\n  UI --> API' },
    { name: 'Gantt Chart', category: 'Gantt', code: 'gantt\n  title Project Schedule\n  dateFormat YYYY-MM-DD\n  section Phase 1\n    Task 1: 2026-07-01, 10d' },
    { name: 'Git Graph', category: 'Git', code: 'gitGraph\n  commit\n  branch feature\n  checkout feature\n  commit\n  checkout main\n  merge feature' },
    { name: 'Kanban', category: 'Kanban', code: 'kanban\n  Backlog\n    [Task A]\n  Done\n    [Task B]' },
    { name: 'Pie Chart', category: 'Pie', code: 'pie title Tech Usage\n  "TypeScript" : 55\n  "Svelte" : 30\n  "Postgres" : 15' },
    { name: 'Quadrant Chart', category: 'Quadrant', code: 'quadrantChart\n  title Reach vs Impact\n  x-axis Low Reach --> High Reach\n  y-axis Low Impact --> High Impact\n  quadrant-1 Expand\n  quadrant-2 Priority' },
    { name: 'Requirement', category: 'Requirement', code: 'requirementDiagram\n  requirement test_req {\n    id: 1\n    text: System must respond in <10ms\n    risk: low\n  }' },
    { name: 'Timeline', category: 'Timeline', code: 'timeline\n  title History\n  2024 : Event A\n  2026 : Launch' },
    { name: 'User Journey', category: 'User Journey', code: 'journey\n  title Onboarding\n  section Visit\n    Land on home: 5: User' },
  ];

  let filteredTemplatesModal = $derived(
    selectedCategoryFilter === 'All'
      ? presets
      : presets.filter((t) => t.category === selectedCategoryFilter)
  );

  const templateCategoryOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Flowchart', label: 'Flowchart' },
    { value: 'Sequence', label: 'Sequence' },
    { value: 'State', label: 'State' },
    { value: 'Mindmap', label: 'Mindmap' },
    { value: 'ER', label: 'ER Schema' },
    { value: 'Class', label: 'Class Schema' },
    { value: 'Gantt', label: 'Gantt Roadmap' },
    { value: 'Git', label: 'Git Graph' },
    { value: 'Kanban', label: 'Kanban' },
    { value: 'User Journey', label: 'User Journey' },
  ];

  function loadTemplateCode(newCode: string) {
    code = newCode;
    compileDiagram(code);
    templatesModalOpen = false;
  }

  // Visual Editing Toolbar State
  let selectedMermaidTheme = $state<'dark' | 'forest' | 'neutral' | 'base' | 'default' | 'ocean' | 'rose' | 'monochrome'>('dark');
  let canvasMode = $state<'dark' | 'light'>('dark');
  let canvasPattern = $state<'dots' | 'grid' | 'crosses' | 'solid'>('dots');

  let customImageUrl = $state('');
  let customImageLabel = $state('');

  let isAutoLayoutEnabled = $state(true);
  let activeToolbarPopover = $state<'none' | 'theme' | 'direction' | 'layout'>('none');
  let currentDirection = $state<'TD' | 'BT' | 'LR' | 'RL'>('TD');
  let currentLayoutAlgorithm = $state<'hierarchical' | 'adaptive'>('hierarchical');
  let selectedFontFamily = $state('Public Sans, sans-serif');
  let diagramStyle = $state<'rounded' | 'sharp' | 'curved'>('rounded');

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
      compileDiagram(code);
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
    if (code.match(/graph (TD|TB|BT|LR|RL)/)) {
      code = code.replace(/graph (TD|TB|BT|LR|RL)/, `graph ${dir}`);
    } else if (code.match(/flowchart (TD|TB|BT|LR|RL)/)) {
      code = code.replace(/flowchart (TD|TB|BT|LR|RL)/, `flowchart ${dir}`);
    }
    compileDiagram(code);
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

    if (code.includes('graph ') || code.includes('flowchart ')) {
      let cleanCode = code.replace(/%%\{init:\s*\{\s*["']flowchart["']:\s*\{\s*["']defaultRenderer["']:\s*["'](elk|dagre)["']\s*\}\s*\}\s*\}%%\n?/gi, '');
      code = `%%{init: {"flowchart": {"defaultRenderer": "${renderer}"}}}%%\n` + cleanCode.trimStart();
    }

    compileDiagram(code);
    activeToolbarPopover = 'none';
  }

  function setDiagramFont(fontName: string) {
    selectedFontFamily = fontName;
    changeMermaidTheme(selectedMermaidTheme);
    activeToolbarPopover = 'none';
  }

  function addIconNode(iconName: string) {
    const nextNum = Math.floor(Math.random() * 899) + 100;
    const snippet = `\n  Icon_${nextNum}["${iconName} ${nextNum}"]`;
    code = code + snippet;
    compileDiagram(code);
    activeToolbarPopover = 'none';
  }

  function addImageNode() {
    const nextNum = Math.floor(Math.random() * 899) + 100;
    const imgUrl = customImageUrl.trim() || 'https://mermaid.js.org/favicon.ico';
    const label = customImageLabel.trim() || 'Sample Image';
    const snippet = `\n  Img_${nextNum}["<img src='${imgUrl}' width='60' /><br/>${label}"]`;
    code = code + snippet;
    compileDiagram(code);
    activeToolbarPopover = 'none';
  }

  function toggleAutoLayout() {
    isAutoLayoutEnabled = !isAutoLayoutEnabled;
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
    compileDiagram(code);
  }

  function addVisualNode(type: 'rectangle' | 'rounded' | 'diamond' | 'database' | 'text' | 'subgraph') {
    const nextNum = Math.floor(Math.random() * 899) + 100;
    let snippet = '';

    if (type === 'subgraph') {
      snippet = `\n\nsubgraph Container_${nextNum}[Container ${nextNum}]\n  Group_${nextNum}[Group Node]\nend`;
      code = code + snippet;
      compileDiagram(code);
      return;
    }

    const matches = Array.from(code.matchAll(/([A-Za-z0-9_]+)\s*(\[|\(|\{|\[\()/g));
    const lastNodeId = matches.length > 0 ? matches[matches.length - 1][1] : null;

    if (lastNodeId) {
      if (type === 'rectangle') snippet = `\n  ${lastNodeId} --> Option_${nextNum}[Option ${nextNum}]`;
      if (type === 'rounded') snippet = `\n  ${lastNodeId} --> Continue_${nextNum}(Continue ${nextNum})`;
      if (type === 'diamond') snippet = `\n  ${lastNodeId} --> Evaluate_${nextNum}{Evaluate ${nextNum}?}`;
      if (type === 'database') snippet = `\n  ${lastNodeId} --> Storage_${nextNum}[(Database ${nextNum})]`;
      if (type === 'text') snippet = `\n  ${lastNodeId} -.-> Note_${nextNum}[Note text ${nextNum}]`;
    } else {
      if (type === 'rectangle') snippet = `\n  Node_${nextNum}[Rectangle ${nextNum}]`;
      if (type === 'rounded') snippet = `\n  Process_${nextNum}(Process ${nextNum})`;
      if (type === 'diamond') snippet = `\n  Decision_${nextNum}{Decision ${nextNum}?}`;
      if (type === 'database') snippet = `\n  DB_${nextNum}[(Database ${nextNum})]`;
      if (type === 'text') snippet = `\n  Note_${nextNum}[Note text ${nextNum}]`;
    }

    code = code + snippet;
    compileDiagram(code);
  }

  // Interactive Pan & Zoom Canvas State
  let zoomScale = $state(1.0);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let startPanX = $state(0);
  let startPanY = $state(0);

  $effect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        editorCollapsed = true;
        panX = 0;
      } else {
        panX = editorCollapsed ? 0 : 150;
      }
    }
  });

  function zoomIn() {
    zoomScale = Math.min(3.5, Math.round((zoomScale + 0.15) * 100) / 100);
  }

  function zoomOut() {
    zoomScale = Math.max(0.3, Math.round((zoomScale - 0.15) * 100) / 100);
  }

  function resetZoom() {
    zoomScale = 1.0;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    panX = isMobile ? 0 : (editorCollapsed ? 0 : 150);
    panY = 0;
  }

  // AI Voice & Text Copilot State (Gated for Auth)
  let aiChatOpen = $state(false);
  let aiPrompt = $state('');
  let isListening = $state(false);
  let aiGenerating = $state(false);
  let speechRecognitionInstance: any = null;
  let chatMessages = $state<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Diagram Copilot. Describe any diagram or modification in natural language or tap the Mic button for hands-free voice input!',
      time: 'Just now',
    },
  ]);

  function openAiChat() {
    if (!data?.session) {
      authModalOpen = true;
      return;
    }
    aiChatOpen = !aiChatOpen;
  }

  function toggleVoiceInput() {
    if (!data?.session) {
      authModalOpen = true;
      return;
    }

    if (isListening) {
      if (speechRecognitionInstance) {
        speechRecognitionInstance.stop();
      }
      isListening = false;
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRecognition) {
      alert('Web Speech Recognition API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        aiPrompt = transcript;
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
      };

      recognition.onend = () => {
        isListening = false;
      };

      speechRecognitionInstance = recognition;
      recognition.start();
    } catch (e) {
      console.error('Voice input error:', e);
      isListening = false;
    }
  }

  async function handleSendAiPrompt(promptText?: string) {
    const query = promptText || aiPrompt;
    if (!query.trim()) return;

    if (!data?.session) {
      authModalOpen = true;
      return;
    }

    const userMsg = query.trim();
    aiPrompt = '';
    chatMessages = [
      ...chatMessages,
      { role: 'user', text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ];
    aiGenerating = true;

    setTimeout(() => {
      let updatedDiagram = code;
      let replyMessage = '';

      const lower = userMsg.toLowerCase();
      if (lower.includes('sequence') || lower.includes('auth')) {
        updatedDiagram = `sequenceDiagram\n  autonumber\n  actor Client\n  participant Auth as Supabase Auth\n  participant DB as Postgres RLS\n  Client->>Auth: Login Request\n  Auth-->>Client: JWT Session Token\n  Client->>DB: Query with RLS Token`;
        replyMessage = 'I updated your diagram to a sequence authentication flow!';
      } else if (lower.includes('microservice') || lower.includes('cloud')) {
        updatedDiagram = `graph TD\n  Gateway[API Gateway] --> Auth[Auth Service]\n  Gateway --> Payment[Payment Service]\n  Gateway --> Order[Order Service]\n  Payment --> DB[(Database Cluster)]`;
        replyMessage = 'Generated a microservices architecture diagram!';
      } else if (lower.includes('dark') || lower.includes('theme')) {
        changeMermaidTheme('dark');
        replyMessage = 'Switched diagram theme to Dark!';
      } else if (lower.includes('add') || lower.includes('database')) {
        updatedDiagram += `\n  DB_Cluster[(Database Cluster)]`;
        replyMessage = 'Added database cluster node to your current diagram!';
      } else {
        updatedDiagram += `\n  AI_Node[AI Process: ${userMsg.slice(0, 20)}...]`;
        replyMessage = `Added node "${userMsg.slice(0, 30)}" to your diagram!`;
      }

      code = updatedDiagram;
      compileDiagram(code);
      chatMessages = [
        ...chatMessages,
        { role: 'assistant', text: replyMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ];
      aiGenerating = false;
    }, 900);
  }

  let isCanvasFullscreen = $state(false);
  let activeInteractionMode = $state<'select' | 'pan'>('select');

  function toggleCanvasFullscreen() {
    isCanvasFullscreen = !isCanvasFullscreen;
    if (typeof document !== 'undefined') {
      if (isCanvasFullscreen) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }
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

  const cloneCommand = 'git clone https://github.com/oznerta/TxtGrph.git';

  let lineNumbers = $derived(
    Array.from({ length: Math.max(1, code.split('\n').length) }, (_, i) => i + 1)
  );

  let filteredPresets = $derived(
    presets.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  onMount(() => {
    try {
      mermaid.parseError = () => {};
      changeMermaidTheme('dark');
    } catch (e) {
      console.error('Mermaid init error:', e);
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        isCanvasFullscreen = false;
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        commandPaletteOpen = !commandPaletteOpen;
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        commandPaletteOpen = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  async function compileDiagram(sourceCode: string) {
    if (!browser) return;
    isRendering = true;
    renderError = null;
    const startTime = performance.now();
    const renderId = 'playground-mermaid-' + Math.random().toString(36).substring(2, 9);

    try {
      const isValid = await mermaid.parse(sourceCode, { suppressErrors: true });
      if (!isValid) {
        throw new Error('Invalid Mermaid syntax structure');
      }
      const { svg } = await mermaid.render(renderId, sourceCode);
      renderedSvg = svg;
      renderTimeMs = Math.round((performance.now() - startTime) * 10) / 10;
    } catch (err: any) {
      renderError = err.message || 'Syntax error in Mermaid diagram';
    } finally {
      isRendering = false;
      const errEl = document.getElementById(renderId) || document.getElementById('d' + renderId);
      if (errEl) errEl.remove();
      document.querySelectorAll('svg[id^="dplayground-mermaid-"]').forEach((el) => el.remove());
    }
  }

  function handlePresetSelect(preset: any) {
    selectedPreset = preset;
    code = preset.code;
    compileDiagram(preset.code);
    commandPaletteOpen = false;
  }

  function handleLessonSelect(lesson: any) {
    selectedLesson = lesson;
    code = lesson.code;
    compileDiagram(lesson.code);
  }

  function handleCodeInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    code = target.value;
    compileDiagram(code);
  }

  function resetPreset() {
    code = selectedPreset.code;
    compileDiagram(code);
  }

  async function copyCodeToClipboard() {
    try {
      await navigator.clipboard.writeText(code);
      copiedCode = true;
      setTimeout(() => (copiedCode = false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed', err);
    }
  }

  async function copyCloneCommand() {
    try {
      await navigator.clipboard.writeText(cloneCommand);
      copiedCloneCmd = true;
      setTimeout(() => (copiedCloneCmd = false), 2000);
    } catch (err) {
      console.error('Copy clone command failed', err);
    }
  }

  function handleExport(format: 'svg' | 'png' | 'jpeg' | 'mmd' | 'md' | 'copy-svg') {
    if (!data.session) {
      authModalReason = `Export diagram as ${format.toUpperCase()}`;
      authModalOpen = true;
      exportDropdownOpen = false;
      return;
    }

    const baseFilename = selectedPreset.filename.replace('.mmd', '');

    if (format === 'svg') {
      const blob = new Blob([renderedSvg], { type: 'image/svg+xml' });
      downloadBlob(blob, `${baseFilename}.svg`);
    } else if (format === 'mmd') {
      const blob = new Blob([code], { type: 'text/plain' });
      downloadBlob(blob, `${baseFilename}.mmd`);
    } else if (format === 'md') {
      const mdContent = `# ${selectedPreset.name}\n\n\`\`\`mermaid\n${code}\n\`\`\`\n`;
      const blob = new Blob([mdContent], { type: 'text/markdown' });
      downloadBlob(blob, `${baseFilename}.md`);
    } else if (format === 'copy-svg') {
      navigator.clipboard.writeText(renderedSvg);
      copySvgSuccess = true;
      setTimeout(() => (copySvgSuccess = false), 2000);
    } else if (format === 'png' || format === 'jpeg') {
      rasterizeSvgToImage(renderedSvg, format, `${baseFilename}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    }

    exportDropdownOpen = false;
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

  function triggerGatedFeature(actionName: string) {
    if (data.session) {
      if (actionName === 'export') {
        const blob = new Blob([renderedSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedPreset.filename.replace('.mmd', '.svg');
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      authModalReason = actionName === 'export'
        ? 'Export High-Res SVG Vectors'
        : actionName === 'save'
          ? 'Save Diagrams to Workspace Folders'
          : 'Generate Shareable URL Links';
      authModalOpen = true;
    }
  }
</script>

<svelte:head>
  <title>TxtGrph · Open Source Diagramming-as-Code Platform</title>
  <meta
    name="description"
    content="Write, preview, organize, and share Mermaid-syntax diagrams in real-time. Open source repository on GitHub: oznerta/TxtGrph."
  />
</svelte:head>

<div class="min-h-screen bg-[#000000] text-[#F5F5F7] font-['Public_Sans',sans-serif] selection:bg-white/20 selection:text-white relative overflow-x-hidden">
  <!-- Soft Continuous Radial Background Glow -->
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[900px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06)_0%,rgba(156,122,49,0.04)_40%,transparent_70%)] pointer-events-none -z-10"></div>

  <!-- Apple Minimalist Floating Dock Navbar with Highlighted GitHub Badge & Auth -->
  <div class="fixed top-4 sm:top-6 inset-x-0 z-50 px-3 sm:px-4 pointer-events-none">
    <header class="max-w-4xl mx-auto pointer-events-auto h-12 sm:h-13 px-3.5 sm:px-5 rounded-full border border-white/10 bg-black/70 backdrop-blur-2xl shadow-2xl flex items-center justify-between transition-all">
      <a href="/" class="flex items-center gap-2 sm:gap-2.5 group shrink-0">
        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
          <img src="/assets/logo-short-dark.png" alt="TxtGrph Logo" class="w-full h-full object-contain" />
        </div>
        <span class="font-['Instrument_Sans',sans-serif] text-[15px] sm:text-[17px] font-semibold tracking-[-0.02em] text-white">
          TxtGrph
        </span>
      </a>

      <!-- Center Nav Links (Desktop) -->
      <nav class="hidden md:flex items-center gap-7 text-[13px] font-medium text-white/70">
        <a href="#playground" class="hover:text-white transition-colors">Playground</a>
        <a href="#how-it-works" class="hover:text-white transition-colors">How It Works</a>
        <a href="#features" class="hover:text-white transition-colors">Features</a>
      </nav>

      <!-- Right Controls: GitHub Icon & Sign In / Workspace Link -->
      <div class="flex items-center gap-3 sm:gap-4 shrink-0 font-['Public_Sans',sans-serif]">
        <a
          href="https://github.com/oznerta/TxtGrph"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub Repository"
          class="p-1 rounded-full text-white/60 hover:text-white transition-colors"
        >
          <Github size={17} />
        </a>

        {#if data?.session}
          <a
            href="/workspace"
            class="inline-flex items-center justify-center h-8 sm:h-8.5 px-4 text-[12px] font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-sm"
          >
            <span>Workspace</span>
          </a>
        {:else}
          <a
            href="/auth"
            class="inline-flex items-center justify-center h-8 sm:h-8.5 px-4 text-[12px] font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-sm"
          >
            <span>Sign In</span>
          </a>
        {/if}
      </div>
    </header>
  </div>

  <!-- Hero Section -->
  <section class="px-4 pt-32 pb-20 sm:pt-44 sm:pb-32 max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
    <!-- GitHub Repo Hero Pill Badge -->
    <a
      href="https://github.com/oznerta/TxtGrph"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-white/90 text-[11px] sm:text-[12px] font-['IBM_Plex_Mono',monospace] hover:bg-white/[0.08] transition-all group max-w-[calc(100vw-2rem)] truncate"
    >
      <Github size={14} class="text-white shrink-0" />
      <span class="truncate">Open Source on GitHub · <strong>oznerta/TxtGrph</strong></span>
      <ArrowRight size={13} class="group-hover:translate-x-0.5 transition-transform text-white/60 shrink-0" />
    </a>

    <div class="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      <h1 class="font-['Instrument_Sans',sans-serif] text-[34px] xs:text-[42px] sm:text-[68px] md:text-[84px] leading-[1.04] sm:leading-[0.98] font-semibold tracking-[-0.04em] text-white [text-wrap:balance]">
        Visual Thinking. Engineered in Text.
      </h1>
      <p class="text-[16px] sm:text-[20px] md:text-[22px] leading-[26px] sm:leading-[34px] text-white/60 max-w-2xl mx-auto font-normal [text-wrap:balance]">
        Turn ideas into clear, version-controlled Mermaid diagrams in real time. Fast, distraction-free, and powered by private BYOK AI.
      </p>
    </div>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
      <a
        href="/playground"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 text-[14px] font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-lg"
      >
        <span>Try Live Editor</span>
        <ArrowRight size={15} />
      </a>
      <a
        href="https://github.com/oznerta/TxtGrph"
        target="_blank"
        rel="noopener noreferrer"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 text-[14px] font-medium rounded-full border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all"
      >
        <Github size={16} />
        <span>Star Repository</span>
      </a>
    </div>
  </section>

  <!-- Section 1: Live Interactive Playground Showcase -->
  <section id="playground" class="px-4 pb-32 max-w-6xl mx-auto w-full space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="space-y-2">
        <h2 class="font-['Instrument_Sans',sans-serif] text-[32px] sm:text-[44px] font-semibold text-white tracking-[-0.035em]">
          Interactive Playground
        </h2>
        <p class="text-[14px] text-white/50">Edit syntax on the left, watch live client-side SVG compile on the right.</p>
      </div>

      <a
        href="/playground"
        class="hidden sm:inline-flex items-center gap-2 px-4.5 py-2 text-[12.5px] font-medium rounded-full border border-white/20 bg-white text-black hover:bg-white/90 transition-all shadow-lg cursor-pointer font-['IBM_Plex_Mono',monospace]"
      >
        <span>Open Editor</span>
        <ArrowRight size={14} />
      </a>
    </div>

    <!-- Apple Container - 100% Full-Bleed Infinite Canvas Workspace -->
    <div class="rounded-[20px] sm:rounded-[28px] h-[520px] sm:h-[640px] border border-white/10 bg-[#0E0F12] shadow-2xl overflow-hidden relative transition-all duration-300">
      <!-- Floating Top-Right Single Actions Icon Button (Desktop Only) -->
      <div class="hidden sm:block absolute top-6 right-6 z-40 font-['IBM_Plex_Mono',monospace]">
        <div class="relative">
          <button
            onclick={() => (actionsMenuOpen = !actionsMenuOpen)}
            title="Canvas Actions, Templates, Saving & Export"
            class="p-2.5 rounded-2xl border border-white/20 bg-[#12141C]/90 backdrop-blur-xl hover:bg-[#1E2132] text-white transition-all shadow-xl cursor-pointer flex items-center gap-2 group"
          >
            <FolderKanban size={18} class="text-amber-400 group-hover:scale-110 transition-transform" />
            <ChevronDown size={14} class="text-white/60 transition-transform {actionsMenuOpen ? 'rotate-180' : ''}" />
          </button>

          {#if actionsMenuOpen}
            <div class="absolute right-0 mt-3 w-60 rounded-[18px] bg-[#161822] border border-white/20 shadow-2xl p-2 z-50 text-[12px] space-y-1 text-left font-['IBM_Plex_Mono',monospace] select-none">
              <div class="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Canvas Actions</div>
              
              <button
                onclick={() => { templatesModalOpen = true; actionsMenuOpen = false; }}
                class="w-full px-3 py-2 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors"
              >
                <div class="flex items-center gap-2.5">
                  <BookOpen size={15} class="text-amber-400" />
                  <span>Templates</span>
                </div>
              </button>

              <button
                onclick={() => { triggerGatedFeature('save'); actionsMenuOpen = false; }}
                class="w-full px-3 py-2 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors"
              >
                <div class="flex items-center gap-2.5">
                  <FolderPlus size={15} class="text-blue-400" />
                  <span>Save to Workspace</span>
                </div>
                {#if !data?.session}
                  <Lock size={12} class="text-amber-400" />
                {/if}
              </button>

              <button
                onclick={() => { triggerGatedFeature('share'); actionsMenuOpen = false; }}
                class="w-full px-3 py-2 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors"
              >
                <div class="flex items-center gap-2.5">
                  <Share2 size={15} class="text-emerald-400" />
                  <span>Share Link</span>
                </div>
                {#if !data?.session}
                  <Lock size={12} class="text-amber-400" />
                {/if}
              </button>

              <div class="my-1 border-t border-white/10"></div>
              <div class="px-3 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Export Diagram</div>

              <button
                onclick={() => { handleExport('svg'); actionsMenuOpen = false; }}
                class="w-full px-3 py-1.5 rounded-[8px] flex items-center justify-between text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>Vector SVG (.svg)</span>
                {#if !data?.session}<Lock size={11} class="text-white/40" />{/if}
              </button>
              <button
                onclick={() => { handleExport('png'); actionsMenuOpen = false; }}
                class="w-full px-3 py-1.5 rounded-[8px] flex items-center justify-between text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>PNG Image (.png)</span>
                {#if !data?.session}<Lock size={11} class="text-white/40" />{/if}
              </button>
              <button
                onclick={() => { handleExport('jpeg'); actionsMenuOpen = false; }}
                class="w-full px-3 py-1.5 rounded-[8px] flex items-center justify-between text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>JPEG Image (.jpg)</span>
                {#if !data?.session}<Lock size={11} class="text-white/40" />{/if}
              </button>
              <button
                onclick={() => { handleExport('mmd'); actionsMenuOpen = false; }}
                class="w-full px-3 py-1.5 rounded-[8px] flex items-center justify-between text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>Mermaid Code (.mmd)</span>
                {#if !data?.session}<Lock size={11} class="text-white/40" />{/if}
              </button>
              <button
                onclick={() => { handleExport('md'); actionsMenuOpen = false; }}
                class="w-full px-3 py-1.5 rounded-[8px] flex items-center justify-between text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>Markdown Block (.md)</span>
                {#if !data?.session}<Lock size={11} class="text-white/40" />{/if}
              </button>
              <button
                onclick={() => { handleExport('copy-svg'); actionsMenuOpen = false; }}
                class="w-full px-3 py-1.5 rounded-[8px] flex items-center justify-between text-amber-300 font-semibold hover:bg-white/10 transition-colors"
              >
                <span>{copySvgSuccess ? 'Copied SVG!' : 'Copy SVG Markup'}</span>
                {#if !data?.session}<Lock size={11} class="text-amber-400/70" />{/if}
              </button>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- SVG Canvas Render Container with Interactive Pan & Zoom -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        onmousedown={startPan}
        onmousemove={onPanMove}
        onmouseup={endPan}
        onmouseleave={endPan}
        oncontextmenu={(e) => e.preventDefault()}
        onwheel={handleCanvasWheel}
        role="region"
        tabindex="0"
        aria-label="Interactive Diagram Canvas"
        class="w-full h-full p-6 relative flex flex-col items-center justify-center overflow-hidden select-none transition-all duration-200 {isPanning ? 'cursor-grabbing' : (activeInteractionMode === 'pan' ? 'cursor-grab' : 'cursor-default')}"
        style={canvasMode === 'dark'
          ? (canvasPattern === 'dots'
              ? 'background-color: #0B0C10; background-image: radial-gradient(rgba(255, 255, 255, 0.22) 1.2px, transparent 1.2px); background-size: 20px 20px;'
              : canvasPattern === 'grid'
              ? 'background-color: #0B0C10; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px); background-size: 24px 24px;'
              : canvasPattern === 'crosses'
              ? 'background-color: #0B0C10; background-image: radial-gradient(rgba(255, 255, 255, 0.3) 1.5px, transparent 1.5px); background-size: 28px 28px;'
              : 'background-color: #0B0C10;')
          : (canvasPattern === 'dots'
              ? 'background-color: #F8FAFC; background-image: radial-gradient(rgba(0, 0, 0, 0.25) 1.2px, transparent 1.2px); background-size: 20px 20px;'
              : canvasPattern === 'grid'
              ? 'background-color: #F8FAFC; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 1px, transparent 1px); background-size: 24px 24px;'
              : canvasPattern === 'crosses'
              ? 'background-color: #F8FAFC; background-image: radial-gradient(rgba(0, 0, 0, 0.35) 1.5px, transparent 1.5px); background-size: 28px 28px;'
              : 'background-color: #F8FAFC;')}
      >
        <!-- Mobile Interactive Playground Lock Overlay with CTA Button -->
        <div class="sm:hidden absolute inset-0 z-30 flex flex-col items-center justify-end p-5 bg-gradient-to-t from-[#0E0F12] via-[#0E0F12]/40 to-transparent pointer-events-none">
          <a
            href="/playground"
            class="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 bg-[#12141C]/90 backdrop-blur-xl text-white hover:bg-white hover:text-black font-medium text-[13px] shadow-2xl transition-all font-['Public_Sans',sans-serif] active:scale-95"
          >
            <span>Open Playground</span>
            <ArrowRight size={14} />
          </a>
        </div>

        <!-- Floating Code Editor Card (Floating & Freely Resizable over Canvas - Desktop Only) -->
        {#if !editorCollapsed}
          <div
            class="hidden sm:flex absolute z-[60] top-6 left-6 w-[330px] h-[510px] min-w-[280px] min-h-[200px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-6rem)] flex-col rounded-2xl bg-[#0E1017]/95 border border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] font-['IBM_Plex_Mono',monospace] resize overflow-hidden select-none hover:border-white/25 transition-colors"
          >
            <!-- Card Header -->
            <div class="h-11 px-3.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
              <div class="flex items-center gap-2.5">
                <div class="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Code size={14} class="text-amber-400" />
                </div>
                <span class="text-[13px] font-semibold text-white tracking-wide">Code Editor</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60 font-medium">Mermaid</span>
              </div>

              <!-- Header Control Button ('X' Close Button Only) -->
              <button
                onclick={() => (editorCollapsed = true)}
                title="Close Code Editor"
                class="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <!-- Code Input & Line Numbers Container (Seamless, No Hard Line) -->
            <div class="flex-1 flex font-['IBM_Plex_Mono',monospace] text-[13px] leading-[22px] overflow-hidden bg-[#0A0B0E]/90 relative">
              <!-- Seamless Line Numbers (No Vertical Border Line) -->
              <div class="py-3.5 pl-3.5 pr-2 text-right text-white/20 select-none min-w-[36px] text-[12px] leading-[22px] overflow-y-hidden shrink-0">
                {#each lineNumbers as lineNum}
                  <div>{lineNum}</div>
                {/each}
              </div>

              <!-- Textarea with True Horizontal & Vertical Scroll -->
              <textarea
                bind:value={code}
                oninput={handleCodeInput}
                spellcheck="false"
                wrap="off"
                class="flex-1 py-3.5 pr-4 pl-1 bg-transparent text-[13px] leading-[22px] text-white/90 focus:outline-none font-['IBM_Plex_Mono',monospace] custom-scrollbar overflow-x-auto overflow-y-auto whitespace-pre w-full h-full cursor-text"
                placeholder="Type Mermaid syntax here..."
              ></textarea>
            </div>
          </div>
        {:else}
          <!-- Floating Expand Code Button (When Collapsed - Desktop Only) -->
          <button
            onclick={() => (editorCollapsed = false)}
            class="hidden sm:inline-flex absolute top-6 left-6 z-40 items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#12141C]/90 border border-white/15 backdrop-blur-xl text-white hover:bg-[#1E2132] transition-all shadow-2xl text-[13px] font-semibold font-['IBM_Plex_Mono',monospace] cursor-pointer"
          >
            <Code size={16} class="text-amber-400" />
            <span>Code Editor</span>
          </button>
        {/if}

        <!-- High-Visibility Floating Canvas Error Banner (Top-Center, Above All Tools) -->
        {#if renderError}
          <div class="absolute top-6 inset-x-0 z-[75] flex justify-center pointer-events-none px-4">
            <div class="pointer-events-auto max-w-xl w-full px-4.5 py-3 rounded-2xl bg-[#1A0B0E]/95 border border-red-500/40 shadow-2xl backdrop-blur-xl text-red-200 text-[12.5px] font-['IBM_Plex_Mono',monospace] flex items-start gap-3 animate-in fade-in duration-150 select-text">
              <div class="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle size={14} />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-red-300 text-[12px] mb-0.5">Mermaid Syntax Error</div>
                <div class="text-[11.5px] text-red-200/90 leading-relaxed break-words max-h-32 overflow-y-auto custom-scrollbar select-text selection:bg-red-500/30 selection:text-white">
                  {renderError}
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  onclick={() => navigator.clipboard.writeText(renderError || '')}
                  class="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 hover:text-white hover:bg-red-500/30 transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  title="Copy error message to clipboard"
                >
                  <Copy size={12} />
                  <span>Copy</span>
                </button>
                <button
                  onclick={() => (renderError = null)}
                  class="p-1.5 rounded-lg text-red-300/60 hover:text-red-200 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss Error"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        {/if}

        <!-- Floating AI Action Pill (Desktop Only, Bottom-Left Canvas) -->
        <div class="hidden sm:flex absolute bottom-6 left-6 z-40">
          <button
            onclick={openAiChat}
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-[#161824]/90 hover:bg-[#1E2132] backdrop-blur-xl text-white transition-all cursor-pointer font-['IBM_Plex_Mono',monospace] text-[13px] font-semibold shadow-xl group"
            title={data?.session ? 'Open Mermaid AI Studio Workspace' : 'Sign in required for Mermaid AI'}
          >
            <div class="w-5.5 h-5.5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles size={14} class="text-amber-400 animate-pulse" />
            </div>
            <span>Use AI</span>
            {#if !data?.session}
              <Lock size={10} class="text-amber-400 ml-0.5" />
            {/if}
          </button>
        </div>

        <!-- Floating Visual Editor Toolbar (Desktop Only) -->
        <div class="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-40 items-center gap-2 p-2 rounded-2xl border border-white/20 bg-[#12141C]/95 backdrop-blur-xl text-white/80 shadow-2xl select-none transition-all duration-300">
          <!-- 1. Hand / Pan Mode Button -->
          <button
            onclick={() => (activeInteractionMode = activeInteractionMode === 'pan' ? 'select' : 'pan')}
            title="Pan Canvas Mode (Hand / Hold Right-Click)"
            class="p-1.5 sm:p-2 rounded-xl transition-all hover:scale-105 active:scale-95 {activeInteractionMode === 'pan' || isPanning ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
          >
            <Hand size={17} />
          </button>

          <!-- 2. Diagram Theme, Custom Themes, Diagram Style & Diagram Font Popover Trigger -->
          <div class="relative">
            <button
              onclick={() => toggleToolbarPopover('theme')}
              title="Theme, Custom Colors, Styles & Fonts"
              class="p-1.5 sm:p-2 rounded-xl transition-all hover:scale-105 active:scale-95 {activeToolbarPopover === 'theme' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
            >
              <Palette size={17} />
            </button>

            <!-- Complete Theme Dropdown (Opens Upwards Centered) -->
            {#if activeToolbarPopover === 'theme'}
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-4 rounded-[20px] bg-[#161822] border border-white/20 shadow-2xl space-y-4 text-left font-['IBM_Plex_Mono',monospace] z-50">
                <!-- Light vs Dark Mode Toggle Header -->
                <div class="flex items-center justify-between pb-2 border-b border-white/10">
                  <span class="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Canvas Mode</span>
                  <div class="flex items-center p-0.5 rounded-full bg-white/5 border border-white/10">
                    <button
                      onclick={() => toggleCanvasMode('dark')}
                      class="px-2.5 py-1 rounded-full text-[10px] transition-colors flex items-center gap-1.5 {canvasMode === 'dark' ? 'bg-white/20 text-white font-bold' : 'text-white/40 hover:text-white'}"
                    >
                      <Moon size={11} class="text-blue-400" />
                      <span>Dark</span>
                    </button>
                    <button
                      onclick={() => toggleCanvasMode('light')}
                      class="px-2.5 py-1 rounded-full text-[10px] transition-colors flex items-center gap-1.5 {canvasMode === 'light' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}"
                    >
                      <Sun size={11} class="text-amber-500" />
                      <span>Light</span>
                    </button>
                  </div>
                </div>

                <!-- Expanded Diagram Theme Color Presets -->
                <div>
                  <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Diagram theme</div>
                  <div class="grid grid-cols-4 gap-2">
                    <button
                      onclick={() => { changeMermaidTheme('dark'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#0D0E12] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'dark' ? 'ring-2 ring-blue-500' : ''}"
                      title="Dark Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-[#1E2538] border border-white/60"></span>
                      <span class="text-[9px] text-white/60 mt-1">Dark</span>
                    </button>
                    <button
                      onclick={() => { changeMermaidTheme('forest'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#0E1A14] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'forest' ? 'ring-2 ring-emerald-500' : ''}"
                      title="Forest Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-emerald-500"></span>
                      <span class="text-[9px] text-white/60 mt-1">Forest</span>
                    </button>
                    <button
                      onclick={() => { changeMermaidTheme('neutral'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#1C1D24] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'neutral' ? 'ring-2 ring-purple-400' : ''}"
                      title="Neutral Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-purple-400"></span>
                      <span class="text-[9px] text-white/60 mt-1">Neutral</span>
                    </button>
                    <button
                      onclick={() => { changeMermaidTheme('base'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#252836] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'base' ? 'ring-2 ring-amber-400' : ''}"
                      title="Base Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-amber-400"></span>
                      <span class="text-[9px] text-white/60 mt-1">Base</span>
                    </button>
                    <button
                      onclick={() => { changeMermaidTheme('default'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#F1F5F9] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'default' ? 'ring-2 ring-slate-400' : ''}"
                      title="Default Light Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-slate-700"></span>
                      <span class="text-[9px] text-black/70 mt-1">Light</span>
                    </button>
                    <button
                      onclick={() => { changeMermaidTheme('ocean'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#0A192F] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'ocean' ? 'ring-2 ring-cyan-400' : ''}"
                      title="Ocean Cyan Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-cyan-400"></span>
                      <span class="text-[9px] text-white/60 mt-1">Ocean</span>
                    </button>
                    <button
                      onclick={() => { changeMermaidTheme('rose'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#1F0E17] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'rose' ? 'ring-2 ring-rose-400' : ''}"
                      title="Rose Sunset Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-rose-400"></span>
                      <span class="text-[9px] text-white/60 mt-1">Rose</span>
                    </button>
                    <button
                      onclick={() => { changeMermaidTheme('monochrome'); activeToolbarPopover = 'none'; }}
                      class="p-2 rounded-xl border border-white/15 bg-[#000000] flex flex-col items-center justify-center hover:scale-105 transition-transform {selectedMermaidTheme === 'monochrome' ? 'ring-2 ring-white' : ''}"
                      title="Monochrome Theme"
                    >
                      <span class="w-4 h-4 rounded-full bg-white"></span>
                      <span class="text-[9px] text-white/60 mt-1">Mono</span>
                    </button>
                  </div>
                </div>

                <!-- Repeatable Background Grid Options -->
                <div>
                  <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Canvas background pattern</div>
                  <div class="grid grid-cols-4 gap-1.5">
                    <button
                      onclick={() => (canvasPattern = 'dots')}
                      class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'dots' ? 'bg-white/20 font-bold border-white/40' : ''}"
                      title="Dots Grid"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-white"></span> Dots
                    </button>
                    <button
                      onclick={() => (canvasPattern = 'grid')}
                      class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'grid' ? 'bg-white/20 font-bold border-white/40' : ''}"
                      title="Grid Lines"
                    >
                      <span class="text-[11px] font-mono leading-none">#</span> Grid
                    </button>
                    <button
                      onclick={() => (canvasPattern = 'crosses')}
                      class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'crosses' ? 'bg-white/20 font-bold border-white/40' : ''}"
                      title="Crosses Grid"
                    >
                      <span class="text-[11px] font-mono leading-none">+</span> Cross
                    </button>
                    <button
                      onclick={() => (canvasPattern = 'solid')}
                      class="px-2 py-1.5 rounded-lg border border-white/15 text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'solid' ? 'bg-white/20 font-bold border-white/40' : ''}"
                      title="Plain Solid"
                    >
                      <span class="w-2 h-2 border border-white/60 rounded-sm"></span> Solid
                    </button>
                  </div>
                </div>

                <!-- Diagram Font -->
                <div>
                  <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Diagram font</div>
                  <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                    <button
                      onclick={() => setDiagramFont('Public Sans, sans-serif')}
                      class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-sans transition-colors cursor-pointer {selectedFontFamily.includes('Public Sans') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                    >
                      Aa Sans
                    </button>
                    <button
                      onclick={() => setDiagramFont('IBM Plex Mono, monospace')}
                      class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-mono transition-colors cursor-pointer {selectedFontFamily.includes('IBM Plex Mono') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                    >
                      Aa Mono
                    </button>
                    <button
                      onclick={() => setDiagramFont('Playfair Display, serif')}
                      class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-serif transition-colors cursor-pointer {selectedFontFamily.includes('Playfair Display') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                    >
                      Aa Serif
                    </button>
                    <button
                      onclick={() => setDiagramFont('Inter, sans-serif')}
                      class="px-2.5 py-1 rounded-lg border text-[11px] text-white font-sans transition-colors cursor-pointer {selectedFontFamily.includes('Inter') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                    >
                      Aa Inter
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <div class="w-[1px] h-5 bg-white/15 mx-0.5"></div>

          <!-- 3. Auto-Layout Horizontal Switch Toggle -->
          <button
            onclick={toggleAutoLayout}
            title="Auto-Layout Toggle ({isAutoLayoutEnabled ? 'On' : 'Off'})"
            class="flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
          >
            <span class="hidden sm:inline-block text-[12px] font-semibold text-white/90 group-hover:text-white tracking-tight">Auto-Layout</span>
            <div class="w-7 h-4 sm:w-8 sm:h-4.5 rounded-full p-0.5 border transition-colors flex items-center {isAutoLayoutEnabled ? 'bg-[#2A7588] border-[#3891A6]' : 'bg-white/10 border-white/20'}">
              <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white shadow-md transition-transform duration-200 {isAutoLayoutEnabled ? 'translate-x-3 sm:translate-x-3.5' : 'translate-x-0'}"></div>
            </div>
          </button>

          <!-- 4. Conditional Controls: Auto-Layout ON (Direction & Engine) vs OFF (Manual Alignment) -->
          {#if isAutoLayoutEnabled}
            <div class="w-[1px] h-6 bg-white/15 mx-0.5"></div>

            <!-- Direction Popover Trigger (Arrow Dropdown) -->
            <div class="relative">
              <button
                onclick={() => toggleToolbarPopover('direction')}
                title="Flowchart Layout Direction"
                class="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center {activeToolbarPopover === 'direction' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
              >
                {#if currentDirection === 'TD'}<ArrowDown size={18} />{/if}
                {#if currentDirection === 'BT'}<ArrowUp size={18} />{/if}
                {#if currentDirection === 'LR'}<ArrowRight size={18} />{/if}
                {#if currentDirection === 'RL'}<ArrowLeft size={18} />{/if}
              </button>

              <!-- Direction Popover Dropdown (Opens Upwards Centered) -->
              {#if activeToolbarPopover === 'direction'}
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-1 rounded-[14px] bg-[#161822] border border-white/20 shadow-2xl text-left font-['IBM_Plex_Mono',monospace] z-50 text-[12px] space-y-0.5">
                  <button
                    onclick={() => setDirection('TD')}
                    class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'TD' ? 'bg-white/15 font-semibold' : ''}"
                  >
                    <ArrowDown size={14} />
                    <span>Top to bottom</span>
                  </button>
                  <button
                    onclick={() => setDirection('BT')}
                    class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'BT' ? 'bg-white/15 font-semibold' : ''}"
                  >
                    <ArrowUp size={14} />
                    <span>Bottom to top</span>
                  </button>
                  <button
                    onclick={() => setDirection('LR')}
                    class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'LR' ? 'bg-white/15 font-semibold' : ''}"
                  >
                    <ArrowRight size={14} />
                    <span>Left to right</span>
                  </button>
                  <button
                    onclick={() => setDirection('RL')}
                    class="w-full px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'RL' ? 'bg-white/15 font-semibold' : ''}"
                  >
                    <ArrowLeft size={14} />
                    <span>Right to left</span>
                  </button>
                </div>
              {/if}
            </div>

            <div class="w-[1px] h-6 bg-white/15 mx-0.5"></div>

            <!-- Layout Algorithm Popover Trigger (Hierarchical vs Adaptive) -->
            <div class="relative">
              <button
                onclick={() => toggleToolbarPopover('layout')}
                title="Layout Engine Algorithm"
                class="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 {activeToolbarPopover === 'layout' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
              >
                <GitFork size={18} />
              </button>

              <!-- Layout Algorithm Popover Dropdown (Opens Upwards Centered) -->
              {#if activeToolbarPopover === 'layout'}
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 rounded-[16px] bg-[#161822] border border-white/20 shadow-2xl overflow-hidden font-['IBM_Plex_Mono',monospace] z-50 text-[12px] text-left select-none">
                  <div class="px-3.5 py-2.5 text-[11px] font-medium text-[#7E88A8] border-b border-white/10 bg-white/5">
                    Layout
                  </div>
                  <div class="p-1 space-y-0.5">
                    <button
                      onclick={() => setLayoutAlgorithm('hierarchical')}
                      class="w-full px-3 py-2 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors {currentLayoutAlgorithm === 'hierarchical' ? 'bg-white/15 font-semibold' : ''}"
                    >
                      <div class="flex items-center gap-2.5">
                        <GitFork size={16} class="text-white/80" />
                        <span>Hierarchical</span>
                      </div>
                      {#if currentLayoutAlgorithm === 'hierarchical'}<Check size={14} class="text-white/90" />{/if}
                    </button>
                    <button
                      onclick={() => setLayoutAlgorithm('adaptive')}
                      class="w-full px-3 py-2 rounded-[10px] flex items-center justify-between text-white hover:bg-white/10 transition-colors {currentLayoutAlgorithm === 'adaptive' ? 'bg-white/15 font-semibold' : ''}"
                    >
                      <div class="flex items-center gap-2.5">
                        <Network size={16} class="text-white/80" />
                        <span>Adaptive</span>
                      </div>
                      {#if currentLayoutAlgorithm === 'adaptive'}<Check size={14} class="text-white/90" />{/if}
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Floating Canvas Zoom Bar (Mobile Responsive) -->
        <div class="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-white/20 bg-[#12141C]/95 backdrop-blur-xl text-[12px] font-['IBM_Plex_Mono',monospace] text-white/90 shadow-2xl select-none">
          <button
            onclick={zoomOut}
            title="Zoom Out"
            class="p-2 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onclick={resetZoom}
            title="Reset Zoom Scale"
            class="px-2.5 py-1 rounded-xl hover:bg-white/15 text-white font-bold tracking-wide transition-all hover:scale-105 active:scale-95 min-w-[50px] text-center cursor-pointer"
          >
            {Math.round(zoomScale * 100)}%
          </button>
          <button
            onclick={zoomIn}
            title="Zoom In"
            class="p-2 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onclick={resetZoom}
            title="Reset Pan & Position"
            class="p-2 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 border-l border-white/15 ml-0.5 pl-2.5 cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>

          {#if renderedSvg}
            <div
              class="w-full h-full flex items-center justify-center origin-center [&_svg]:max-w-full [&_svg]:h-auto [shape-rendering:geometricPrecision] [text-rendering:geometricPrecision]"
              style="transform: translate({panX}px, {panY}px) scale({zoomScale}); transition: {isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'};"
            >
              {@html renderedSvg}
            </div>
          {:else}
            <div class="text-[13px] text-white/40 flex items-center gap-2 font-['IBM_Plex_Mono',monospace]">
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              Compiling diagram AST...
            </div>
          {/if}
      </div>
    </div>
  </section>

  <!-- Section 2: How TxtGrph Works (Developer Workflow Pipeline) -->
  <section id="how-it-works" class="px-4 py-20 sm:py-32 max-w-5xl mx-auto space-y-12 sm:space-y-16">
    <div class="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
      <h2 class="font-['Instrument_Sans',sans-serif] text-[28px] sm:text-[40px] md:text-[48px] font-semibold text-white tracking-[-0.035em] [text-wrap:balance]">
        How TxtGrph Works
      </h2>
      <p class="text-[15px] sm:text-[17px] text-white/60 leading-[24px] sm:leading-[26px] [text-wrap:balance]">
        A three-stage architecture pipeline designed for modern engineering teams.
      </p>
    </div>

    <!-- Step Selector Tabs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {#each workflowSteps as step}
        {@const IconComp = step.icon}
        <button
          onclick={() => (selectedWorkflowStep = step)}
          class="p-6 sm:p-8 rounded-[20px] sm:rounded-[24px] text-left transition-all space-y-3 sm:space-y-4 border cursor-pointer {selectedWorkflowStep.step === step.step ? 'bg-white/[0.08] border-white/25 shadow-2xl scale-[1.01]' : 'bg-white/[0.02] border-white/8 hover:border-white/15'}"
        >
          <div class="flex items-center justify-between">
            <span class="font-['IBM_Plex_Mono',monospace] text-[11px] sm:text-[12px] font-semibold px-3 py-0.5 sm:py-1 rounded-full bg-white/10 text-white">
              STEP {step.step}
            </span>
            <IconComp size={20} class="text-white/70" />
          </div>
          <h3 class="font-['Instrument_Sans',sans-serif] text-[18px] sm:text-[20px] font-semibold text-white tracking-[-0.02em]">
            {step.title}
          </h3>
          <p class="text-[13.5px] sm:text-[14px] leading-[20px] sm:leading-[22px] text-white/60">
            {step.subtitle}
          </p>
        </button>
      {/each}
    </div>

    <!-- Interactive Step Detail Card -->
    <div class="p-6 sm:p-10 rounded-[20px] sm:rounded-[28px] bg-white/[0.03] border border-white/10 shadow-2xl space-y-3 sm:space-y-4">
      <div class="flex items-center gap-3 text-white font-['Instrument_Sans',sans-serif] font-semibold text-[19px] sm:text-[22px]">
        <SelectedStepIcon size={22} class="text-white shrink-0" />
        <span>Step {selectedWorkflowStep.step}: {selectedWorkflowStep.title}</span>
      </div>
      <p class="text-[14.5px] sm:text-[16px] leading-[23px] sm:leading-[26px] text-white/80 max-w-3xl">
        {selectedWorkflowStep.detail}
      </p>
    </div>
  </section>

  <!-- Section 3: Open Source GitHub Repository Showcase -->
  <section id="github" class="px-4 py-20 sm:py-32 max-w-5xl mx-auto space-y-12 sm:space-y-16">
    <div class="p-6 sm:p-12 rounded-[24px] sm:rounded-[32px] bg-gradient-to-b from-[#12141C] to-[#0A0B0D] border border-white/12 shadow-2xl space-y-6 sm:space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-white/80 text-[11px] sm:text-[12px] font-['IBM_Plex_Mono',monospace]">
            <Github size={14} />
            <span>Open Source Repository</span>
          </div>
          <h2 class="font-['Instrument_Sans',sans-serif] text-[20px] xs:text-[24px] sm:text-[38px] md:text-[44px] font-semibold text-white tracking-[-0.03em] break-all sm:break-normal">
            github.com/oznerta/TxtGrph
          </h2>
          <p class="text-[14.5px] sm:text-[16px] text-white/60 max-w-xl">
            Explore the codebase, contribute features, or self-host the SvelteKit + Supabase monorepo.
          </p>
        </div>

        <a
          href="https://github.com/oznerta/TxtGrph"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-2.5 h-11 sm:h-12 px-6 sm:px-7 text-[13.5px] sm:text-[14px] font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-lg self-start md:self-auto shrink-0"
        >
          <Star size={16} />
          <span>Star on GitHub</span>
        </a>
      </div>

      <!-- Interactive Git Clone Terminal Snippet -->
      <div class="p-3.5 sm:p-5 rounded-[16px] sm:rounded-[18px] bg-black/60 border border-white/10 font-['IBM_Plex_Mono',monospace] text-[12px] sm:text-[13px] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden">
        <div class="flex items-center gap-2.5 min-w-0 overflow-hidden">
          <Terminal size={15} class="text-white/40 shrink-0" />
          <span class="text-white/90 truncate">{cloneCommand}</span>
        </div>

        <button
          onclick={copyCloneCommand}
          class="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] font-medium rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
        >
          {#if copiedCloneCmd}
            <Check size={12} class="text-green-400" />
            <span>Copied Command</span>
          {:else}
            <Copy size={12} />
            <span>Copy Terminal Command</span>
          {/if}
        </button>
      </div>
    </div>
  </section>

  <!-- Section 4: Seamless Apple Features Grid -->
  <section id="features" class="px-4 py-20 sm:py-32 max-w-5xl mx-auto space-y-12 sm:space-y-16">
    <div class="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
      <h2 class="font-['Instrument_Sans',sans-serif] text-[28px] sm:text-[40px] md:text-[48px] font-semibold text-white tracking-[-0.035em] [text-wrap:balance]">
        Engineered for Clarity
      </h2>
      <p class="text-[15px] sm:text-[17px] text-white/60 leading-[24px] sm:leading-[26px] [text-wrap:balance]">
        Combine plain text flexibility with cloud persistence and private AI copilot.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
      <div class="p-6 sm:p-8 rounded-[24px] sm:rounded-[28px] bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all space-y-4 sm:space-y-5">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-white/5 border border-white/10 flex items-center justify-center text-white">
          <Code2 size={22} />
        </div>
        <h3 class="font-['Instrument_Sans',sans-serif] text-[20px] sm:text-[24px] font-semibold text-white tracking-[-0.02em]">
          CodeMirror 6 Engine
        </h3>
        <p class="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[25px] text-white/60">
          High-performance code editor with live syntax autocomplete, line numbers, and instant client-side SVG compilation.
        </p>
      </div>

      <div class="p-6 sm:p-8 rounded-[24px] sm:rounded-[28px] bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all space-y-4 sm:space-y-5">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-white/5 border border-white/10 flex items-center justify-center text-white">
          <FolderTree size={22} />
        </div>
        <h3 class="font-['Instrument_Sans',sans-serif] text-[20px] sm:text-[24px] font-semibold text-white tracking-[-0.02em]">
          Nested Folder Hierarchy
        </h3>
        <p class="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[25px] text-white/60">
          File architecture specs and flowcharts into subfolder trees protected by Supabase Row-Level Security.
        </p>
      </div>

      <div class="p-6 sm:p-8 rounded-[24px] sm:rounded-[28px] bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all space-y-4 sm:space-y-5">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-white/5 border border-white/10 flex items-center justify-center text-white">
          <Sparkles size={22} />
        </div>
        <h3 class="font-['Instrument_Sans',sans-serif] text-[20px] sm:text-[24px] font-semibold text-white tracking-[-0.02em]">
          Private BYOK AI Assistant
        </h3>
        <p class="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[25px] text-white/60">
          Bring your own API key (Anthropic, OpenAI, or Gemini). Direct client-to-provider calls with zero data telemetry.
        </p>
      </div>

      <div class="p-6 sm:p-8 rounded-[24px] sm:rounded-[28px] bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all space-y-4 sm:space-y-5">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-white/5 border border-white/10 flex items-center justify-center text-white">
          <Share2 size={22} />
        </div>
        <h3 class="font-['Instrument_Sans',sans-serif] text-[20px] sm:text-[24px] font-semibold text-white tracking-[-0.02em]">
          Vector SVG Exports & Share Links
        </h3>
        <p class="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[25px] text-white/60">
          Export crisp vector SVG graphics for README docs, slide decks, or generate shareable view-only URL links.
        </p>
      </div>
    </div>
  </section>

  <!-- Minimalist Apple Footer -->
  <footer class="px-4 sm:px-8 py-12 sm:py-16 bg-[#040405] text-white/50 border-t border-white/5">
    <div class="max-w-5xl mx-auto space-y-8 sm:space-y-12">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 sm:pb-8 border-b border-white/5">
        <a href="/" class="flex items-center gap-3 group shrink-0">
          <div class="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden">
            <img src="/assets/logo-short-dark.png" alt="TxtGrph Logo" class="w-full h-full object-contain" />
          </div>
          <span class="font-['Instrument_Sans',sans-serif] text-[18px] font-semibold text-white tracking-[-0.02em]">
            TxtGrph
          </span>
        </a>

        <div class="flex flex-wrap items-center gap-4 sm:gap-6 text-[13px] text-white/70">
          <a href="https://github.com/oznerta/TxtGrph" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors flex items-center gap-1.5">
            <Github size={14} />
            <span>GitHub</span>
          </a>
          <a href="/playground" class="hover:text-white transition-colors">Playground</a>
          <a href="/workspace" class="hover:text-white transition-colors">Workspace</a>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] font-['IBM_Plex_Mono',monospace] text-white/40 text-center sm:text-left">
        <div class="[text-wrap:balance]">
          © {new Date().getFullYear()} TxtGrph · Powered by <a href="https://mermaid.js.org" target="_blank" rel="noopener noreferrer" class="hover:text-white underline">Mermaid.js</a> created by Knut Sveidqvist & Contributors.
        </div>

        <button
          onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          class="hover:text-white transition-colors cursor-pointer shrink-0"
        >
          Back to top ↑
        </button>
      </div>
    </div>
  </footer>
</div>

<!-- Full Mermaid AI Studio Workspace View (Matching User Screenshot UI-UX) -->
{#if aiChatOpen}
  <div class="fixed inset-0 z-[9999] bg-[#0A0B0E]/95 backdrop-blur-2xl flex flex-col font-['Public_Sans',sans-serif] text-white animate-in fade-in duration-200">
    <!-- Top AI Header Tab Bar -->
    <div class="h-14 px-6 border-b border-white/10 bg-[#12141C] flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[12.5px] font-['IBM_Plex_Mono',monospace] font-semibold flex items-center gap-2">
          <Plus size={14} />
          <span>New AI Chat</span>
        </div>
      </div>

      <button
        onclick={() => (aiChatOpen = false)}
        class="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="Return to Canvas"
      >
        <X size={20} />
      </button>
    </div>

    <!-- Centered AI Prompt Workspace Body -->
    <div class="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar space-y-8">
      <!-- Title & Subtitle -->
      <div class="text-center space-y-3">
        <div class="w-14 h-14 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/20 border border-white/20">
          <Wand2 size={28} />
        </div>
        <h1 class="font-['Instrument_Sans',sans-serif] text-4xl sm:text-5xl font-bold tracking-tight text-white">
          Mermaid AI
        </h1>
        <p class="text-white/60 text-[15px] sm:text-[17px] max-w-lg mx-auto font-sans leading-relaxed">
          Describe what you want in plain text or speak with voice dictation and get a diagram you can refine.
        </p>
      </div>

      <!-- Quick Suggestion Chip Buttons Row (Matching Image 1) -->
      <div class="flex items-center justify-center gap-3 flex-wrap max-w-2xl font-['IBM_Plex_Mono',monospace] text-[12px]">
        <button
          onclick={() => handleSendAiPrompt('Create a sequence diagram for a customer authentication flow')}
          class="px-4 py-2.5 rounded-full bg-white/5 border border-white/12 hover:border-purple-400/50 hover:bg-white/10 text-white/80 transition-all cursor-pointer shadow-sm text-center"
        >
          Create a sequence diagram for auth...
        </button>
        <button
          onclick={() => handleSendAiPrompt('Create a state diagram showing order state transitions')}
          class="px-4 py-2.5 rounded-full bg-white/5 border border-white/12 hover:border-purple-400/50 hover:bg-white/10 text-white/80 transition-all cursor-pointer shadow-sm text-center"
        >
          Create a state diagram showing order...
        </button>
        <button
          onclick={() => handleSendAiPrompt('Generate a class diagram for payment gateway service')}
          class="px-4 py-2.5 rounded-full bg-white/5 border border-white/12 hover:border-purple-400/50 hover:bg-white/10 text-white/80 transition-all cursor-pointer shadow-sm text-center"
        >
          Generate a class diagram...
        </button>
      </div>

      <!-- Main Floating AI Prompt Input Card (Matching Image 1) -->
      <div class="w-full max-w-2xl rounded-[28px] bg-[#12141C] border border-purple-500/30 p-5 shadow-2xl space-y-4 focus-within:border-purple-400 transition-colors">
        <textarea
          bind:value={aiPrompt}
          onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAiPrompt(); } }}
          placeholder="What would you like to change or add?"
          rows="3"
          class="w-full bg-transparent text-white text-[15px] placeholder:text-white/35 focus:outline-none resize-none font-['IBM_Plex_Mono',monospace] leading-relaxed"
        ></textarea>

        <div class="flex items-center justify-between pt-2 border-t border-white/10">
          <div class="flex items-center gap-2">
            <button
              onclick={toggleVoiceInput}
              class="px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-[12.5px] font-['IBM_Plex_Mono',monospace] flex items-center gap-2 transition-colors cursor-pointer {isListening ? 'bg-red-500/30 border-red-500 text-red-200 animate-pulse' : ''}"
              title="Voice Prompt Dictation"
            >
              {#if isListening}
                <MicOff size={14} />
                <span>Recording...</span>
              {:else}
                <Mic size={14} class="text-purple-400" />
                <span>Voice Input</span>
              {/if}
            </button>

            <button
              onclick={() => handleSendAiPrompt('Add microservices database cluster node')}
              class="p-2.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Quick Add Node"
            >
              <Plus size={18} />
            </button>
          </div>

          <button
            onclick={() => handleSendAiPrompt()}
            disabled={!aiPrompt.trim() || aiGenerating}
            class="w-10 h-10 rounded-full bg-white hover:bg-white/90 disabled:opacity-40 text-black flex items-center justify-center transition-all cursor-pointer shadow-lg"
            title="Send Prompt"
          >
            {#if aiGenerating}
              <Sparkles size={18} class="animate-spin text-black" />
            {:else}
              <ArrowUp size={20} />
            {/if}
          </button>
        </div>
      </div>

      <!-- Chat Response History Messages Feed -->
      <div class="w-full max-w-2xl space-y-3 font-['IBM_Plex_Mono',monospace] text-[13px]">
        {#each chatMessages as msg}
          <div class="p-4 rounded-2xl border border-white/10 bg-white/[0.03] space-y-1 shadow-sm">
            <div class="flex items-center justify-between text-[11px] text-white/40">
              <span class="font-semibold text-purple-400">{msg.role === 'user' ? 'You' : 'Mermaid AI'}</span>
              <span>{msg.time}</span>
            </div>
            <p class="text-white/90 leading-relaxed">{msg.text}</p>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Auth Gate Modal for Guests -->
{#if authModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
    <div class="w-full max-w-md rounded-[24px] bg-[#12141C] border border-white/15 p-6 shadow-2xl space-y-5">
      <div class="flex items-center justify-between">
        <div class="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white">
          <Lock size={18} />
        </div>
        <button
          onclick={() => (authModalOpen = false)}
          class="p-1 text-white/40 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div class="space-y-2">
        <h3 class="font-['Instrument_Sans',sans-serif] text-[20px] font-semibold text-white">
          Sign In Required
        </h3>
        <p class="text-[14px] leading-[22px] text-white/70">
          <strong>{authModalReason}</strong> is available for registered users. Create a free account or sign in to unlock exports, folder management, and cloud persistence.
        </p>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <a
          href="/auth"
          class="flex-1 inline-flex items-center justify-center gap-2 h-10 font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all text-[13px]"
        >
          <span>Sign In / Create Account</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  </div>
{/if}

<!-- Templates & Diagram Types Modal -->
{#if templatesModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
    <div class="w-full max-w-4xl max-h-[85vh] rounded-[24px] bg-[#12141C] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <div class="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0E0F12]">
        <div class="flex items-center gap-3 sm:gap-4">
          <button
            onclick={() => (templatesModalOpen = false)}
            class="p-2 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>

          <!-- Tab Pills -->
          <div class="p-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1 font-['IBM_Plex_Mono',monospace] text-[12px]">
            <button
              onclick={() => (modalActiveTab = 'templates')}
              class="px-4 sm:px-5 py-1.5 rounded-full font-medium transition-all {modalActiveTab === 'templates' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}"
            >
              Templates
            </button>
            <button
              onclick={() => (modalActiveTab = 'types')}
              class="px-4 sm:px-5 py-1.5 rounded-full font-medium transition-all {modalActiveTab === 'types' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}"
            >
              Diagram Types
            </button>
          </div>
        </div>

        <button
          onclick={() => (templatesModalOpen = false)}
          class="p-2 text-white/40 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Modal Body Content -->
      <div class="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
        {#if modalActiveTab === 'templates'}
          <!-- Templates Category Filter Bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-['IBM_Plex_Mono',monospace]">
            <div class="flex items-center gap-2">
              <Filter size={14} class="text-white/50" />
              <CustomSelect
                options={templateCategoryOptions}
                bind:value={selectedCategoryFilter}
              />
            </div>

            <button
              onclick={() => loadTemplateCode('graph TD\n  A[Start] --> B[End]')}
              class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white text-[12px] transition-colors"
            >
              <span>Start with a blank canvas</span>
            </button>
          </div>

          <!-- Templates Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {#each filteredTemplatesModal as template}
              <button
                onclick={() => loadTemplateCode(template.code)}
                class="p-5 rounded-[18px] bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.06] transition-all text-left space-y-3 group cursor-pointer"
              >
                <div class="flex items-center justify-between">
                  <span class="font-['IBM_Plex_Mono',monospace] text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white/80">
                    {template.category}
                  </span>
                  <Code2 size={15} class="text-white/40 group-hover:text-white transition-colors" />
                </div>
                <h4 class="font-['Instrument_Sans',sans-serif] text-[16px] font-semibold text-white">
                  {template.name}
                </h4>
              </button>
            {/each}
          </div>
        {:else}
          <!-- Diagram Types Grid (20+ Diagram Types) -->
          <div class="space-y-4 font-['IBM_Plex_Mono',monospace]">
            <div class="flex items-center justify-between">
              <p class="text-[12px] text-white/60">Select any diagram type to author with clean syntax starters.</p>
              <button
                onclick={() => loadTemplateCode('graph TD\n  A[Start] --> B[End]')}
                class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white text-[12px] transition-colors"
              >
                <span>Start with a blank canvas</span>
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {#each allDiagramTypes as diagType}
                <button
                  onclick={() => loadTemplateCode(diagType.code)}
                  class="p-4 rounded-[14px] bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.08] transition-all text-left flex items-center justify-between group cursor-pointer"
                >
                  <span class="font-['Instrument_Sans',sans-serif] font-semibold text-[14px] text-white">
                    {diagType.name}
                  </span>
                  <Code2 size={14} class="text-white/40 group-hover:text-white transition-colors shrink-0 ml-2" />
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
