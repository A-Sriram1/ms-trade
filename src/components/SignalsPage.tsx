import React from 'react';
import { useStore } from '../store';
import { TopDashboardBar } from './TopDashboardBar';
import { SearchBar } from './SearchBar';
import { SignalFilterBar } from './FilterBar';
import { StockAISignals } from './tabs/StockAISignals';
import { StockOptionAISignals } from './tabs/StockOptionAISignals';
import { IndexOptionAI } from './tabs/IndexOptionAI';
import { Activity, BarChart2, Layers, Zap, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import type { SignalSubTab } from '../store';

const SUB_TABS: { id: SignalSubTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'stock-signals', label: 'Stock AI Signals', shortLabel: 'Stocks', icon: <BarChart2 className="w-3 h-3" /> },
  { id: 'stock-options', label: 'Stock Option AI', shortLabel: 'F&O Stocks', icon: <Layers className="w-3 h-3" /> },
  { id: 'nifty-options', label: 'NIFTY Option AI', shortLabel: 'NIFTY', icon: <Zap className="w-3 h-3" /> },
  { id: 'banknifty-options', label: 'BANKNIFTY Option AI', shortLabel: 'BANKNIFTY', icon: <Zap className="w-3 h-3" /> },
  { id: 'sensex-options', label: 'SENSEX Option AI', shortLabel: 'SENSEX', icon: <Zap className="w-3 h-3" /> },
  { id: 'finnifty-options', label: 'FINNIFTY Option AI', shortLabel: 'FINNIFTY', icon: <Globe className="w-3 h-3" /> },
];

export function SignalsPage() {
  const { signalSubTab, setSignalSubTab, marketData } = useStore();

  const isIndexTab = signalSubTab !== 'stock-signals' && signalSubTab !== 'stock-options';
  const showExpiry = signalSubTab !== 'stock-signals';

  const activeCount = marketData.signals.filter(
    s => s.action === 'STRONG BUY' || s.action === 'BUY' || s.action === 'STRONG SELL' || s.action === 'SELL'
  ).length;

  return (
    <div className="space-y-4 flex flex-col h-full animate-fade-in">
      {/* Top Dashboard Bar */}
      <TopDashboardBar />

      {/* Header */}
      <header className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            AI Signal Engine
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-blue-500 text-[10px] font-mono">INSTITUTIONAL QUANT SIGNALS</p>
            {marketData.signalUpdatedAt && (
              <p className="text-slate-500 text-[9px] font-mono border-l border-white/5 pl-2">
                Updated {marketData.signalUpdatedAt} IST · {marketData.signalRefreshIntervalSeconds}s refresh
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar />
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-[9px] font-bold uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeCount} Active
            </div>
          )}
        </div>
      </header>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {SUB_TABS.map(tab => {
          const isActive = signalSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSignalSubTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border',
                isActive
                  ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 glow-blue'
                  : 'text-slate-500 border-white/5 bg-white/[0.01] hover:text-white hover:border-white/10 hover:bg-white/[0.03]'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <SignalFilterBar showExpiry={showExpiry} />

      {/* Content area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {signalSubTab === 'stock-signals' && <StockAISignals />}
        {signalSubTab === 'stock-options' && <StockOptionAISignals />}
        {signalSubTab === 'nifty-options' && <IndexOptionAI symbol="NIFTY" displayName="NIFTY 50" />}
        {signalSubTab === 'banknifty-options' && <IndexOptionAI symbol="BANKNIFTY" displayName="BANKNIFTY" />}
        {signalSubTab === 'sensex-options' && <IndexOptionAI symbol="SENSEX" displayName="SENSEX" />}
        {signalSubTab === 'finnifty-options' && <IndexOptionAI symbol="FINNIFTY" displayName="FINNIFTY" />}
      </div>
    </div>
  );
}
