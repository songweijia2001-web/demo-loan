import React from 'react';
import { LintFinding } from '../types';

interface Props {
  text: string;
  findings: LintFinding[];
  highlightedCitation: string | null;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

const ContractViewPanel: React.FC<Props> = ({ text, findings, highlightedCitation, isMaximized, onToggleMaximize }) => {
  
  const handleDownloadDoc = () => {
      if (!text) return;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agreement_v_patched.txt`;
      link.click();
      URL.revokeObjectURL(url);
  };

  // A simple mechanism to highlight text sections. 
  // In a real production app, this would use a proper text tokenizer/annotator.
  const renderText = () => {
    if (!text) return <div className="p-10 text-center text-slate-400">Select or Upload an agreement to view evidence.</div>;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
        if (!line.trim()) return <br key={idx} />;

        // Check for headers to style them
        const isHeader = line.toUpperCase() === line && line.length > 5;
        const isArticle = line.trim().startsWith('ARTICLE');
        const isSection = line.trim().startsWith('Section');

        // Check if this line matches our highlight request (very naive string match for demo)
        const isHighlighted = highlightedCitation && line.includes(highlightedCitation);
        
        // Check for lint errors in this line
        const relevantFinding = findings.find(f => line.includes(f.affectedClauseId));

        let className = "font-serif text-sm leading-relaxed text-slate-800 mb-2 px-8";
        if (isArticle) className += " text-lg font-bold mt-6 text-slate-900 border-b border-slate-200 pb-2";
        else if (isHeader) className += " font-bold text-center mt-4";
        else if (isSection) className += " font-semibold mt-3 text-slate-900";

        // Highlight logic
        let bgClass = "";
        if (isHighlighted) bgClass = "bg-blue-50 border-l-4 border-blue-500 pl-7"; // Adjust padding when bordered
        if (relevantFinding) {
            bgClass = relevantFinding.severity === 'CRITICAL' ? "bg-red-50 border-l-4 border-red-500 pl-7" : "bg-yellow-50 border-l-4 border-yellow-500 pl-7";
        }

        return (
            <div key={idx} className={`${className} ${bgClass} transition-colors duration-300 relative group`}>
                {line}
                {relevantFinding && (
                    <div className="absolute right-2 top-0 transform translate-x-full ml-2 w-48 z-20 hidden group-hover:block">
                         <div className={`p-2 rounded shadow-lg text-xs border ${relevantFinding.severity === 'CRITICAL' ? 'bg-red-100 border-red-200 text-red-800' : 'bg-yellow-100 border-yellow-200 text-yellow-800'}`}>
                            <strong>LINT:</strong> {relevantFinding.message}
                         </div>
                    </div>
                )}
            </div>
        );
    });
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col border-r border-slate-200">
      <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Document Evidence</h3>
        <div className="flex space-x-2 items-center">
            {text && (
                <button 
                    onClick={handleDownloadDoc}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    title="Download Current Document Text"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    DOCX
                </button>
            )}
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">Read-Only</span>
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
      <div className="flex-1 overflow-y-auto py-8">
        <div className="max-w-3xl mx-auto bg-white shadow-sm min-h-full border-x border-slate-200 py-8">
            {renderText()}
        </div>
      </div>
    </div>
  );
};

export default ContractViewPanel;