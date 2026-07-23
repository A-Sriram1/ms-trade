/**
 * OptionsStrategyPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows AI-generated options strategy recommendations for all available signals.
 * Embedded into the OptionsDashboard page.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { OptionsStrategyCard } from './OptionsStrategyCard';
import { RefreshCw, Layers, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OptionsStrategyRecommendation } from '../types';

type SymbolFilter = 'ALL' | 'NIFTY' | 'BANKNIFTY' | 'RELIANCE' | 'HDFCBANK' | 'TCS';

export function OptionsStrategyPanel() {
  const { marketData } = useStore();
  const [filter, setFilter] = useState<SymbolFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Extract strategies directly from signals — no extra fetch needed
  const allStrategies: Array<{ symbol: string; strategy: OptionsStrategyRecommendation }> = marketData.signals
    .filter(s => s.optionsStrategy != null)
    .map(s => ({ symbol: s.symbol, strategy: s.optionsStrategy! }));

  const visibleStrategies = filter === 'ALL'
    ? allStrategies
    : allStrategies.filter(s => s.symbol === filter);

  const actionableCount = allStrategies.filter(s => s.strategy.canGenerate).length;

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Options Strategy Engine</h2>
            <p className="text-[10px] text-blue-400 font-mono mt-0.5">
              AUTOMATED STRATEGY RECOMMENDATIONS FROM LIVE SIGNALS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {actionableCount > 0 && (
            <div className="flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-400 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {actionableCount} Actionable
            </div>
          )}
          <div className="text-slate-500 font-mono">{marketData.signalUpdatedAt ? `Updated ${marketData.signalUpdatedAt} IST` : 'Waiting for signals...'}</div>
        </div>
      </div>

      {/* Data transparency notice */}
      <div className="rounded-lg border border-blue-500/15 bg-blue-500/5 px-3 py-2 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[10px] text-blue-200 leading-4">
          <span className="font-bold text-blue-400">Transparency: </span>
          Options chain OI is model-generated from spot &amp; volatility — not live NSE data.
          Strategies are only generated for NIFTY and BANKNIFTY (supported symbols).
          Premium targets use delta-approximation. This is not financial advice.
        </div>
      </div>

      {/* Symbol filter */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'NIFTY', 'BANKNIFTY', 'RELIANCE', 'HDFCBANK', 'TCS'] as SymbolFilter[]).map(sym => (
          <button
            key={sym}
            onClick={() => setFilter(sym)}
            className={cn(
              'rounded border px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all',
              filter === sym
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'text-slate-400 border-[#27272a] bg-[#09090b] hover:text-white hover:border-slate-600'
            )}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Strategy cards */}
      <div className="space-y-4">
        {marketData.signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 rounded-xl border border-[#27272a] bg-[#09090b]">
            <RefreshCw className="w-7 h-7 mb-3 animate-spin" />
            <p className="text-sm">Waiting for signal engine...</p>
            <p className="text-xs mt-1">Options strategies generate automatically once market signals are available.</p>
          </div>
        ) : visibleStrategies.length === 0 ? (
          <div className="rounded-xl border border-[#27272a] bg-[#09090b] p-6 text-center text-slate-500 text-sm">
            No strategies for {filter}. Try "ALL" or wait for signals to update.
          </div>
        ) : (
          visibleStrategies.map(({ symbol, strategy }) => (
            <div key={symbol} className="rounded-xl border border-[#27272a] bg-[#111114] p-4">
              {/* Symbol header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold text-white">{symbol}</span>
                  <span className="ml-2 text-[9px] uppercase text-slate-500 tracking-wider">
                    {marketData.signals.find(s => s.symbol === symbol)?.action || ''}
                    {' · '}
                    {marketData.signals.find(s => s.symbol === symbol)?.confidence || 0}% confidence
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-600">{strategy.timestamp} IST</span>
              </div>
              <OptionsStrategyCard strategy={strategy} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
