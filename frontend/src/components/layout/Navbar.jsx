import React from 'react';
import { Clock, LayoutDashboard, Radar, RefreshCw, Settings } from 'lucide-react';

const Navbar = ({
  currentView,
  setCurrentView,
  isFetching,
  lastUpdated,
  isSettingsOpen,
  setIsSettingsOpen,
  onRefresh,
}) => (
  <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          IDX Monitor
        </div>
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'dashboard' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            <LayoutDashboard size={16} /> Market Data
          </button>
          <button
            onClick={() => setCurrentView('whales')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'whales' ? 'bg-idx-card text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            <Radar size={16} /> Whale Alerts
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {currentView === 'dashboard' && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="hidden sm:flex text-xs text-slate-300 items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:text-white"
            aria-label="Open dashboard settings"
          >
            <Settings size={13} /> Settings
          </button>
        )}
        {currentView === 'dashboard' && (
          <button
            type="button"
            onClick={onRefresh}
            className="hidden sm:flex text-xs text-slate-300 items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:text-white"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
        {currentView === 'dashboard' && (
          <div className="hidden sm:flex text-xs text-slate-400 items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <Clock size={13} /> Updated {lastUpdated}
          </div>
        )}
        <div className="text-xs text-green-400 flex items-center gap-1.5 bg-green-900/20 px-3 py-1 rounded-full border border-green-800/30">
          <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${isFetching ? 'animate-pulse' : ''}`}></div>
          {isFetching ? 'Refreshing' : 'Live'}
        </div>
      </div>
    </div>
  </nav>
);

export default Navbar;
