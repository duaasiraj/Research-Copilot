
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AIAnalysisResult, RelatedPaper } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatAssistantProps {
  extractedText: string | null;
  analysisResult: AIAnalysisResult | null;
  relatedPapers: RelatedPaper[];
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
  extractedText, 
  analysisResult, 
  relatedPapers 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  // Welcome message when paper is analyzed
  useEffect(() => {
    if (analysisResult && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi! I've analyzed "${analysisResult.title}". I can help you understand the paper, explain its methodology, compare it with related research, or answer any questions you have about it. What would you like to know?`,
        timestamp: new Date()
      }]);
    }
  }, [analysisResult]);

  const handleSend = async () => {
    if (!input.trim() || !analysisResult) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Build context from paper analysis and related papers
      const context = `
UPLOADED PAPER CONTEXT:
Title: ${analysisResult.title}
Summary: ${analysisResult.summary}
Methodology: ${analysisResult.methodology}
Sample Size: ${analysisResult.sampleSize}
Key Findings: ${analysisResult.keyFindings.join('; ')}
Statistical Tests: ${analysisResult.statisticalTests.join(', ')}
Limitations: ${analysisResult.limitations.join('; ')}

RELATED PAPERS FOUND:
${relatedPapers.slice(0, 5).map(p => `
- ${p.title} (${p.year})
  Status: ${p.statusText}
  Finding: ${p.finding}
  Comparison: ${p.comparisonDetails?.reason || 'N/A'}
`).join('\n')}

CONVERSATION HISTORY:
${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

USER QUESTION: ${input}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a helpful research assistant helping a researcher understand their paper and related literature.

Context about the uploaded paper and related research:
${context}

Instructions:
1. Answer the user's question based on the paper context provided
2. Reference specific findings, methods, or related papers when relevant
3. If comparing papers, cite specific metrics or differences
4. If the question cannot be answered from the context, politely say so
5. Keep responses concise (2-4 paragraphs max) but informative
6. Use bullet points for lists
7. Be conversational and helpful

Respond to the user's question naturally and helpfully.`
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedQuestions = [
    "What are the main contributions of this paper?",
    "How does this compare to related work?",
    "What are the limitations I should be aware of?",
    "Explain the methodology in simple terms",
    "What conflicts were found with other papers?",
    "What should I cite in my literature review?"
  ];

  if (!extractedText) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-full shadow-2xl hover:shadow-brand-500/50 hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 right-0 px-3 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ask AI about your paper
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-brand-600 to-brand-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Research Assistant</h3>
                  <p className="text-[10px] text-brand-100 font-medium tracking-wide opacity-90">Powered by Gemini AI</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                  <p className={`text-[10px] mt-1.5 ${
                    msg.role === 'user' ? 'text-brand-100' : 'text-slate-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex gap-1.5 items-center h-5">
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (only show if no messages yet) */}
          {messages.length <= 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q)}
                    className="text-xs px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-600 dark:text-slate-300 rounded-full transition-colors border border-transparent hover:border-brand-200 dark:hover:border-brand-800"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about your paper..."
                disabled={!analysisResult || isTyping}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white placeholder-slate-400 disabled:opacity-50 transition-shadow"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !analysisResult || isTyping}
                className="w-10 h-10 bg-brand-600 hover:bg-brand-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
