import React from 'react';
import { UserIcon, FileTextIcon, BarChartIcon } from './Icons';

const Profile: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <div className="w-24 h-24 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-sm">
                <UserIcon className="w-12 h-12 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dr. Jane Researcher</h1>
                <p className="text-slate-500 dark:text-slate-400">Senior Physicist • Weizmann Institute of Science</p>
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">High Energy Physics</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">Machine Learning</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">Detectors</span>
                </div>
            </div>
             <button className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">Edit Profile</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Papers Analyzed</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">142</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Conflicts Detected</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 text-red-500">23</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Saved Collections</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">8</p>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white">Recent Analysis History</h3>
             </div>
             <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500">
                                <FileTextIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                                    {i === 1 ? "Exploring DHCAL design and performance..." : i === 2 ? "Quantum Error Correction in..." : "Review of GNN Architectures for..."}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Added {i * 2} days ago</p>
                            </div>
                        </div>
                        <BarChartIcon className="w-4 h-4 text-slate-300" />
                    </div>
                ))}
             </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;