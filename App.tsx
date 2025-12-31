import React, { useState, useCallback, useEffect, useRef } from 'react';
import DigitalTwinPanel from './components/DigitalTwinPanel';
import ContractViewPanel from './components/ContractViewPanel';
import AgentPanel from './components/AgentPanel';
import { 
  discoverAgreements, 
  extractDealState, 
  runLintChecks, 
  calculateImpact,
  fetchAgreementText,
  applySmartPatch,
  analyzeChangeRequest
} from './services/geminiService';
import { 
  AgreementCandidate, 
  DealState, 
  LintFinding, 
  AgentLog, 
  AgentType, 
  AgentStatus,
  Severity
} from './types';

type PanelId = 'twin' | 'contract' | 'agent';

const App: React.FC = () => {
  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<AgreementCandidate[]>([]);
  
  const [dealState, setDealState] = useState<DealState | null>(null);
  const [contractText, setContractText] = useState<string>('');
  
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [findings, setFindings] = useState<LintFinding[]>([]);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  
  const [highlightedCitation, setHighlightedCitation] = useState<string | null>(null);
  const [showDiscovery, setShowDiscovery] = useState(true);

  // Layout State
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);

  const primaryUploadRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const addLog = (agent: AgentType, message: string, status: AgentStatus) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      agent,
      message,
      status
    }, ...prev]);
  };

  const toggleMaximize = (panel: PanelId) => {
      setMaximizedPanel(prev => prev === panel ? null : panel);
  };

  // --- Handlers ---

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    addLog(AgentType.DISCOVERY, `Searching Public Filings for '${searchQuery}'`, AgentStatus.RUNNING);
    
    try {
        const results = await discoverAgreements(searchQuery);
        setCandidates(results);
        addLog(AgentType.DISCOVERY, `Found ${results.length} candidate agreements`, AgentStatus.COMPLETED);
    } catch (err) {
        addLog(AgentType.DISCOVERY, "Search failed to return structured data", AgentStatus.FAILED);
    } finally {
        setIsSearching(false);
    }
  };

  const processAgreementSelection = async (text: string, sourceName: string) => {
    setShowDiscovery(false);
    setCandidates([]);
    setContractText(text);
    setDealState(null);
    setFindings([]);

    // 1. Extraction Agent
    addLog(AgentType.EXTRACTION, `Instantiating Digital Twin object from ${sourceName}...`, AgentStatus.RUNNING);
    try {
        const state = await extractDealState(text);
        setDealState(state);
        addLog(AgentType.EXTRACTION, "Deal State instantiated successfully.", AgentStatus.COMPLETED);

        // 2. Graph Builder (Implicit)
        addLog(AgentType.GRAPH_BUILDER, "Building Dependency Graph...", AgentStatus.RUNNING);
        await new Promise(r => setTimeout(r, 500)); 
        addLog(AgentType.GRAPH_BUILDER, `Mapped ${state.definitions.length} terms and ${state.covenants.length} covenants.`, AgentStatus.COMPLETED);

        // 3. Lint Agent
        addLog(AgentType.LINT, "Running Semantic Consistency Checks...", AgentStatus.RUNNING);
        const issues = await runLintChecks(state, text);
        setFindings(issues);
        if (issues.length > 0) {
            addLog(AgentType.LINT, `Found ${issues.length} structural inconsistencies.`, AgentStatus.COMPLETED);
        } else {
            addLog(AgentType.LINT, "All checks passed. No inconsistencies found.", AgentStatus.COMPLETED);
        }

    } catch (e) {
        console.error(e);
        addLog(AgentType.EXTRACTION, "Critical Failure in Twin Instantiation", AgentStatus.FAILED);
    }
  };

  const handleSelectAgreement = async (candidate: AgreementCandidate) => {
    // 0. Sourcing Agent
    addLog(AgentType.DISCOVERY, `Retrieving full text for ${candidate.type} (${candidate.date})...`, AgentStatus.RUNNING);
    try {
      const rawText = await fetchAgreementText(candidate);
      addLog(AgentType.DISCOVERY, `Document retrieval complete (${rawText.length} chars).`, AgentStatus.COMPLETED);
      processAgreementSelection(rawText, candidate.type);
    } catch (e) {
      addLog(AgentType.DISCOVERY, "Failed to retrieve document text.", AgentStatus.FAILED);
    }
  };

  const handleUploadAgreement = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          addLog(AgentType.DISCOVERY, `File Uploaded: ${file.name}`, AgentStatus.COMPLETED);
          
          if (file.name.endsWith('.txt') || file.name.endsWith('.json')) {
              processAgreementSelection(content, file.name);
          } else {
              // Mocking PDF parsing for the demo by using the filename to trigger discovery/gen
              // In a real app, this would use pdf-parse
              addLog(AgentType.DISCOVERY, `Parsing PDF structure (simulated)...`, AgentStatus.RUNNING);
              const simulatedCandidate: AgreementCandidate = {
                  id: 'uploaded-1',
                  borrower: file.name.split('.')[0] || 'Unknown Borrower',
                  date: new Date().toISOString().split('T')[0],
                  type: 'Uploaded Credit Agreement',
                  preview: 'Parsed from local file upload'
              };
              handleSelectAgreement(simulatedCandidate);
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  const handleUploadChangeInstruction = (file: File) => {
      if (!dealState) {
          alert("Please instantiate an agreement first.");
          return;
      }
      
      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          addLog(AgentType.DISCOVERY, `Ingested Change Instruction: ${file.name}`, AgentStatus.COMPLETED);
          addLog(AgentType.LINT, "Analyzing instruction against current Deal State...", AgentStatus.RUNNING);
          
          try {
              const newFindings = await analyzeChangeRequest(content, dealState);
              setFindings(prev => [...newFindings, ...prev]); // Add new findings to top
              addLog(AgentType.LINT, `Analysis Complete. Flagged ${newFindings.length} potential conflicts.`, AgentStatus.COMPLETED);
          } catch(e) {
              addLog(AgentType.LINT, "Failed to analyze change instruction.", AgentStatus.FAILED);
          }
      };
      reader.readAsText(file);
  };

  const handleApplyPatch = async (findingId: string) => {
      const finding = findings.find(f => f.id === findingId);
      if (!finding || !dealState || patchingId) return;

      setPatchingId(findingId);
      addLog(AgentType.PATCH, `Attempting to resolve: ${finding.message}`, AgentStatus.RUNNING);
      
      // 1. Impact Analysis
      addLog(AgentType.IMPACT, "Calculating propagation impact...", AgentStatus.RUNNING);
      try {
        const impact = await calculateImpact("Resolving Finding", finding.message, dealState);
        addLog(AgentType.IMPACT, impact, AgentStatus.COMPLETED);

        // 2. Apply Smart Patch (Rewrite Text)
        addLog(AgentType.PATCH, "Generative Agent rewriting affected clause...", AgentStatus.RUNNING);
        const patchedText = await applySmartPatch(contractText, finding);
        
        // Update State
        setContractText(patchedText);
        setFindings(prev => prev.filter(f => f.id !== findingId));
        
        addLog(AgentType.PATCH, "Patch successfully applied. Document regenerated.", AgentStatus.COMPLETED);
      } catch (e) {
        addLog(AgentType.PATCH, "Failed to apply patch.", AgentStatus.FAILED);
      } finally {
          setPatchingId(null);
      }
  };

  const isWorking = isSearching || patchingId || logs.some(l => l.status === AgentStatus.RUNNING);

  // Helper for dynamic classes based on maximized state
  const getPanelClass = (id: PanelId, defaultClass: string) => {
      if (maximizedPanel === id) return "w-full flex-1 z-30 h-full transition-all duration-300";
      if (maximizedPanel && maximizedPanel !== id) return "hidden";
      return `${defaultClass} transition-all duration-300 h-full`;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Hidden Global Input */}
      <input type="file" ref={primaryUploadRef} className="hidden" onChange={handleUploadAgreement} />

      {/* Top Bar */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 shrink-0 z-20 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-500/50">AI</div>
          <h1 className="font-semibold tracking-tight text-lg">Loan Digital Twin <span className="opacity-50 font-light">| Compiler</span></h1>
        </div>
        <div className="flex items-center space-x-4">
            <button 
                onClick={() => primaryUploadRef.current?.click()}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-slate-300 transition-colors border border-slate-700 flex items-center gap-2"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Upload Agreement
            </button>
            <button 
                onClick={() => setShowDiscovery(true)}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-white font-medium transition-colors shadow-sm"
            >
                New Discovery
            </button>
            <div className="flex items-center space-x-2 text-xs text-slate-400 border-l border-slate-700 pl-4">
                <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></span>
                <span>{isWorking ? 'Agents Working...' : 'System Operational'}</span>
            </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Discovery Overlay Modal */}
        {showDiscovery && (
            <div className="absolute inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300">
                <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden border border-slate-700">
                    <div className="p-8 border-b border-slate-100 text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Instantiate Digital Twin</h2>
                        <p className="text-slate-500 mb-6">Enter borrower name to search SEC EDGAR or upload a Credit Agreement.</p>
                        
                        <div className="max-w-lg mx-auto space-y-4">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="e.g. Acme Industrial Corp"
                                    className="flex-1 px-4 py-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
                                />
                                <button 
                                    type="submit" 
                                    disabled={isSearching}
                                    className="bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {isSearching ? 'Scanning...' : 'Discover'}
                                </button>
                            </form>
                            
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-slate-400">Or</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => primaryUploadRef.current?.click()}
                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                            >
                                Upload Local Agreement (PDF / DOCX / TXT)
                            </button>
                        </div>
                    </div>
                    
                    {candidates.length > 0 && (
                        <div className="bg-slate-50 p-4 max-h-80 overflow-y-auto">
                             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Candidates Found</div>
                             <div className="space-y-2">
                                {candidates.map(c => (
                                    <div key={c.id} onClick={() => handleSelectAgreement(c)} className="bg-white p-4 rounded border border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-slate-700 group-hover:text-blue-600">{c.borrower}</span>
                                            <span className="text-xs font-mono text-slate-500">{c.date}</span>
                                        </div>
                                        <div className="text-sm text-slate-600 mt-1">{c.type}</div>
                                        <div className="text-xs text-slate-400 mt-2 font-mono truncate">{c.preview}</div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Column 1: Digital Twin (25%) */}
        <div className={getPanelClass('twin', 'w-1/4 min-w-[300px] shadow-xl z-10')}>
          <DigitalTwinPanel 
            data={dealState} 
            onSelectCitation={setHighlightedCitation} 
            isLoading={!dealState && !showDiscovery && logs.length > 0}
            isMaximized={maximizedPanel === 'twin'}
            onToggleMaximize={() => toggleMaximize('twin')}
          />
        </div>

        {/* Column 2: Contract View (50%) */}
        <div className={getPanelClass('contract', 'w-1/2 min-w-[400px]')}>
          <ContractViewPanel 
            text={contractText} 
            findings={findings}
            highlightedCitation={highlightedCitation}
            patchingId={patchingId}
            isMaximized={maximizedPanel === 'contract'}
            onToggleMaximize={() => toggleMaximize('contract')}
          />
        </div>

        {/* Column 3: Agents & Issues (25%) */}
        <div className={getPanelClass('agent', 'w-1/4 min-w-[300px] border-l border-slate-200 shadow-xl z-10')}>
            <AgentPanel 
                logs={logs} 
                findings={findings}
                onApplyPatch={handleApplyPatch}
                onUploadChangeInstruction={handleUploadChangeInstruction}
                patchingId={patchingId}
                isMaximized={maximizedPanel === 'agent'}
                onToggleMaximize={() => toggleMaximize('agent')}
            />
        </div>

      </div>
    </div>
  );
};

export default App;