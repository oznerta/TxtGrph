export interface DiagramTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
}

export const diagramTemplates: DiagramTemplate[] = [
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
    category: 'ER Diagram',
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
    category: 'Git Graph',
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
    id: 'architecture-cloud',
    name: 'Microservices Cloud',
    category: 'Architecture',
    description: 'Distributed microservices with API gateway and message queue',
    code: `graph TB
  subgraph Frontend
    Web[SvelteKit Web Client]
    Mobile[Mobile App]
  end
  subgraph Gateway
    GW[API Gateway / Load Balancer]
  end
  subgraph Microservices
    AuthSvc[Auth Service]
    DiagSvc[Diagram Engine Svc]
    NotifSvc[Notification Svc]
  end
  subgraph Persistence
    DB[(Postgres DB)]
    Redis[(Redis Cache)]
  end
  Web --> GW
  Mobile --> GW
  GW --> AuthSvc
  GW --> DiagSvc
  DiagSvc --> DB
  DiagSvc --> Redis
  AuthSvc --> DB`,
  }
];
