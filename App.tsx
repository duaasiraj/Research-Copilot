import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Workspace from './components/Workspace';
import Home from './components/Home';
import Profile from './components/Profile';
import { Page } from './types';

const App: React.FC = () => {
  const [activePage, setPage] = useState<Page>(Page.WORKSPACE);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialize theme from system preference or local storage (mocked here)
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  // Update HTML class for Tailwind dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const renderContent = () => {
    switch (activePage) {
      case Page.HOME:
        return <Home setPage={setPage} />;
      case Page.WORKSPACE:
        return <Workspace />;
      case Page.PROFILE:
        return <Profile />;
      default:
        return <Home setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 font-sans">
      <Header 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        setPage={setPage} 
        activePage={activePage}
      />
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;