import React, { useState, useEffect } from 'react';
import { DealState, Facility, Covenant, Definition } from '../types';

interface Props {
  data: DealState | null;
  onSelectCitation: (citation: string) => void;
  isLoading: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

const DigitalTwinPanel: React.FC<Props> = ({ data, onSelectCitation, isLoading, isMaximized, onToggleMaximize }) => {
  // --- Loading Animation State ---
  const [loadingStep, setLoadingStep] = useState(0);
  
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const steps = [
        "Reading Legal Text...",
        "Tokenizing Clauses...",
        "Identifying Defined Terms...",
        "Mapping Covenants...",
        "Validating Capital Structure...",
        "Finalizing Digital Twin..."
    ];
    
    const interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % steps.length);
    }, 800); // Change text every 800ms to keep user engaged

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleDownloadJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loan_twin_${data.agreementDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    const steps = [
        "Reading Legal Text...",
        "Tokenizing Clauses...",
        "Identifying Defined Terms...",
        "Mapping Covenants...",
        "Validating Capital Structure...",
        "Finalizing Digital Twin..."
    ];
    
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 border-r border-slate-200 p-8 font-mono">
        <div className="w-12 h-12 mb-6 relative">
             <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest">Compiler Running</div>
        <div className="text-xs text-slate-500 h-6 text-center">
            {steps[loadingStep]}
        </div>
        <div className="mt-8 w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-progress-indeterminate"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white border-r border-slate-200">
        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        <span className="text-sm font-medium">No Agreement Loaded</span>
      </div>
    );
  }

  const SectionHeader = ({ title, count }: { title: string; count?: number }) => (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-y border-slate-200">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{title}</h3>
      {count !== undefined && <span className="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600">{count}</span>}
    </div>
  );

  const ConfidencePill = ({ val }: { val: number }) => {
    let color = 'bg-green-100 text-green-700';
    if (val < 0.9) color = 'bg-yellow-100 text-yellow-700';
    if (val < 0.8) color = 'bg-red-100 text-red-700';
    return (
        <span className={`text-[10px] px-1.5 rounded-sm font-mono ml-2 ${color}`}>
            {(val * 100).toFixed(0)}%
        </span>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-green-600 uppercase">Live Twin</span>
            </div>
            <div className="flex gap-1">
                <button 
                    onClick={handleDownloadJson}
                    className="text-[10px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    title="Export Digital Twin JSON"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    JSON
                </button>
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
        </div>
        <h2 className="text-lg font-bold text-slate-800 leading-tight">{data.borrower}</h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">ID: {data.agreementDate} • {data.facilities.length} Facilities</p>
      </div>

      {/* Facilities */}
      <SectionHeader title="Capital Structure" count={data.facilities.length} />
      <div className="divide-y divide-slate-100">
        {data.facilities.map((fac) => (
          <div key={fac.id} className="p-4 hover:bg-slate-50 cursor-pointer group" onClick={() => onSelectCitation(fac.citation)}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">{fac.name}</span>
              <span className="text-xs font-mono text-slate-400">{fac.citation}</span>
            </div>
            <div className="flex items-baseline justify-between">
                <div className="text-sm font-mono text-slate-900">
                    {(fac.amount / 1000000).toLocaleString()}M {fac.currency}
                </div>
                <div className="text-xs text-slate-500">
                    Matures: {fac.maturityDate}
                </div>
            </div>
            <div className="mt-2 flex items-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Confidence</span>
                <ConfidencePill val={fac.confidence || 0.99} />
            </div>
          </div>
        ))}
      </div>

      {/* Covenants */}
      <SectionHeader title="Financial Covenants" count={data.covenants.length} />
      <div className="divide-y divide-slate-100">
        {data.covenants.map((cov) => (
          <div key={cov.id} className="p-4 hover:bg-slate-50 cursor-pointer group" onClick={() => onSelectCitation(cov.citation)}>
             <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 truncate pr-2">{cov.name}</span>
              <span className="text-xs font-mono text-slate-400 whitespace-nowrap">{cov.citation}</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{cov.threshold}</span>
                <span className="text-[10px] text-slate-400">{cov.type}</span>
            </div>
            {/* Dependencies visualizer - tiny dots */}
            <div className="mt-2 flex items-center space-x-1">
                <span className="text-[10px] text-slate-400">Depends on:</span>
                {cov.dependencies.map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-slate-300" title={d}></div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Definitions */}
      <SectionHeader title="Defined Terms" count={data.definitions.length} />
      <div className="divide-y divide-slate-100">
          {data.definitions.map((def) => (
              <div key={def.id} className="p-3 hover:bg-slate-50 cursor-pointer text-xs" onClick={() => onSelectCitation(def.citation)}>
                  <div className="font-bold text-slate-700 mb-1 font-mono">"{def.term}"</div>
                  <div className="text-slate-500 line-clamp-2">{def.definitionText}</div>
                  <div className="mt-2 flex space-x-2">
                      <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{def.usedIn.length} usages</span>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default DigitalTwinPanel;