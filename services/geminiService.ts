import { GoogleGenAI, Type } from "@google/genai";
import { 
  AgreementCandidate, 
  DealState, 
  LintFinding, 
  Severity,
  AgentType
} from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Optimization: Use Flash for heavy lifting (Text Gen, Extraction) to reduce latency
const FAST_MODEL = 'gemini-3-flash-preview';
const REASONING_MODEL = 'gemini-3-pro-preview'; 

/**
 * Agent 1: Discovery Agent
 * Uses Gemini to find/hallucinate plausible real-world filings based on its training data.
 */
export const discoverAgreements = async (query: string): Promise<AgreementCandidate[]> => {
  const model = ai.models;
  
  const prompt = `
    You are a financial data discovery agent. 
    Search your internal knowledge base for public SEC EDGAR filings (Credit Agreements, Amendments) for the company: "${query}".
    
    If specific filings are not found, generate 3 highly plausible, realistic candidates based on the company's sector and typical debt structure.
    
    Return a JSON array of 3 candidates.
  `;

  try {
    const result = await model.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              borrower: { type: Type.STRING },
              date: { type: Type.STRING, description: "YYYY-MM-DD" },
              type: { type: Type.STRING, description: "e.g. Credit Agreement, Amendment No. 1" },
              preview: { type: Type.STRING, description: "Brief description of facilities, e.g. '$500M Term Loan B'" }
            }
          }
        }
      }
    });

    if (result.text) {
        return JSON.parse(result.text) as AgreementCandidate[];
    }
    throw new Error("No text returned from discovery agent");
  } catch (e) {
    console.error("Discovery failed", e);
    return [];
  }
};

/**
 * Helper: Generates the full text of the agreement dynamically.
 * Since we can't scrape EDGAR directly in browser without a proxy, we ask the LLM to reproduce the text.
 */
export const fetchAgreementText = async (candidate: AgreementCandidate): Promise<string> => {
    const model = ai.models;
    const prompt = `
      You are a legal document retrieval system.
      Reproduce the Full Text of the following loan document as accurately as possible based on your training data.
      
      Document: ${candidate.type}
      Borrower: ${candidate.borrower}
      Date: ${candidate.date}
      
      Requirements:
      1. Include a realistic Preamble.
      2. Include a detailed "ARTICLE I DEFINITIONS" section with at least 15 key defined terms (EBITDA, Leverage Ratio, Permitted Liens, etc.).
      3. Include "ARTICLE II THE CREDITS" detailing the facilities.
      4. Include "ARTICLE VI FINANCIAL COVENANTS" with specific thresholds.
      5. The output must be raw plain text, formatted like a legal contract.
      6. Do not use placeholders. Generate realistic legal text.
    `;

    // OPTIMIZATION: Switched to FAST_MODEL (Flash) for significantly faster text generation.
    const result = await model.generateContent({
        model: FAST_MODEL, 
        contents: prompt
    });

    return result.text || "Failed to generate agreement text.";
};

/**
 * Agent 2: Extraction Agent
 * Extracts structured DealState from the text.
 */
export const extractDealState = async (text: string): Promise<DealState> => {
  const model = ai.models;
  
  const prompt = `
    You are a highly specialized Loan Agreement Extraction Agent. 
    Analyze the provided Credit Agreement text.
    Extract the Deal Structure into a strict JSON format.
    
    Text:
    ${text.substring(0, 40000)} // Context window
  `;

  try {
    // OPTIMIZATION: Switched to FAST_MODEL (Flash) for faster JSON extraction.
    const result = await model.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            borrower: { type: Type.STRING },
            agreementDate: { type: Type.STRING },
            facilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  maturityDate: { type: Type.STRING },
                  citation: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                }
              }
            },
            covenants: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  threshold: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['FINANCIAL', 'NEGATIVE', 'AFFIRMATIVE'] },
                  citation: { type: Type.STRING },
                  dependencies: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            definitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definitionText: { type: Type.STRING },
                  id: { type: Type.STRING },
                  citation: { type: Type.STRING },
                  usedIn: { type: Type.ARRAY, items: { type: Type.STRING } },
                  isAmbiguous: { type: Type.BOOLEAN }
                }
              }
            },
            reporting: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  citation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (result.text) {
        return JSON.parse(result.text) as DealState;
    }
    throw new Error("Empty response from extraction agent");

  } catch (e) {
    console.error("Extraction failed", e);
    throw e;
  }
};

/**
 * Agent 4: Lint / Consistency Agent
 * Real semantic checks using the LLM to compare structured state vs raw text.
 */
export const runLintChecks = async (dealState: DealState, text: string): Promise<LintFinding[]> => {
    const model = ai.models;
    
    // We keep Linting on the REASONING_MODEL (Pro) because it requires deeper logic 
    // to compare the abstraction (JSON) against the evidence (Text).
    const prompt = `
        You are a Loan Agreement Compiler/Linter.
        
        Task:
        Compare the extracted DEAL STATE JSON against the ORIGINAL CONTRACT TEXT.
        Identify structural inconsistencies, missing definitions, or threshold mismatches.

        DEAL STATE:
        ${JSON.stringify(dealState, null, 2)}

        ORIGINAL TEXT:
        ${text.substring(0, 30000)}

        Rules:
        1. Check if defined terms in Deal State are actually present in Article I of the Text.
        2. Check if Financial Covenant thresholds in Deal State match the text in Article VI exactly.
        3. Identify any vague terms or circular references.
        
        Return a JSON array of findings.
    `;

    try {
        const result = await model.generateContent({
            model: REASONING_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            severity: { type: Type.STRING, enum: ['CRITICAL', 'WARNING', 'INFO'] },
                            message: { type: Type.STRING },
                            affectedClauseId: { type: Type.STRING },
                            suggestion: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        if (result.text) {
            return JSON.parse(result.text) as LintFinding[];
        }
        return [];
    } catch (e) {
        console.error("Linting failed", e);
        return [];
    }
};

/**
 * Agent 5: Change Impact Agent
 * Real graph traversal / logic reasoning via LLM.
 */
export const calculateImpact = async (changedTerm: string, newValue: string, dealState: DealState): Promise<string> => {
    const model = ai.models;
    const prompt = `
        You are a Change Impact Analysis Agent.
        
        Scenario:
        The user wants to change the definition or value of "${changedTerm}" to "${newValue}".
        
        Deal Dependency Graph (derived from State):
        - Covenants: ${dealState.covenants.map(c => c.name).join(', ')}
        - Definitions: ${dealState.definitions.map(d => d.term).join(', ')}
        
        Task:
        Analyze the likely impact. Which covenants rely on this term? Which other definitions might break?
        
        Return a concise, professional impact summary paragraph (plain text).
    `;

    const result = await model.generateContent({
        model: FAST_MODEL, // Flash is sufficient for this graph traversal
        contents: prompt
    });

    return result.text || "Could not calculate impact.";
};

/**
 * Agent 6: Patch Agent (Real Text Rewriting)
 */
export const applySmartPatch = async (text: string, finding: LintFinding): Promise<string> => {
    const model = ai.models;
    const prompt = `
        You are a Legal AI Patch Agent.
        
        Task:
        Fix the following inconsistency in the Loan Agreement Text.
        Rewrite ONLY the affected clause/section to resolve the issue.
        Preserve the surrounding legal language and style exactly.
        
        Issue: "${finding.message}"
        Affected Context: "${finding.affectedClauseId}"
        Suggestion: "${finding.suggestion}"
        
        Original Document Text (excerpt):
        ${text}
        
        Output:
        Return the FULL Document Text with the fix applied.
        Do NOT add markdown blocks or commentary. Just the raw text.
    `;

    const result = await model.generateContent({
        model: FAST_MODEL,
        contents: prompt
    });

    return result.text || text;
};

/**
 * Agent 7: Intent Analysis Agent
 * Analyzes a change instruction (Term Sheet/Memo) against the current Deal State.
 */
export const analyzeChangeRequest = async (requestText: string, dealState: DealState): Promise<LintFinding[]> => {
    const model = ai.models;
    const prompt = `
        You are a Commercial Intent Analysis Agent.
        
        Task:
        Compare the "Change Instruction" (Commercial Intent) against the current "Deal State".
        Identify deviations where the instruction conflicts with the current agreement.
        
        Change Instruction:
        "${requestText}"
        
        Current Deal State:
        ${JSON.stringify(dealState, null, 2)}
        
        Output:
        Return a JSON array of Findings (Potential Conflicts).
        Mark them as WARNING or INFO.
    `;

    try {
        const result = await model.generateContent({
            model: REASONING_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            severity: { type: Type.STRING, enum: ['WARNING', 'INFO'] },
                            message: { type: Type.STRING },
                            affectedClauseId: { type: Type.STRING },
                            suggestion: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        if (result.text) {
             const findings = JSON.parse(result.text) as LintFinding[];
             // Ensure unique IDs
             return findings.map(f => ({...f, id: Math.random().toString(36).substr(2, 9)}));
        }
        return [];
    } catch (e) {
        console.error("Intent analysis failed", e);
        return [];
    }
};

// No longer exporting mock text, forcing real generation
export const GET_MOCK_TEXT = () => "";