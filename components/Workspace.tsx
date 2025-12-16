
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  FileTextIcon, 
  SearchIcon, 
  SparklesIcon, 
  UploadIcon, 
  PlusIcon,
  ZoomInIcon,
  ZoomOutIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  TargetIcon,
  BarChartIcon,
  LoaderIcon,
  ExternalLinkIcon,
  NetworkIcon
} from './Icons';
import { AIAnalysisResult, RelatedPaper, Reference } from '../types';
import ChatAssistant from './ChatAssistant';
import CitationGraph from './CitationGraph';

const Workspace: React.FC = () => {
  // --- Resizing Logic ---
  const [leftWidth, setLeftWidth] = useState(320); 
  const [rightWidth, setRightWidth] = useState(350); 
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- PDF State ---
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  
  // --- Text & AI State ---
  const [extractedText, setExtractedText] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Controls Right Panel Loading
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Conflict Detection State ---
  const [relatedPapers, setRelatedPapers] = useState<RelatedPaper[]>([]);
  const [isSearching, setIsSearching] = useState(false); // Controls Left Panel Loading
  const [searchStatus, setSearchStatus] = useState('');
  
  // --- Graph State ---
  const [showGraph, setShowGraph] = useState(false);
  const [references, setReferences] = useState<Reference[]>([]);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  
  // --- UI State ---
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // --- Resizing Handlers ---
  const startResizingLeft = () => setIsResizingLeft(true);
  const startResizingRight = () => setIsResizingRight(true);
  const stopResizing = () => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  };

  const resize = (mouseMoveEvent: MouseEvent) => {
    if (isResizingLeft && containerRef.current) {
        const newWidth = mouseMoveEvent.clientX - containerRef.current.getBoundingClientRect().left;
        if (newWidth > 200 && newWidth < 600) setLeftWidth(newWidth);
    }
    if (isResizingRight && containerRef.current) {
        const containerRight = containerRef.current.getBoundingClientRect().right;
        const newWidth = containerRight - mouseMoveEvent.clientX;
        if (newWidth > 300 && newWidth < 800) setRightWidth(newWidth);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizingLeft, isResizingRight]);

  // --- Card Expansion Logic ---
  const toggleCard = (index: number) => {
    setExpandedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
  };

  // --- PDF.js Rendering ---
  const renderPage = async (pageNumber: number, pdf: any) => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Cancel any pending render task on this canvas
        if (renderTaskRef.current) {
            try {
                renderTaskRef.current.cancel();
            } catch (e) {
                // Ignore cancellation errors
            }
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      }
    } catch (err: any) {
      if (err.name === 'RenderingCancelledException' || err.message?.includes('cancelled')) {
        // Expected behavior when cancelled
        return;
      }
      console.error("Error rendering page:", err);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage, pdfDoc);
    }
  }, [pdfDoc, currentPage, scale]);

  // --- File Upload & Text Extraction ---
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file');
        return;
    }

    setPdfFile(file);
    setIsPdfLoading(true);
    setAnalysisResult(null);
    setRelatedPapers([]);
    setReferences([]);
    setExtractedText("");
    setError(null);
    setCurrentPage(1);
    setExpandedCards(new Set());
    
    // Clear previous render task
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
      renderTaskRef.current = null;
    }
    
    const url = URL.createObjectURL(file);

    try {
        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) throw new Error("PDF.js library not loaded");

        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setIsPdfLoading(false);

        // Extract Text & Start Parallel Analysis
        extractAndStartWorkflow(pdf);
        
    } catch (e: any) {
        console.error("Error loading PDF:", e);
        setError("Failed to load PDF. Please try another file.");
        setIsPdfLoading(false);
    }
  };

  const extractAndStartWorkflow = async (pdf: any) => {
    if (!pdf) {
      setError("Invalid PDF file");
      return;
    }
    
    setError(null);

    try {
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 15); // Increased page limit slightly
      
      for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + ' ';
      }
      
      setExtractedText(fullText);
      
      // Start Parallel Execution
      runFullAnalysis(fullText);

    } catch (err) {
      console.error("Error extracting text:", err);
      setError("Failed to extract text from PDF.");
    }
  };

  // --- Utility: Robust Retry Helper ---
  const retryOperation = async (fn: () => Promise<any>, retries = 3, initialDelay = 2000): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
       const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
       
      if (retries > 0) {
        // If rate limited, wait significantly longer (exponential backoff starting at 5s)
        const delay = isRateLimit ? 5000 + ((3 - retries) * 3000) : initialDelay;
        console.log(`Retrying operation... (${retries} attempts left) due to ${isRateLimit ? 'Rate Limit' : 'Error'}. Waiting ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryOperation(fn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  };

  // --- CORE AI LOGIC (PARALLEL EXECUTION) ---

  const runFullAnalysis = async (text: string) => {
    // Set loading states
    setIsAnalyzing(true);
    setIsSearching(true);
    setSearchStatus("Initializing analysis...");
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Task 1: Analyze Paper (Resolves fast to show Right Panel)
    const analysisTask = retryOperation(() => analyzePaper(text, ai)).then(result => {
        setAnalysisResult(result);
        setIsAnalyzing(false); // Immediate update for UI responsiveness
        return result;
    });

    // Task 2: Search Related Papers (Takes longer)
    // Delay search start slightly to prioritize analysis and reduce initial burst
    const searchTask = new Promise<RelatedPaper[]>(resolve => {
        setTimeout(() => {
            searchRelatedPapers(text, ai).then(resolve);
        }, 2000);
    });
    
    try {
      setSearchStatus("Searching literature...");
      
      // Coordinate completion
      const [analysisData, searchData] = await Promise.all([analysisTask, searchTask]);
      
      // Task 3: Conflict Analysis (Needs both)
      if (searchData && searchData.length > 0) {
        setSearchStatus("Detecting conflicts & validating...");
        const categorizedPapers = await retryOperation(() => analyzeConflicts(analysisData, searchData, ai));
        setRelatedPapers(categorizedPapers);
      } else {
        setRelatedPapers([]);
        setSearchStatus("No related papers found.");
      }
      
    } catch (err: any) {
      console.error("Workflow Error:", err);
      if (!analysisResult) {
          setError(err?.message || "An error occurred during analysis.");
      }
    } finally {
      setIsAnalyzing(false);
      setIsSearching(false);
      setSearchStatus("");
    }
  };

  // TASK 1: Analyze the uploaded paper
  const analyzePaper = async (text: string, ai: GoogleGenAI): Promise<AIAnalysisResult> => {
    try {
        const prompt = `
        Analyze the following research paper text. Extract structured information.
        
        1. Title of the paper (infer from content if not explicit)
        2. A brief 2-3 sentence summary of the paper
        3. Sample Size / Population: Describe the training/testing events, participants, or datasets (e.g., "A training dataset comprised 2.4 million events...").
        4. Methodology: Briefly describe the study design, tools, or simulations used (e.g., "Simulation-based study using Graph Neural Networks (GNNs)...").
        5. Key Findings: Extract 4-6 main results as bullet points.
        6. Statistical Tests Used: List any tests mentioned.
        7. Limitations: Extract 3-5 concerns or limitations.
        
        Paper Text: ${text.substring(0, 30000)}
        
        Return valid JSON matching this exact structure:
        {
          "title": "string",
          "summary": "string",
          "sampleSize": "string",
          "methodology": "string",
          "keyFindings": ["string1", "string2", ...],
          "statisticalTests": ["string1", "string2", ...],
          "limitations": ["string1", "string2", ...]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        sampleSize: { type: Type.STRING },
                        methodology: { type: Type.STRING },
                        keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
                        statisticalTests: { type: Type.ARRAY, items: { type: Type.STRING } },
                        limitations: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "summary", "sampleSize", "methodology", "keyFindings", "statisticalTests", "limitations"]
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        
        // Return with safe defaults
        return {
            title: result.title || "Untitled Paper",
            summary: result.summary || "No summary available.",
            sampleSize: result.sampleSize || "Not specified",
            methodology: result.methodology || "Not specified",
            keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
            statisticalTests: Array.isArray(result.statisticalTests) ? result.statisticalTests : [],
            limitations: Array.isArray(result.limitations) ? result.limitations : []
        };
    } catch (e) {
        console.error("Paper analysis failed", e);
        throw e; // Let retry handle it
    }
  };

  // TASK 2: Search for related papers
  const searchRelatedPapers = async (text: string, ai: GoogleGenAI): Promise<RelatedPaper[]> => {
    try {
        // ArXiv Fallback - Fetch papers directly from arXiv API
        const arxivFallback = async (searchTerm: string) => {
          try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(' ').slice(0, 5).join('+');
            const url = `https://export.arxiv.org/api/query?search_query=all:${cleanTerm}&start=0&max_results=5`;
            
            const response = await fetch(url);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'text/xml');
            
            const entries = Array.from(xml.getElementsByTagName('entry'));
            return entries.map(entry => {
              const title = entry.getElementsByTagName('title')[0]?.textContent?.trim() || '';
              const summary = entry.getElementsByTagName('summary')[0]?.textContent?.trim() || '';
              const authors = Array.from(entry.getElementsByTagName('author'))
                .map(a => a.getElementsByTagName('name')[0]?.textContent)
                .filter(Boolean)
                .join(', ')
                .substring(0, 100);
              const published = entry.getElementsByTagName('published')[0]?.textContent || '';
              const link = entry.getElementsByTagName('id')[0]?.textContent || '';
              
              return {
                title: title.replace(/\n/g, ' '),
                authors: authors || 'Unknown',
                year: new Date(published).getFullYear(),
                journal: 'arXiv Preprint',
                methodology: 'See paper',
                finding: summary.substring(0, 200) + '...',
                url: link
              };
            }).filter(p => p.title.length > 10);
          } catch {
            return [];
          }
        };

        // 2a. Generate Queries
        const queryRes = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an academic search strategist. Your goal is to generate diverse search queries that will find:
1. Papers that SUPPORT the uploaded paper's approach
2. Papers that CONFLICT with or CHALLENGE the uploaded paper (Crucial)
3. Papers that COMPARE different approaches
4. Papers that REVIEW the field
5. Papers that identify LIMITATIONS

UPLOADED PAPER ANALYSIS:
- Main topic: [AUTO-EXTRACT]
- Domain: [AUTO-EXTRACT]
- Methods used: [AUTO-EXTRACT all methods mentioned]
- Key terms: [AUTO-EXTRACT 10-15 technical terms]
- Problem being solved: [AUTO-EXTRACT]

QUERY GENERATION RULES:
- Generate 6 queries.
- PRIORITIZE finding "Alternative Approaches" and "Critiques".
- Use terms like "vs", "comparison", "limitations of", "critique", "challenges".

OUTPUT FORMAT JSON:
{
  "queries": [
    "query1", "query2", ...
  ]
}

Text: ${text.substring(0, 5000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { queries: { type: Type.ARRAY, items: { type: Type.STRING } } }
                }
            }
        }));
        
        const { queries } = JSON.parse(queryRes.text || '{"queries":[]}');
        const safeQueries = Array.isArray(queries) ? queries : [];
        if (safeQueries.length === 0) return [];

        console.log("Generated Queries:", safeQueries);

        // Process FEWER queries to stay within limits. 
        // 3 Queries is a safe balance between breadth and rate limits.
        const activeQueries = safeQueries.slice(0, 3);

        // 2b. Execute Search SEQUENTIALLY to avoid burst rate limits (429 errors)
        const results: any[] = [];
        
        for (const query of activeQueries) {
            try {
                // Add a small delay between requests to be good citizens and avoid rate limits
                if (results.length > 0) {
                    await new Promise(r => setTimeout(r, 1500)); 
                }

                const searchResult = await retryOperation(async () => {
                     const searchRes = await ai.models.generateContent({
                      model: 'gemini-2.5-flash',
                      contents: `You are an academic paper search assistant.

                Search Google Scholar, arXiv, IEEE Xplore, and PubMed for papers matching: "${query}"

                CRITICAL REQUIREMENTS:
                1. Find 4-5 REAL academic papers.
                2. Prioritize papers with FREE PDF access.
                3. Papers must be from 2010-2025 (Allow older papers if they are seminal critiques).
                4. Include direct URLs to papers.

                For EACH paper return this EXACT structure:
                {
                  "title": "Full paper title",
                  "authors": "Author names (max 100 chars)",
                  "year": 2024,
                  "journal": "Journal/Conference name",
                  "methodology": "Brief method (or 'See paper')",
                  "finding": "Main result in 1-2 sentences",
                  "url": "Direct link to paper or PDF"
                }

                Return ONLY a valid JSON array: [{"title":"...", ...}, {...}]`,
                      config: { 
                        tools: [{ googleSearch: {} }]
                      }
                    });

                    // Better JSON extraction
                    let jsonText = searchRes.text || '[]';
                    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    
                    // Handle case where response is not an array
                    if (!jsonText.startsWith('[')) {
                       const start = jsonText.indexOf('[');
                       const end = jsonText.lastIndexOf(']');
                       if (start !== -1 && end !== -1) {
                           jsonText = jsonText.substring(start, end + 1);
                       } else {
                           return [];
                       }
                    }
                    
                    const papers = JSON.parse(jsonText);
                    
                    if (!Array.isArray(papers)) return [];
                    
                    // Validate papers
                    return papers.filter((p: any) => 
                      p?.title && 
                      p.title.length > 10 &&
                      p?.year >= 2010 &&
                      p?.authors
                    );
                }); // End retryOperation

                if (searchResult) {
                    results.push(searchResult);
                }

            } catch (e: any) {
                console.error(`❌ Search failed for "${query}":`, e.message);
                // Continue to next query even if this one failed
            }
        }
        
        // Run arXiv searches for top 2 queries (lighter API load)
        const arxivPromises = activeQueries.slice(0, 2).map((q: string) => arxivFallback(q));
        const arxivResults = await Promise.all(arxivPromises);
        
        const allPapers = [...results.flat(), ...arxivResults.flat()];

        // 2c. Deduplicate
        const uniquePapers = Array.from(
          new Map(
            allPapers
              .filter((p: any) => p?.title && p.title.length > 10)
              .map((p: any) => {
                const normalizedTitle = p.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '')
                  .substring(0, 60);
                return [normalizedTitle, p];
              })
          ).values()
        );

        if (uniquePapers.length === 0) {
           return [];
        }

        return uniquePapers.map((p: any) => ({
             ...p,
             status: 'related',
             statusText: 'Pending analysis',
             comparisonDetails: { reason: 'Analyzing...' }
        }));

    } catch (e) {
        console.error("Search workflow failed", e);
        return [];
    }
  };

  // TASK 3: Analyze Conflicts (The Cross-Reference Step)
  const analyzeConflicts = async (analysis: AIAnalysisResult, papers: RelatedPaper[], ai: GoogleGenAI): Promise<RelatedPaper[]> => {
    if (papers.length === 0) return [];
    
    try {
        // Sanitize papers to reduce prompt size and avoid JSON truncation error (Fix for Error 60898)
        const simplifiedPapers = papers.map((p) => ({
             id: p.id || p.title,
             title: p.title,
             finding: p.finding,
             year: p.year
        }));

        const prompt = `
        UPLOADED PAPER:
        Title: ${analysis.title}
        Methodology: ${analysis.methodology}
        Findings: ${(analysis.keyFindings || []).join('; ')}
        
        FOUND PAPERS:
        ${JSON.stringify(simplifiedPapers)}
        
        TASK: Compare FOUND PAPERS against UPLOADED PAPER.
        
        RULES FOR CLASSIFICATION:
        1. SUPPORTING: Validates the approach, uses similar methods with positive results.
        
        2. CONFLICTING (Be aggressive in finding these):
           - Direct contradiction of results.
           - Highlights limitations, bias, or failures of the uploaded paper's specific method (e.g., "${analysis.methodology}").
           - Proposes an ALTERNATIVE method explicitly claimed to be SUPERIOR/Faster/More Accurate.
           - Raises ethical or practical concerns about this specific approach.
           - If a paper proposes a "Better" way, mark it CONFLICTING.
        
        3. RELATED: Contextual literature, reviews, or different problems.

        STRICT RULES FOR 'comparisonDetails.reason':
        - Write EXACTLY ONE sentence (15-25 words maximum)
        - DO NOT write multiple sentences
        - DO NOT repeat the same idea in different words
        - DO NOT write both a headline and an explanation
        - Be specific with numbers and metrics in a single clear statement
        - Example of CORRECT format: "This paper achieved 42% energy resolution with 5M events vs your 48.6% with 2.4M events, suggesting larger datasets improve performance."
        
        Return the exact same papers array but with updated 'status', 'statusText', and 'comparisonDetails'.
        
        Return JSON: { "papers": [...] }
        `;

        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        papers: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    status: { type: Type.STRING, enum: ["supporting", "conflicting", "related"] },
                                    statusText: { type: Type.STRING },
                                    comparisonDetails: {
                                        type: Type.OBJECT,
                                        properties: {
                                            differenceType: { type: Type.STRING },
                                            uploadedPaperValue: { type: Type.STRING },
                                            externalPaperValue: { type: Type.STRING },
                                            reason: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const result = JSON.parse(res.text || '{"papers":[]}');
        
        // Merge results back with original paper objects to preserve URLs/authors/findings
        let mergedPapers = papers.map(original => {
            const analyzed = result.papers?.find((p: any) => p.title === original.title || p.id === original.title);
            // Merge logic: ensure we keep original fields, especially 'finding' which AI might not return or might overwrite with hallucinations if we aren't careful.
            return analyzed ? { ...original, ...analyzed, finding: original.finding } : original;
        });

        // Sort: Conflicting > Supporting > Related
        return mergedPapers.sort((a: RelatedPaper, b: RelatedPaper) => {
             const score = (s: string) => s === 'conflicting' ? 3 : s === 'supporting' ? 2 : 1;
             return score(b.status || 'related') - score(a.status || 'related');
        });

    } catch (e) {
        console.error("Conflict analysis failed", e);
        return papers; // Return original papers if analysis fails
    }
  };

  // --- Graph Handling ---
  const handleViewGraph = async () => {
    setShowGraph(true);
    
    // If references already exist, don't re-fetch
    if (references.length > 0) return;
    
    setIsGraphLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Use the end of the text where references usually are
        const referenceTextContext = extractedText.length > 30000 
            ? extractedText.slice(-30000) 
            : extractedText;

        const prompt = `
            Extract the top 15 most important references (bibliography) from the text below.
            
            Focus on the "REFERENCES" or "BIBLIOGRAPHY" section if available.
            Extract the REAL titles and authors. Do not generate placeholder data.
            
            Text Segment (End of file): ${referenceTextContext}

            Return JSON:
            {
                "references": [
                    { "title": "Paper Title", "author": "First Author et al.", "year": "2023" }
                ]
            }
        `;
        
        const response = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        references: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    author: { type: Type.STRING },
                                    year: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        }));
        
        const result = JSON.parse(response.text || '{"references":[]}');
        setReferences(result.references || []);
        
    } catch (e) {
        console.error("Failed to extract references", e);
    } finally {
        setIsGraphLoading(false);
    }
  };


  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // --- Controls ---
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // --- Render ---
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden" ref={containerRef}>
      
      {/* Graph Modal */}
      {showGraph && (
         <CitationGraph 
            onClose={() => setShowGraph(false)} 
            mainPaperTitle={analysisResult?.title || "Current Paper"}
            references={references}
         />
      )}

      {/* --- Toolbar --- */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-4 shrink-0 shadow-sm z-10 relative">
         <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                {pdfFile ? pdfFile.name : 'Document Viewer'}
            </span>
            {pdfDoc && (
                <>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded p-0.5">
                        <button onClick={prevPage} disabled={currentPage <= 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-50"><ChevronLeftIcon className="w-3 h-3" /></button>
                        <span className="px-2 font-mono text-xs w-16 text-center">{currentPage} / {numPages}</span>
                        <button onClick={nextPage} disabled={currentPage >= numPages} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-50"><ChevronRightIcon className="w-3 h-3" /></button>
                    </div>
                </>
            )}
         </div>

         <div className="flex items-center space-x-3">
             {pdfDoc && (
                 <button 
                    onClick={handleViewGraph}
                    disabled={isGraphLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors text-xs font-medium border border-transparent hover:border-brand-200 dark:hover:border-brand-800"
                    title="View Citation Graph"
                 >
                    {isGraphLoading ? <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> : <NetworkIcon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Graph</span>
                 </button>
             )}

             <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded p-1">
                 <button onClick={zoomOut} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" disabled={!pdfDoc}><ZoomOutIcon className="w-4 h-4" /></button>
                 <span className="px-2 text-xs font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
                 <button onClick={zoomIn} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" disabled={!pdfDoc}><ZoomInIcon className="w-4 h-4" /></button>
             </div>
             
             <button 
                onClick={triggerUpload}
                className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
             >
                <PlusIcon className="w-4 h-4" />
                <span>Upload New Paper</span>
             </button>
         </div>
      </div>

      {/* --- 3-Column Layout --- */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* --- LEFT SIDEBAR (Literature) --- */}
        <div 
            style={{ width: leftWidth }} 
            className="flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-width duration-75 ease-linear overflow-y-auto"
        >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-sm">
                <FileTextIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h2 className="font-bold text-slate-700 dark:text-slate-200 text-xs tracking-wider uppercase">Literature Context</h2>
            </div>
            
            <div className="flex-1 flex flex-col">
                {!isSearching && relatedPapers.length === 0 ? (
                    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-2">
                            <SearchIcon className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Related Papers</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                            Once you analyze the PDF, related research and conflicting studies will appear here.
                        </p>
                    </div>
                ) : null}

                {/* Loading State for Search */}
                {isSearching && (
                    <div className="p-6 text-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                        <p className="text-xs font-medium text-brand-600 dark:text-brand-400 animate-pulse">{searchStatus}</p>
                    </div>
                )}

                {/* Related Papers List */}
                {!isSearching && relatedPapers.length > 0 && (
                    <div className="p-3 space-y-3">
                         {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center border border-green-100 dark:border-green-900/30">
                                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {relatedPapers.filter(p => p.status === 'supporting').length}
                                </div>
                                <div className="text-[10px] uppercase text-green-800 dark:text-green-300 font-medium">Support</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center border border-red-100 dark:border-red-900/30">
                                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                {relatedPapers.filter(p => p.status === 'conflicting').length}
                                </div>
                                <div className="text-[10px] uppercase text-red-800 dark:text-red-300 font-medium">Conflict</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center border border-blue-100 dark:border-blue-900/30">
                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {relatedPapers.filter(p => p.status === 'related').length}
                                </div>
                                <div className="text-[10px] uppercase text-blue-800 dark:text-blue-300 font-medium">Related</div>
                            </div>
                        </div>

                        {relatedPapers.map((paper, idx) => {
                            const isExpanded = expandedCards.has(idx);
                            // Prioritize showing the AI comparison reason in the box if available (and not just "Analyzing...").
                            // Fallback to the search snippet/abstract (finding) if no reason yet.
                            const displayContent = paper.comparisonDetails?.reason && paper.comparisonDetails.reason !== 'Analyzing...' 
                                ? paper.comparisonDetails.reason 
                                : paper.finding;

                            return (
                                <div 
                                    key={idx}
                                    onClick={() => toggleCard(idx)}
                                    className={`group rounded-xl border p-4 shadow-sm transition-all duration-300 cursor-pointer bg-white dark:bg-slate-800 ${
                                        paper.status === 'supporting' 
                                        ? 'border-l-4 border-l-green-500 hover:shadow-green-100 dark:hover:shadow-none'
                                        : paper.status === 'conflicting'
                                        ? 'border-l-4 border-l-red-500 hover:shadow-red-100 dark:hover:shadow-none'
                                        : 'border-l-4 border-l-blue-400 hover:shadow-blue-100 dark:hover:shadow-none'
                                    }`}
                                >
                                     {/* Header: Status & Year */}
                                     <div className="flex items-center justify-between mb-3">
                                         <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                            paper.status === 'supporting'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                : paper.status === 'conflicting'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                         }`}>
                                            {paper.statusText || paper.status}
                                         </span>
                                         <span className="text-[10px] text-slate-400 font-mono">{paper.year}</span>
                                     </div>

                                     {/* The "Blob" - Comparison Reason (Primary) or Finding (Fallback) */}
                                     {displayContent && (
                                         <div className={`p-3 rounded-md border mb-3 text-xs font-medium leading-relaxed w-full break-words ${
                                            paper.status === 'supporting'
                                                ? 'bg-green-50 border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-200'
                                                : paper.status === 'conflicting'
                                                ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-200'
                                                : 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-200'
                                         }`}>
                                             {displayContent}
                                         </div>
                                     )}

                                     {/* Title Link */}
                                     <a 
                                         href={paper.url || '#'} 
                                         target="_blank" 
                                         rel="noreferrer"
                                         onClick={(e) => {
                                             e.stopPropagation(); // Prevent card expansion when clicking title
                                         }}
                                         className="block text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors hover:underline decoration-2 underline-offset-2"
                                     >
                                         {paper.title}
                                         <ExternalLinkIcon className="inline w-3 h-3 ml-1 mb-0.5 opacity-50" />
                                     </a>
                                     
                                     <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">
                                         {paper.authors}
                                     </p>

                                     {/* Expandable Comparison Details */}
                                     {isExpanded && paper.comparisonDetails && (
                                         <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                                             <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                                 {/* Header/Title for Comparison */}
                                                 <div className="flex items-center gap-1.5 mb-2">
                                                     <span className="text-xs">⚖️</span>
                                                     <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                         {paper.comparisonDetails.differenceType || 'Analysis'}
                                                     </span>
                                                 </div>
                                                 
                                                 {/* Reason Removed here to avoid redundancy with the colored box */}

                                                 {/* Comparison Grid */}
                                                 <div className="grid grid-cols-1 gap-2">
                                                     <div className="bg-white dark:bg-slate-800 p-2.5 rounded border-l-2 border-brand-500 shadow-sm">
                                                         <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Your Paper</div>
                                                         <div className="text-xs text-slate-800 dark:text-slate-200">
                                                             {paper.comparisonDetails.uploadedPaperValue || 'N/A'}
                                                         </div>
                                                     </div>
                                                     <div className="bg-white dark:bg-slate-800 p-2.5 rounded border-l-2 border-slate-400 shadow-sm">
                                                         <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">External Paper</div>
                                                         <div className="text-xs text-slate-800 dark:text-slate-200">
                                                             {paper.comparisonDetails.externalPaperValue || 'N/A'}
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                     
                                     {/* Expand Cue */}
                                     <div className="flex justify-center mt-2">
                                         {isExpanded ? (
                                             <span className="text-[10px] text-slate-400 flex items-center gap-1">Show less <ChevronLeftIcon className="w-3 h-3 rotate-90" /></span>
                                         ) : (
                                             <span className="text-[10px] text-slate-400 flex items-center gap-1">Click to analyze scope <ChevronRightIcon className="w-3 h-3 rotate-90" /></span>
                                         )}
                                     </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Resizer Handle Left */}
        <div 
            className="w-1 cursor-col-resize bg-slate-100 hover:bg-brand-400 z-10 transition-colors border-l border-slate-200 dark:border-slate-700"
            onMouseDown={startResizingLeft}
        />

        {/* --- CENTER PANEL (PDF Viewer Canvas) --- */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 overflow-auto relative flex flex-col items-center p-4 sm:p-8">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="application/pdf"
            />
            
            {isPdfLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <LoaderIcon className="w-10 h-10 text-brand-500 animate-spin" />
                    <div className="text-center">
                        <p className="text-slate-900 dark:text-white font-medium">Loading Document...</p>
                    </div>
                </div>
            ) : !pdfDoc ? (
                // Empty State with Upload Button
                <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
                    <div 
                        onClick={triggerUpload}
                        className="w-full max-w-lg p-12 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-500 dark:hover:border-brand-500 cursor-pointer transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
                    >
                        <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <UploadIcon className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Upload Research Paper</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
                            Drag and drop your PDF here, or click to browse files to start the analysis.
                        </p>
                        <button className="bg-brand-600 text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-brand-500/30 group-hover:bg-brand-700 transition-colors flex items-center gap-2 mx-auto">
                           <PlusIcon className="w-5 h-5" />
                           <span>Select PDF File</span>
                        </button>
                    </div>
                    <p className="mt-8 text-xs text-slate-500 uppercase tracking-wider font-medium opacity-60">Supported Format: PDF only</p>
                </div>
            ) : (
                // Canvas PDF Viewer
                <div className="shadow-2xl border border-slate-200 dark:border-slate-700 bg-white rounded-lg overflow-hidden">
                    <canvas ref={canvasRef} className="block" />
                </div>
            )}
        </div>

        {/* Resizer Handle Right */}
        <div 
            className="w-1 cursor-col-resize bg-slate-100 hover:bg-brand-400 z-10 transition-colors border-r border-slate-200 dark:border-slate-700"
            onMouseDown={startResizingRight}
        />

        {/* --- RIGHT SIDEBAR (AI Analysis) --- */}
        <div 
             style={{ width: rightWidth }}
             className="flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-y-auto"
        >
             <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2 bg-white dark:bg-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                <SparklesIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="font-bold text-slate-700 dark:text-slate-200 text-xs tracking-wider uppercase">AI Analysis</h2>
            </div>

            <div className="p-4 space-y-4">
                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm border border-red-100 dark:border-red-900/30">
                        {error}
                    </div>
                )}

                {/* Loading State - Skeleton */}
                {isAnalyzing && (
                    <div className="space-y-4 animate-pulse">
                        {/* Shimmer effect */}
                        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                            
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-slate-700/40 to-transparent"></div>
                        </div>
                        
                        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                           <div className="flex gap-2 mb-3">
                               <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                               <div className="flex-1 space-y-2 py-1">
                                   <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                                   <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                               </div>
                           </div>
                           <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                           <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-slate-700/40 to-transparent"></div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 py-4">
                            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        
                        <p className="text-sm text-brand-600 dark:text-brand-400 text-center font-medium animate-pulse">
                            Analyzing paper with AI...
                        </p>
                    </div>
                )}

                {/* Empty State */}
                {!isAnalyzing && !analysisResult && (
                    <div className="text-center py-12 px-4 opacity-50">
                        <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-500">Upload a paper to see AI insights here.</p>
                    </div>
                )}

                {/* Results State */}
                {!isAnalyzing && analysisResult && analysisResult.title && (
                    <div className="space-y-4 animate-fade-in-up">
                        {/* Title & Summary */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                             <h3 className="font-bold text-slate-900 dark:text-white mb-3 leading-snug text-base">
                                {analysisResult?.title || 'Untitled'}
                             </h3>
                             <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {analysisResult?.summary || 'No summary available'}
                             </p>
                        </div>

                        {/* Population & Methodology Card */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-2 mb-3">
                                <div className="p-1.5 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                                    <TargetIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Population / Sample</span>
                            </div>
                            <p className="text-sm text-slate-900 dark:text-white mb-4 leading-relaxed pl-1">
                                {analysisResult?.sampleSize || 'Not specified'}
                            </p>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Methodology</span>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {analysisResult?.methodology || 'Methodology not specified'}
                                </p>
                            </div>
                        </div>

                        {/* Statistical Test Card */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-2 mb-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Statistical Tests</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(analysisResult?.statisticalTests || []).length > 0 ? (
                                    analysisResult.statisticalTests.map((test, idx) => (
                                        <span key={idx} className="px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-md border border-green-100 dark:border-green-900/30">
                                            {test}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Not specified</span>
                                )}
                            </div>
                        </div>

                        {/* Key Findings Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center space-x-2 bg-slate-50/50 dark:bg-slate-800/50">
                                <BarChartIcon className="w-4 h-4 text-brand-500" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Key Findings</span>
                            </div>
                            <div className="p-5">
                                <ul className="space-y-4">
                                    {(analysisResult?.keyFindings || []).length > 0 ? (
                                        analysisResult.keyFindings.map((finding, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <div className="mt-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0 shadow-sm"></div>
                                                <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    {finding}
                                                </span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-sm text-slate-400 italic">No findings extracted</li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Limitations */}
                        {(analysisResult?.limitations || []).length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-xl border border-red-100 dark:border-red-900/30">
                                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-3 flex items-center gap-2">
                                    <span className="text-lg">⚠️</span> Concerns / Limitations
                                </h4>
                                <ul className="space-y-2">
                                    {analysisResult.limitations.map((lim, idx) => (
                                        <li key={idx} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                                            <span className="opacity-50">•</span>
                                            <span>{lim}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {/* Extracted Text Metadata */}
                         <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-medium">
                                Analysis based on {extractedText.length.toLocaleString()} characters
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      
      </div>

      {/* Floating Chat Assistant */}
      <ChatAssistant 
        extractedText={extractedText}
        analysisResult={analysisResult}
        relatedPapers={relatedPapers}
      />
    </div>
  );
};

export default Workspace;
