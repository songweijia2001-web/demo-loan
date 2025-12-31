// Enums for strict typing
export enum AgentType {
    DISCOVERY = 'DISCOVERY',
    EXTRACTION = 'EXTRACTION',
    GRAPH_BUILDER = 'GRAPH_BUILDER',
    LINT = 'LINT',
    IMPACT = 'IMPACT',
    PATCH = 'PATCH'
  }
  
  export enum AgentStatus {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    WAITING_FOR_INPUT = 'WAITING_FOR_INPUT'
  }
  
  export enum Severity {
    CRITICAL = 'CRITICAL',
    WARNING = 'WARNING',
    INFO = 'INFO'
  }
  
  // The Digital Twin Core Object
  export interface DealState {
    borrower: string;
    agreementDate: string;
    facilities: Facility[];
    covenants: Covenant[];
    definitions: Definition[];
    reporting: ReportingObligation[];
  }
  
  export interface Facility {
    id: string;
    name: string;
    amount: number;
    currency: string;
    maturityDate: string;
    citation: string; // Clause ID
    confidence: number;
  }
  
  export interface Covenant {
    id: string;
    name: string; // e.g., "Total Net Leverage Ratio"
    threshold: string; // e.g., "4.50:1.00"
    type: 'FINANCIAL' | 'NEGATIVE' | 'AFFIRMATIVE';
    citation: string;
    dependencies: string[]; // List of Definition IDs
  }
  
  export interface Definition {
    term: string;
    definitionText: string;
    id: string;
    citation: string;
    usedIn: string[]; // List of Clause IDs
    isAmbiguous: boolean;
  }
  
  export interface ReportingObligation {
    id: string;
    description: string;
    frequency: string;
    citation: string;
  }
  
  // Document Structure
  export interface DocSection {
    id: string;
    title: string;
    content: string; // Raw text of the section
    startIndex: number; // For highlighting
    endIndex: number;
  }
  
  // Agent Artifacts
  export interface LintFinding {
    id: string;
    severity: Severity;
    message: string;
    affectedClauseId: string;
    suggestion?: string;
  }
  
  export interface AgentLog {
    id: string;
    timestamp: Date;
    agent: AgentType;
    message: string;
    status: AgentStatus;
  }
  
  export interface AgreementCandidate {
    id: string;
    borrower: string;
    date: string;
    type: string; // "Credit Agreement", "Amendment No. 1"
    preview: string;
  }

  // Graph Node for visualization/logic
  export interface GraphNode {
      id: string;
      label: string;
      type: 'TERM' | 'COVENANT' | 'SECTION';
      connections: string[];
  }