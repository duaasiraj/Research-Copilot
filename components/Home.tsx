import React from 'react';
import { Page } from '../types';
import { UploadIcon, FileTextIcon, SparklesIcon, TargetIcon } from './Icons';

interface HomeProps {
  setPage: (page: Page) => void;
}

const Home: React.FC<HomeProps> = ({ setPage }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl w-full space-y-8 animate-fade-in-up">
        
        {/* Hero Section */}
        <div className="space-y-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-semibold uppercase tracking-wide">
                v2.0 Now Available
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Accelerate your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-pink-500">Research Validation</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                Research Copilot uses advanced AI to analyze papers, detect conflicts, and extract key statistical findings in seconds.
            </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
                onClick={() => setPage(Page.WORKSPACE)}
                className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
                <UploadIcon className="w-5 h-5" />
                <span>Start Analyzing</span>
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                View Demo
            </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-brand-300 transition-colors group">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Smart Parsing</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Automatically extract abstracts, authors, and metadata from PDF files.</p>
            </div>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-purple-300 transition-colors group">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Conflict Detection</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">AI identifies contradicting claims across your uploaded literature corpus.</p>
            </div>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-green-300 transition-colors group">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TargetIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Stat Verification</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Isolate statistical tests, populations, and p-values for quick validation.</p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Home;