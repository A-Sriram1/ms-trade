import React, { useMemo } from 'react';
import { useStore } from '../../store';
import { InstTradeCard } from '../InstTradeCard';
import { AIReasoningPanel } from '../AIReasoningPanel';
import { cn } from '../../lib/utils';
import { RefreshCw, BarChart2, Brain } from 'lucide-react';

export function StockAISignals() {
  const { marketData, signalFilter, timeframeFilter, searchQuery } = useStore();

  const filtered = useMemo(() => {
    let signals = marketData.signals.filter(s => {
      if (s.optionsStrategy) return false;
      return true;
    });

    if (signalFilter !== 'ALL') {
      signals = signals.filter(s => s.action === signalFilter);
    }

    if (timeframeFilter !== 'ALL') {
      const map: Record<string, string[]> = {
        'SCALPING': ['Scalp'],
        'INTRADAY': ['Intraday Momentum', 'Intraday Reversal'],
        'SWING': ['Swing'],
      };
      const types = map[timeframeFilter] || [];
      signals = signals.filter(s => types.includes(s.tradeType));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      signals = signals.filter(s => s.symbol.toUpperCase().includes(q));
    }

    return signals;
  }, [marketData.signals, signalFilter, timeframeFilter, searchQuery]);

  const stats = useMemo(() => {
    const all = marketData.signals.filter(s => !s.optionsStrategy);
    return {
      strongBuy: all.filter(s => s.action === 'STRONG BUY').length,
      buy: all.filter(s => s.action === 'BUY').length,
      wait: all.filter(s => s.action === 'WAIT').length,
      sell: all.filter(s => s.action === 'SELL').length,
      strongSell: all.filter(s => s.action === 'STRONG SELL').length,
      avgConf: all.length > 0 ? Math.round(all.reduce((a, b) => a + b.confidence, 0) / all.length) : 0,
    };
  }, [marketData.signals]);

  const [selectedSignal, setSelectedSignal] = React.useState<typeof filtered[0] | null>(null);

  if (filtered.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 mb-3 animate-spin" />
        <p className="text-sm font-medium">Waiting for stock signals...</p>
        <p className="text-xs mt-1 text-slate-600">Analyzing 50+ stocks in real-time</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full animate-fade-in">
      {/* Signal List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: 'Strong Buy', value: stats.strongBuy, color: 'text-emerald-300', bg: 'bg-emerald-500/[0.06] border-emerald-500/15' },
            { label: 'Buy', value: stats.buy, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.04] border-emerald-500/10' },
            { label: 'Wait', value: stats.wait, color: 'text-amber-400', bg: 'bg-amber-500/[0.04] border-amber-500/10' },
            { label: 'Sell', value: stats.sell, color: 'text-rose-400', bg: 'bg-rose-500/[0.04] border-rose-500/10' },
            { label: 'Strong Sell', value: stats.strongSell, color: 'text-rose-300', bg: 'bg-rose-500/[0.06] border-rose-500/15' },
            { label: 'Avg Confidence', value: `${stats.avgConf}%`, color: 'text-blue-400', bg: 'bg-blue-500/[0.04] border-blue-500/10' },
          ].map(item => (
            <div key={item.label} className={cn('glass-card rounded-lg p-2.5 border', item.bg)}>
              <div className="text-[7px] uppercase text-slate-500 tracking-wider">{item.label}</div>
              <div className={cn('text-lg font-bold font-mono mt-1', item.color)}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <BarChart2 className="w-6 h-6 mb-2" />
            <p className="text-xs">No signals match current filters</p>
          </div>
        ) : (
          filtered.map(signal => (
            <div
              key={`${signal.symbol}-${signal.timestamp}`}
              onClick={() => setSelectedSignal(signal)}
              className="cursor-pointer"
            >
              <InstTradeCard signal={signal} />
            </div>
          ))
        )}
      </div>

      {/* AI Reasoning Sidebar */}
      {selectedSignal && (
        <div className="w-80 xl:w-96 shrink-0 overflow-y-auto pl-1 hidden lg:block">
          <AIReasoningPanel signal={selectedSignal} />
        </div>
      )}
    </div>
  );
}


