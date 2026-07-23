import React, { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { InstTradeCard } from '../InstTradeCard';
import { OptionChainPanel } from '../OptionChainPanel';
import { AIReasoningPanel } from '../AIReasoningPanel';
import { RefreshCw, Layers, TrendingUp, TrendingDown, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

const FNO_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'ICICIBANK', 'AXISBANK',
  'TATASTEEL', 'ITC', 'LT', 'BAJFINANCE', 'BHARTIARTL', 'KOTAKBANK',
  'ASIANPAINT', 'HCLTECH', 'WIPRO', 'MARUTI', 'TITAN', 'SUNPHARMA',
];

function OIBadge({ type, label }: { type: 'bullish' | 'bearish' | 'neutral'; label: string }) {
  const style = type === 'bullish'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : type === 'bearish'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase', style)}>
      {type === 'bullish' ? <TrendingUp className="w-2.5 h-2.5" /> : type === 'bearish' ? <TrendingDown className="w-2.5 h-2.5" /> : <BarChart3 className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

function OptionMetricsStrip({ signal }: { signal: any }) {
  if (!signal.optionsStrategy) return null;
  const s = signal.optionsStrategy;
  return (
    <div className="glass rounded-lg p-2 mt-2">
      <div className="flex flex-wrap gap-1.5">
        <OIBadge type={s.pcr >= 1.2 ? 'bullish' : s.pcr <= 0.8 ? 'bearish' : 'neutral'} label={`PCR ${s.pcr.toFixed(2)}`} />
        <span className="inline-flex items-center rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-0.5 text-[8px] font-bold uppercase text-blue-400">
          IV {s.impliedVolatility.toFixed(1)}%
        </span>
        <span className="inline-flex items-center rounded-md border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 text-[8px] font-bold uppercase text-purple-400">
          Max Pain {s.maxPain.toLocaleString('en-IN')}
        </span>
        <span className="inline-flex items-center rounded-md border border-white/5 bg-white/[0.02] px-2 py-0.5 text-[8px] font-bold uppercase text-slate-400">
          OI Change {(s.oiChangeAtStrike / 1e4).toFixed(1)}K
        </span>
        <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase',
          s.optionType === 'CE' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
        )}>
          {s.optionType}
        </span>
      </div>
      {/* Build-up indicators */}
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {s.pcr > 1.0 && s.oiChangeAtStrike > 0 && <OIBadge type="bullish" label="Long Build-up" />}
        {s.pcr < 1.0 && s.oiChangeAtStrike > 0 && <OIBadge type="bearish" label="Short Build-up" />}
        {s.pcr > 1.0 && s.oiChangeAtStrike < 0 && <OIBadge type="neutral" label="Short Covering" />}
        {s.pcr < 1.0 && s.oiChangeAtStrike < 0 && <OIBadge type="neutral" label="Long Unwinding" />}
      </div>
    </div>
  );
}

export function StockOptionAISignals() {
  const { marketData, signalFilter, timeframeFilter, searchQuery } = useStore();
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [showChain, setShowChain] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let signals = marketData.signals.filter(s => {
      if (!s.optionsStrategy) return false;
      if (!FNO_STOCKS.includes(s.symbol)) return false;
      return true;
    });

    if (signalFilter !== 'ALL') {
      signals = signals.filter(s => s.action === signalFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      signals = signals.filter(s => s.symbol.toUpperCase().includes(q));
    }

    return signals;
  }, [marketData.signals, signalFilter, searchQuery]);

  if (filtered.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 mb-3 animate-spin" />
        <p className="text-sm font-medium">Waiting for F&O stock signals...</p>
        <p className="text-xs mt-1 text-slate-600">Analyzing {FNO_STOCKS.length} F&O stocks</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full animate-fade-in">
      {/* Signal List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Layers className="w-6 h-6 mb-2" />
            <p className="text-xs">No F&O signals match current filters</p>
          </div>
        ) : (
          filtered.map(signal => (
            <div key={`${signal.symbol}-${signal.timestamp}`} className="space-y-0">
              <div
                onClick={() => setSelectedSignal(signal)}
                className="cursor-pointer"
              >
                <InstTradeCard signal={signal} showOptions />
                <OptionMetricsStrip signal={signal} />
              </div>
              {/* Inline option chain toggle */}
              {signal.optionsStrategy && (
                <div className="border-x border-b border-white/5 rounded-b-xl bg-white/[0.01]">
                  <button
                    onClick={() => setShowChain(showChain === signal.symbol ? null : signal.symbol)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[8px] uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
                  >
                    {showChain === signal.symbol ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showChain === signal.symbol ? 'Hide' : 'Show'} Option Chain
                  </button>
                  {showChain === signal.symbol && signal.optionsStrategy && (
                    <div className="px-3 pb-3 animate-slide-up">
                      <OptionChainPanel strategy={signal.optionsStrategy} />
                    </div>
                  )}
                </div>
              )}
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
