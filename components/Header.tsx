
import React from 'react';
import { Page } from '../types';
import { 
  LogoIcon, 
  MoonIcon, 
  SunIcon 
} from './Icons';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setPage: (page: Page) => void;
  activePage: Page;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme, setPage, activePage }) => {
  return (
    <header className="h-16 bg-brand-900 text-white flex items-center justify-between px-4 shadow-lg z-20 relative">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setPage(Page.HOME)}>
        <div className="p-1.5 bg-white/10 rounded-lg">
          <LogoIcon className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">ResearchCopilot</span>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
