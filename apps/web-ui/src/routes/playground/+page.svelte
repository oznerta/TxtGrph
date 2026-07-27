<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import mermaid from 'mermaid';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import {
    Code2,
    Sparkles,
    Zap,
    ArrowRight,
    Copy,
    Check,
    Cpu,
    Layers,
    RotateCcw,
    AlertCircle,
    Lock,
    Github,
    Maximize2,
    Minimize2,
    Download,
    Share2,
    X,
    FolderPlus,
    LogIn,
    Mic,
    MicOff,
    Send,
    Bot,
    MessageSquare,
    Wand2,
    Volume2,
    Image,
    FileCode,
    Code,
    FileText,
    ChevronDown,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    PanelLeftClose,
    PanelLeft,
    BookOpen,
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
    Search,
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
    FolderKanban,
  } from 'lucide-svelte';

  let { data } = $props();

  const diagramTemplates = [
    {
      id: 'flowchart-system',
      name: 'System Architecture',
      category: 'Flowchart',
      description: 'Web app architecture with auth and database layers',
      code: `graph TD
  Client[SvelteKit Web UI] --> Core[Core Engine]
  Core --> Parser[Mermaid 11.4 Parser]
  Parser --> SVG[Client-Side SVG]
  Client --> Auth[(Supabase Auth)]
  Client --> DB[(Supabase RLS Postgres)]`,
    },
    {
      id: 'sequence-oauth',
      name: 'OAuth 2.0 Sequence',
      category: 'Sequence',
      description: 'Authentication flow with OTP token dispatch',
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
      id: 'state-order',
      name: 'State Machine',
      category: 'State',
      description: 'Order & document status lifecycle transitions',
      code: `stateDiagram-v2
  [*] --> Draft
  Draft --> Compiling: Live Keypress Input
  Compiling --> Validated: AST Syntax Verified
  Compiling --> SyntaxError: Invalid Token
  Validated --> Rendered: Client SVG Render
  SyntaxError --> Draft: Await Fix`,
    },
    {
      id: 'mindmap-features',
      name: 'Feature Mindmap',
      category: 'Mindmap',
      description: 'Product ecosystem and module breakdown',
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
    {
      id: 'er-schema',
      name: 'Database ER Schema',
      category: 'ER',
      description: 'Relational database schema with primary & foreign keys',
      code: `erDiagram
  USER ||--o{ DIAGRAM : owns
  USER ||--o{ FOLDER : creates
  FOLDER ||--o{ DIAGRAM : contains
  USER {
    uuid id PK
    string email
    timestamp created_at
  }
  FOLDER {
    uuid id PK
    uuid user_id FK
    string name
  }
  DIAGRAM {
    uuid id PK
    uuid user_id FK
    uuid folder_id FK
    string title
    text content
  }`,
    },
    {
      id: 'class-schema',
      name: 'Class Schema',
      category: 'Class',
      description: 'Object oriented domain classes and relationships',
      code: `classDiagram
  class Document {
    +String id
    +String title
    +String content
    +compile()
  }
  class User {
    +String id
    +String email
    +createDocument()
  }
  User "1" --> "*" Document : owns`,
    },
    {
      id: 'gantt-roadmap',
      name: 'Product Roadmap',
      category: 'Gantt',
      description: 'Sprint planning and milestone schedule timeline',
      code: `gantt
  title Product Launch Roadmap
  dateFormat YYYY-MM-DD
  section Core Editor
    CodeMirror Integration :done, m1, 2026-07-01, 2026-07-10
    Mermaid 11.4 Engine    :done, m2, 2026-07-10, 2026-07-20
  section Cloud Features
    Supabase RLS Auth      :active, m3, 2026-07-20, 2026-08-05
    Folder Workspace Tree  : m4, 2026-08-05, 2026-08-20`,
    },
    {
      id: 'git-flow',
      name: 'Git Feature Branching',
      category: 'Git',
      description: 'Git commit graph with main, develop, and feature branches',
      code: `gitGraph
  commit id: "Initial Commit"
  branch develop
  checkout develop
  commit id: "Setup SvelteKit"
  branch feature/editor
  checkout feature/editor
  commit id: "Add CodeMirror 6"
  checkout develop
  merge feature/editor
  checkout main
  merge develop tag: "v1.0.0"`,
    },
    {
      id: 'kanban-board',
      name: 'Sprint Kanban Board',
      category: 'Kanban',
      description: 'Agile task tracking board across swimlanes',
      code: `kanban
  Todo
    [CodeMirror 6 Editor]
    [Folder Schema RLS]
  In Progress
    [Awwwards UI Redesign]
    [Multi-Format Export Engine]
  Done
    [SvelteKit Intialization]
    [Mermaid 11.4 AST Compiler]`,
    },
    {
      id: 'user-journey',
      name: 'User Journey Flow',
      category: 'User Journey',
      description: 'User experience evaluation across key interaction touchpoints',
      code: `journey
  title Developer Intake Experience
  section Landing
    Discover TxtGrph: 5: Developer
    Try Playground: 5: Developer
  section Authoring
    Write Mermaid Text: 5: Developer
    Live SVG Preview: 5: Developer
  section Saving
    Sign In Account: 4: Developer
    Organize in Folders: 5: Developer`,
    },
  ];

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

  let selectedPreset = $state(diagramTemplates[0]);
  let code = $state(diagramTemplates[0].code);
  let renderedSvg = $state('');
  let renderError = $state<string | null>(null);
  let isRendering = $state(false);
  let renderTimeMs = $state(0);
  let copiedCode = $state(false);
  let copySvgSuccess = $state(false);
  let exportDropdownOpen = $state(false);
  let actionsMenuOpen = $state(false);
  let authModalOpen = $state(false);
  let authModalReason = $state('');
  let editorCollapsed = $state(false);
  let isEditorExpanded = $state(false);

  // Templates Modal State
  let templatesModalOpen = $state(false);
  let modalActiveTab = $state<'templates' | 'types'>('templates');
  let selectedCategoryFilter = $state('All');

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

  // Visual Editing Toolbar State
  let selectedMermaidTheme = $state<'dark' | 'forest' | 'neutral' | 'base' | 'default'>('dark');
  let canvasMode = $state<'dark' | 'light'>('dark');
  let canvasPattern = $state<'dots' | 'grid' | 'crosses' | 'solid'>('dots');

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

  function changeMermaidTheme(newTheme: string) {
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
      actionsMenuOpen = false;
      editorCollapsed = true;
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
    const renderer = algo === 'adaptive' ? 'elk' : 'dagre';
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

  let filteredTemplates = $derived(
    selectedCategoryFilter === 'All'
      ? diagramTemplates
      : diagramTemplates.filter((t) => t.category === selectedCategoryFilter)
  );

  function loadTemplateCode(newCode: string) {
    code = newCode;
    compileDiagram(code);
    templatesModalOpen = false;
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
    panX = 0;
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

  $effect(() => {
    function handleFullscreenChange() {
      if (typeof document !== 'undefined') {
        isCanvasFullscreen = !!document.fullscreenElement;
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });

  function toggleCanvasFullscreen() {
    if (typeof document !== 'undefined') {
      if (!isCanvasFullscreen) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        isCanvasFullscreen = true;
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        isCanvasFullscreen = false;
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

  let lineNumbers = $derived(
    Array.from({ length: Math.max(1, code.split('\n').length) }, (_, i) => i + 1)
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

  function handlePresetSelect(preset: typeof diagramTemplates[0]) {
    selectedPreset = preset;
    code = preset.code;
    compileDiagram(preset.code);
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

  function handleExport(format: 'svg' | 'png' | 'jpeg' | 'mmd' | 'md' | 'copy-svg') {
    if (!data.session) {
      authModalReason = `Export diagram as ${format.toUpperCase()}`;
      authModalOpen = true;
      exportDropdownOpen = false;
      return;
    }

    const baseFilename = selectedPreset?.name ? selectedPreset.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'diagram';

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
    const img = new Image();
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
    if (data?.session) {
      if (actionName === 'save') {
        alert('Diagram saved to workspace');
      } else if (actionName === 'share') {
        if (typeof window !== 'undefined') {
          navigator.clipboard.writeText(window.location.href);
          alert('Shareable link copied to clipboard!');
        }
      }
    } else {
      authModalReason = actionName === 'save'
        ? 'Save Diagrams to Workspace Folders'
        : 'Generate Shareable URL Links';
      authModalOpen = true;
    }
  }
</script>

<svelte:head>
  <title>TxtGrph · Live Public Mermaid Playground</title>
</svelte:head>

<div class="h-screen w-screen flex flex-col bg-[#0A0B0E] text-[#F3F4F6] font-['Public_Sans',sans-serif] selection:bg-[var(--color-brass)] selection:text-white overflow-hidden relative">
  <!-- Top Workspace Glass Header -->
  {#if !isCanvasFullscreen}
    <header class="h-14 px-4 sm:px-6 bg-[#12141C] border-b border-white/10 flex items-center justify-between z-30 shrink-0">
      <div class="flex items-center gap-4">
        <a href="/" class="flex items-center gap-2.5 group">
          <div class="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
            <img src="/assets/logo-short-dark.png" alt="TxtGrph Logo" class="w-full h-full object-contain" />
          </div>
          <span class="font-['Instrument_Sans',sans-serif] text-[17px] font-semibold text-white">
            TxtGrph
          </span>
        </a>

        <span class="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70 font-['IBM_Plex_Mono',monospace]">
          Public Playground
        </span>
      </div>

      <div class="flex items-center gap-3">
        <a
          href="https://github.com/oznerta/TxtGrph"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 text-[12px] font-medium rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
        >
          <Github size={14} />
          <span class="hidden sm:inline">GitHub</span>
        </a>

        {#if data?.session}
          <a
            href="/workspace"
            class="inline-flex items-center gap-1.5 h-8.5 px-4 text-[12px] font-medium rounded-full bg-white text-[#0A0B0E] hover:bg-white/90 transition-all"
          >
            <span>Workspace</span>
            <ArrowRight size={13} />
          </a>
        {:else}
          <a
            href="/auth"
            class="inline-flex items-center gap-1.5 h-8.5 px-4 text-[12px] font-medium rounded-full bg-white text-[#0A0B0E] hover:bg-white/90 transition-all"
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </a>
        {/if}
      </div>
    </header>
  {/if}

  <!-- 100% Full-Bleed Interactive Canvas Workspace -->
  <div
    onmousedown={startPan}
    onmousemove={onPanMove}
    onmouseup={endPan}
    onmouseleave={endPan}
    oncontextmenu={(e) => e.preventDefault()}
    onwheel={handleCanvasWheel}
    role="region"
    aria-label="Interactive Diagram Canvas"
    class="flex-1 relative w-full {isCanvasFullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen' : 'h-[calc(100vh-3.5rem)]'} overflow-hidden select-none transition-all duration-200 {isPanning ? 'cursor-grabbing' : (activeInteractionMode === 'pan' ? 'cursor-grab' : 'cursor-default')}"
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
    <!-- Floating Top-Right Single Actions Icon Button -->
    <div class="absolute top-6 right-6 z-40 font-['IBM_Plex_Mono',monospace]">
      <div class="relative">
        <button
          onclick={() => { actionsMenuOpen = !actionsMenuOpen; if (actionsMenuOpen) { activeToolbarPopover = 'none'; editorCollapsed = true; } }}
          title="Canvas Actions, Templates, Saving & Export"
          class="px-3.5 py-2.5 rounded-2xl border border-white/20 bg-[#12141C]/90 backdrop-blur-xl hover:bg-[#1E2132] text-white transition-all shadow-xl cursor-pointer flex items-center gap-2 group"
        >
          <FolderKanban size={18} class="text-amber-400 group-hover:scale-110 transition-transform" />
          <ChevronDown size={14} class="text-white/60 transition-transform {actionsMenuOpen ? 'rotate-180' : ''}" />
        </button>

        {#if actionsMenuOpen}
          <div class="absolute right-0 mt-3 w-[calc(100vw-3rem)] sm:w-60 rounded-[22px] sm:rounded-[18px] bg-[#161822]/98 backdrop-blur-2xl border border-white/20 shadow-2xl p-4 sm:p-2 z-[100] sm:z-50 text-[13px] sm:text-[12px] space-y-1.5 sm:space-y-1 text-left font-['IBM_Plex_Mono',monospace] select-none max-h-[70vh] overflow-y-auto custom-scrollbar">
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

    <!-- Floating Code Editor Card (Floating & Freely Resizable over Canvas) -->
    {#if !editorCollapsed}
      <div
        class="fixed inset-x-3 bottom-3 top-16 sm:absolute sm:top-6 sm:left-6 sm:w-[440px] sm:h-[440px] sm:min-w-[320px] sm:min-h-[200px] sm:max-w-[calc(100vw-3rem)] sm:max-h-[calc(100vh-6rem)] sm:inset-auto flex flex-col rounded-2xl bg-[#0E1017]/95 border border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] font-['IBM_Plex_Mono',monospace] sm:resize overflow-hidden select-none hover:border-white/25 transition-colors z-[60]"
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
      <!-- Floating Expand Code Button (When Collapsed) -->
      <button
        onclick={() => { editorCollapsed = false; actionsMenuOpen = false; activeToolbarPopover = 'none'; }}
        class="absolute top-6 left-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#12141C]/90 border border-white/15 backdrop-blur-xl text-white hover:bg-[#1E2132] transition-all shadow-2xl text-[13px] font-semibold font-['IBM_Plex_Mono',monospace] cursor-pointer"
      >
        <Code size={16} class="text-amber-400" />
        <span>Code Editor</span>
      </button>
    {/if}

    <!-- High-Visibility Floating Canvas Error Banner (Top-Center, Above All Tools) -->
    {#if renderError}
      <div class="absolute top-6 inset-x-0 z-[70] flex justify-center pointer-events-none px-4">
        <div class="pointer-events-auto max-w-lg w-full px-4.5 py-3 rounded-2xl bg-[#1A0B0E]/95 border border-red-500/40 shadow-2xl backdrop-blur-xl text-red-200 text-[12.5px] font-['IBM_Plex_Mono',monospace] flex items-center gap-3 animate-in fade-in duration-150">
          <div class="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <AlertCircle size={14} />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-red-300 text-[12px]">Mermaid Syntax Error</div>
            <div class="text-[11.5px] text-red-200/80 truncate">{renderError}</div>
          </div>
          <button
            onclick={() => (renderError = null)}
            class="p-1 rounded-lg text-red-300/60 hover:text-red-200 hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss Error"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    {/if}

    <!-- Floating Visual Editor Toolbar (Centered Horizontally at Bottom of Canvas) -->
    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-6 z-40 flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl border border-white/20 bg-[#12141C]/95 backdrop-blur-xl text-white/80 shadow-2xl select-none transition-all duration-300 max-w-[calc(100vw-1rem)]">
      <!-- 1. Hand / Pan Mode Button -->
      <button
        onclick={() => (activeInteractionMode = activeInteractionMode === 'pan' ? 'select' : 'pan')}
        title="Pan Canvas Mode (Hand / Hold Right-Click)"
        class="p-2 sm:p-2 min-w-[38px] h-9.5 sm:min-w-0 sm:h-auto flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 {activeInteractionMode === 'pan' || isPanning ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
      >
        <Hand size={19} />
      </button>

      <!-- 2. Diagram Theme, Custom Themes, Diagram Style & Diagram Font Popover Trigger -->
      <div class="relative">
        <button
          onclick={() => toggleToolbarPopover('theme')}
          title="Theme, Custom Colors, Styles & Fonts"
          class="p-2 sm:p-2 min-w-[38px] h-9.5 sm:min-w-0 sm:h-auto flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 {activeToolbarPopover === 'theme' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
        >
          <Palette size={19} />
        </button>

        <!-- Complete Theme, Custom Colors, Style & Font Popover Dropdown (Mobile Centered Bottom Sheet) -->
        {#if activeToolbarPopover === 'theme'}
          <div class="fixed sm:absolute bottom-16 sm:bottom-full left-1/2 -translate-x-1/2 mb-3 w-[calc(100vw-1.5rem)] sm:w-80 p-4 sm:p-4 rounded-[22px] bg-[#161822]/98 backdrop-blur-2xl border border-white/20 shadow-2xl space-y-4 text-left font-['IBM_Plex_Mono',monospace] z-[100] max-h-[70vh] overflow-y-auto custom-scrollbar">
            <!-- Light vs Dark Mode Toggle Header -->
            <div class="flex items-center justify-between pb-2 border-b border-white/10">
              <span class="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Canvas Mode</span>
              <div class="flex items-center p-0.5 rounded-full bg-white/5 border border-white/10">
                <button
                  onclick={() => toggleCanvasMode('dark')}
                  class="px-3 py-1 sm:px-2.5 sm:py-1 rounded-full text-[10.5px] sm:text-[10px] transition-colors flex items-center gap-1.5 {canvasMode === 'dark' ? 'bg-white/20 text-white font-bold' : 'text-white/40 hover:text-white'}"
                >
                  <Moon size={12} class="text-blue-400" />
                  <span>Dark</span>
                </button>
                <button
                  onclick={() => toggleCanvasMode('light')}
                  class="px-3 py-1 sm:px-2.5 sm:py-1 rounded-full text-[10.5px] sm:text-[10px] transition-colors flex items-center gap-1.5 {canvasMode === 'light' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}"
                >
                  <Sun size={12} class="text-amber-500" />
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
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#0D0E12] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'dark' ? 'ring-2 ring-blue-500' : ''}"
                  title="Dark Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-[#1E2538] border border-white/60"></span>
                  <span class="text-[10px] sm:text-[9px] text-white/70 mt-1">Dark</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('forest'); activeToolbarPopover = 'none'; }}
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#0E1A14] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'forest' ? 'ring-2 ring-emerald-500' : ''}"
                  title="Forest Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-emerald-500"></span>
                  <span class="text-[10px] sm:text-[9px] text-white/70 mt-1">Forest</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('neutral'); activeToolbarPopover = 'none'; }}
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#1C1D24] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'neutral' ? 'ring-2 ring-purple-400' : ''}"
                  title="Neutral Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-purple-400"></span>
                  <span class="text-[10px] sm:text-[9px] text-white/70 mt-1">Neutral</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('base'); activeToolbarPopover = 'none'; }}
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#252836] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'base' ? 'ring-2 ring-amber-400' : ''}"
                  title="Base Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-amber-400"></span>
                  <span class="text-[10px] sm:text-[9px] text-white/70 mt-1">Base</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('default'); activeToolbarPopover = 'none'; }}
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#F1F5F9] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'default' ? 'ring-2 ring-slate-400' : ''}"
                  title="Default Light Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-slate-700"></span>
                  <span class="text-[10px] sm:text-[9px] text-black/80 mt-1">Light</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('ocean'); activeToolbarPopover = 'none'; }}
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#0A192F] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'ocean' ? 'ring-2 ring-cyan-400' : ''}"
                  title="Ocean Cyan Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-cyan-400"></span>
                  <span class="text-[10px] sm:text-[9px] text-white/70 mt-1">Ocean</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('rose'); activeToolbarPopover = 'none'; }}
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#1F0E17] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'rose' ? 'ring-2 ring-rose-400' : ''}"
                  title="Rose Sunset Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-rose-400"></span>
                  <span class="text-[10px] sm:text-[9px] text-white/70 mt-1">Rose</span>
                </button>
                <button
                  onclick={() => { changeMermaidTheme('monochrome'); activeToolbarPopover = 'none'; }}
                  class="p-2.5 sm:p-2 rounded-xl border border-white/15 bg-[#000000] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform {selectedMermaidTheme === 'monochrome' ? 'ring-2 ring-white' : ''}"
                  title="Monochrome Theme"
                >
                  <span class="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-white"></span>
                  <span class="text-[10px] sm:text-[9px] text-white/70 mt-1">Mono</span>
                </button>
              </div>
            </div>

            <!-- Repeatable Background Grid Options -->
            <div>
              <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Canvas background pattern</div>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  onclick={() => (canvasPattern = 'dots')}
                  class="px-2 py-2 sm:py-1.5 rounded-lg border border-white/15 text-[10.5px] sm:text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'dots' ? 'bg-white/20 font-bold border-white/40' : ''}"
                  title="Dots Grid"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-white"></span> Dots
                </button>
                <button
                  onclick={() => (canvasPattern = 'grid')}
                  class="px-2 py-2 sm:py-1.5 rounded-lg border border-white/15 text-[10.5px] sm:text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'grid' ? 'bg-white/20 font-bold border-white/40' : ''}"
                  title="Grid Lines"
                >
                  <span class="text-[11px] font-mono leading-none">#</span> Grid
                </button>
                <button
                  onclick={() => (canvasPattern = 'crosses')}
                  class="px-2 py-2 sm:py-1.5 rounded-lg border border-white/15 text-[10.5px] sm:text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'crosses' ? 'bg-white/20 font-bold border-white/40' : ''}"
                  title="Crosses Grid"
                >
                  <span class="text-[11px] font-mono leading-none">+</span> Cross
                </button>
                <button
                  onclick={() => (canvasPattern = 'solid')}
                  class="px-2 py-2 sm:py-1.5 rounded-lg border border-white/15 text-[10.5px] sm:text-[10px] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 {canvasPattern === 'solid' ? 'bg-white/20 font-bold border-white/40' : ''}"
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
                  class="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11.5px] sm:text-[11px] text-white font-sans transition-colors cursor-pointer shrink-0 {selectedFontFamily.includes('Public Sans') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                >
                  Aa Sans
                </button>
                <button
                  onclick={() => setDiagramFont('IBM Plex Mono, monospace')}
                  class="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11.5px] sm:text-[11px] text-white font-mono transition-colors cursor-pointer shrink-0 {selectedFontFamily.includes('IBM Plex Mono') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                >
                  Aa Mono
                </button>
                <button
                  onclick={() => setDiagramFont('Lora, serif')}
                  class="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11.5px] sm:text-[11px] text-white font-serif transition-colors cursor-pointer shrink-0 {selectedFontFamily.includes('Lora') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
                >
                  Aa Serif
                </button>
                <button
                  onclick={() => setDiagramFont('Inter, sans-serif')}
                  class="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11.5px] sm:text-[11px] text-white font-sans transition-colors cursor-pointer shrink-0 {selectedFontFamily.includes('Inter') ? 'bg-white/20 font-bold border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/15'}"
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

          <!-- Direction Popover Dropdown (Mobile Centered Bottom Sheet) -->
          {#if activeToolbarPopover === 'direction'}
            <div class="fixed sm:absolute bottom-16 sm:bottom-full left-1/2 -translate-x-1/2 mb-3 w-[calc(100vw-1.5rem)] sm:w-48 p-1.5 rounded-[18px] bg-[#161822]/98 backdrop-blur-2xl border border-white/20 shadow-2xl text-left font-['IBM_Plex_Mono',monospace] z-[100] text-[12.5px] sm:text-[12px] space-y-0.5">
              <button
                onclick={() => setDirection('TD')}
                class="w-full px-3.5 py-2.5 sm:py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'TD' ? 'bg-white/15 font-semibold' : ''}"
              >
                <ArrowDown size={14} />
                <span>Top to bottom</span>
              </button>
              <button
                onclick={() => setDirection('BT')}
                class="w-full px-3.5 py-2.5 sm:py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'BT' ? 'bg-white/15 font-semibold' : ''}"
              >
                <ArrowUp size={14} />
                <span>Bottom to top</span>
              </button>
              <button
                onclick={() => setDirection('LR')}
                class="w-full px-3.5 py-2.5 sm:py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'LR' ? 'bg-white/15 font-semibold' : ''}"
              >
                <ArrowRight size={14} />
                <span>Left to right</span>
              </button>
              <button
                onclick={() => setDirection('RL')}
                class="w-full px-3.5 py-2.5 sm:py-2 rounded-[10px] flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors {currentDirection === 'RL' ? 'bg-white/15 font-semibold' : ''}"
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
            class="p-2 sm:p-2 min-w-[38px] h-9.5 sm:min-w-0 sm:h-auto flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 {activeToolbarPopover === 'layout' ? 'bg-white/25 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}"
          >
            <GitFork size={19} />
          </button>

          <!-- Layout Algorithm Popover Dropdown (Mobile Centered Bottom Sheet) -->
          {#if activeToolbarPopover === 'layout'}
            <div class="fixed sm:absolute bottom-16 sm:bottom-full left-1/2 -translate-x-1/2 mb-3 w-[calc(100vw-1.5rem)] sm:w-52 rounded-[18px] bg-[#161822]/98 backdrop-blur-2xl border border-white/20 shadow-2xl overflow-hidden font-['IBM_Plex_Mono',monospace] z-[100] text-[12.5px] sm:text-[12px] text-left select-none">
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

      <!-- Mobile-Only Fullscreen Toggle -->
      <div class="flex sm:hidden items-center gap-1">
        <div class="w-[1px] h-4.5 bg-white/15 mx-0.5"></div>
        <button
          onclick={toggleCanvasFullscreen}
          title={isCanvasFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
          class="p-2 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer {isCanvasFullscreen ? 'text-blue-400 bg-blue-500/20' : ''}"
        >
          {#if isCanvasFullscreen}
            <Minimize2 size={18} />
          {:else}
            <Maximize2 size={18} />
          {/if}
        </button>
      </div>
    </div>

        <!-- Floating AI Action Pill (Desktop Only, Bottom-Left Canvas) -->
        <div class="hidden sm:flex absolute bottom-6 left-6 z-40">
          <!-- Use AI Pill Button -->
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

        <!-- Floating Canvas Zoom & Fullscreen Control Bar (Desktop Only) -->
        <div class="hidden sm:flex absolute bottom-6 right-6 z-40 items-center gap-1.5 px-3 py-2 rounded-2xl border border-white/20 bg-[#12141C]/95 backdrop-blur-xl text-[12px] font-['IBM_Plex_Mono',monospace] text-white/90 shadow-2xl select-none">
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
          <button
            onclick={toggleCanvasFullscreen}
            title={isCanvasFullscreen ? 'Exit Fullscreen Mode' : 'Fullscreen Canvas View'}
            class="p-2 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-all hover:scale-105 active:scale-95 border-l border-white/15 ml-0.5 pl-2.5 cursor-pointer {isCanvasFullscreen ? 'text-blue-400 bg-blue-500/20' : ''}"
          >
            {#if isCanvasFullscreen}
              <Minimize2 size={16} />
            {:else}
              <Maximize2 size={16} />
            {/if}
          </button>
        </div>

        {#if renderedSvg}
          <div
            class="w-full h-full flex items-center justify-center origin-center [&_svg]:max-w-full [&_svg]:h-auto"
            style="transform: translate3d({editorCollapsed ? 0 : panX}px, {panY}px, 0px) scale({zoomScale}); will-change: transform; transition: {isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'};"
          >
            {@html renderedSvg}
          </div>
        {:else}
          <div class="text-[13px] text-white/50 flex items-center gap-2 font-['IBM_Plex_Mono',monospace]">
            <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-brass)] animate-spin"></span>
            Compiling diagram AST...
          </div>
        {/if}
  </div>
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
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
    <div class="w-full max-w-md rounded-[16px] bg-[#12141C] border border-white/15 p-6 shadow-2xl space-y-5">
      <div class="flex items-center justify-between">
        <div class="w-10 h-10 rounded-full bg-[var(--color-brass)]/10 border border-[var(--color-brass)]/30 flex items-center justify-center text-[var(--color-brass-text)]">
          <Lock size={20} />
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
        <p class="text-[13.5px] leading-[21px] text-white/70">
          <strong>{authModalReason}</strong> is available for registered users. Create a free account or sign in to unlock exports, folder management, and cloud persistence.
        </p>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <a
          href="/auth"
          class="flex-1 inline-flex items-center justify-center gap-2 h-10 font-medium rounded-full bg-white text-[#0A0B0E] hover:bg-white/90 transition-all text-[13px]"
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
              <Dropdown
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
            {#each filteredTemplates as template}
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
                <p class="text-[12px] text-white/60 leading-[18px] line-clamp-2">
                  {template.description}
                </p>
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
