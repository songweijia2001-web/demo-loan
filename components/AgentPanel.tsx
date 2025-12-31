import React, { useRef } from 'react';
import { AgentLog, LintFinding, AgentStatus, AgentType, Severity } from '../types';

interface Props {
  logs: AgentLog[];
  findings: LintFinding[];
  onApplyPatch: (findingId: string) => void;
  onUploadChangeInstruction: (file: File) => void;
  patchingId: string | null;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

const AgentPanel: React.FC<Props> = ({ logs, findings, onApplyPatch, onUploadChangeInstruction, patchingId, isMaximized, onToggleMaximize }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStatusColor = (status: AgentStatus) => {
      switch(status) {
          case AgentStatus.RUNNING: return 'text-blue-600 animate-pulse';
          case AgentStatus.COMPLETED: return 'text-green-600';
          case AgentStatus.FAILED: return 'text-red-600';
          default: return 'text-slate-400';
      }
  };

  const handleDownloadReport = () => {
    if (findings.length === 0 && logs.length === 0) return;
    const report = {
        generatedAt: new Date().toISOString(),
        findings,
        logs: logs.map(l => ({ time: l.timestamp, agent: l.agent, message: l.message }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lint_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      {/* Action / Input Area */}
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Intent & Instructions</h3>
            <button
                onClick={onToggleMaximize}
                className="text-slate-500 hover:bg-slate-200 p-1 rounded transition-colors"
                title={isMaximized ? "Restore" : "Maximize"}
            >
                 {isMaximized ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H4m0 0v6m0-6l5 5m5-5V4m0 0h6m0 0l-5 5m5-5v6m0-6l-5 5M14 10h6m-6 0v6m0-6l-5-5" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                )}
            </button>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                    if (e.target.files?.[0]) onUploadChangeInstruction(e.target.files[0]);
                    e.target.value = ''; // Reset
                }}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={!!patchingId}
                className={`flex-1 py-2 text-xs font-semibold rounded border transition-colors flex items-center justify-center gap-2
                    ${!!patchingId ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'}
                `}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Upload Change Instruction
            </button>
            <button 
                onClick={handleDownloadReport}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                title="Download Lint Report"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
            Upload Term Sheet, Redline, or Memo (.txt, .md) to analyze against current twin.
        </p>
      </div>

      {/* Agent Timeline */}
      <div className="h-1/3 border-b border-slate-200 flex flex-col min-h-[150px]">
        <div className="p-2 bg-slate-50 border-b border-slate-200">
             <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Agent Operations</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {logs.length === 0 && <div className="text-xs text-slate-400 text-center italic mt-4">System Idle</div>}
            {logs.map(log => (
                <div key={log.id} className="flex gap-3 text-xs">
                    <div className="w-16 font-mono text-slate-400 text-[10px] text-right pt-0.5">
                        {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                             <span className={`font-bold ${getStatusColor(log.status)}`}>[{log.agent}]</span>
                             <span className="text-slate-700">{log.message}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Issues / Linting */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center">
             <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Active Findings</h3>
             <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{findings.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-0">
            {findings.length === 0 ? (
                <div className="p-8 text-center">
                    <div className="text-green-500 mb-2">●</div>
                    <p className="text-sm text-slate-500">System Clean. No inconsistencies detected.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {findings.map(finding => {
                        const isPatchingThis = patchingId === finding.id;
                        const isSystemBusy = patchingId !== null && !isPatchingThis;
                        
                        return (
                        <div key={finding.id} className="p-4 hover:bg-red-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${finding.severity === Severity.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {finding.severity}
                                </span>
                                <span className="text-xs font-mono text-slate-400 truncate max-w-[150px]">{finding.affectedClauseId}</span>
                            </div>
                            <p className="text-sm text-slate-800 font-medium mb-2">{finding.message}</p>
                            {finding.suggestion && (
                                <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-3">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Agent Suggestion</p>
                                    <p className="text-xs text-slate-700 italic">"{finding.suggestion}"</p>
                                </div>
                            )}
                            <button 
                                onClick={() => onApplyPatch(finding.id)}
                                disabled={isPatchingThis || isSystemBusy}
                                className={`w-full py-1.5 border text-xs font-medium rounded transition-all flex items-center justify-center gap-2 group
                                    ${isPatchingThis 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-wait' 
                                        : isSystemBusy
                                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300'
                                    }
                                `}
                            >
                                {isPatchingThis ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Rewriting Clause...</span>
                                    </>
                                ) : isSystemBusy ? (
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Patch in Progress...
                                    </span>
                                ) : (
                                    <>
                                        <span className="group-hover:hidden">⚡ Apply Agent Patch</span>
                                        <span className="hidden group-hover:inline">Resolve Issue</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )})}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AgentPanel;