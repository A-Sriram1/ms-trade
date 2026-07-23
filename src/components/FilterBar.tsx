import React from 'react';
import { Filter, Clock, Target, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import type { SignalFilter, TimeframeFilter, ExpiryFilter } from '../store';

const signalFilters: { value: SignalFilter; label: string; color: string; activeColor: string }[] = [
  { value: 'ALL', label: 'ALL', color: 'text-slate-400 border-white/5 bg-white/[0.02]', activeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { value: 'STRONG BUY', label: 'STRONG BUY', color: 'text-slate-400 border-white/5 bg-white/[0.02]', activeColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15 glow-emerald' },
  { value: 'BUY', label: 'BUY', color: 'text-slate-400 border-white/5 bg-white/[0.02]', activeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { value: 'WAIT', label: 'WAIT', color: 'text-slate-400 border-white/5 bg-white/[0.02]', activeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { value: 'SELL', label: 'SELL', color: 'text-slate-400 border-white/5 bg-white/[0.02]', activeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { value: 'STRONG SELL', label: 'STRONG SELL', color: 'text-slate-400 border-white/5 bg-white/[0.02]', activeColor: 'text-rose-300 border-rose-500/40 bg-rose-500/15 glow-rose' },
];

const timeframeFilters: { value: TimeframeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'ALL', label: 'ALL', icon: <Filter className="w-2.5 h-2.5" /> },
  { value: 'SCALPING', label: 'SCALP', icon: <Zap className="w-2.5 h-2.5" /> },
  { value: 'INTRADAY', label: 'INTRADAY', icon: <Clock className="w-2.5 h-2.5" /> },
  { value: 'SWING', label: 'SWING', icon: <Target className="w-2.5 h-2.5" /> },
];

const expiryFilters: { value: ExpiryFilter; label: string }[] = [
  { value: 'ALL', label: 'ALL' },
  { value: 'TODAY', label: 'TODAY' },
  { value: 'WEEKLY', label: 'WEEKLY' },
  { value: 'MONTHLY', label: 'MONTHLY' },
];

export function SignalFilterBar({ showExpiry = false }: { showExpiry?: boolean }) {
  const { signalFilter, setSignalFilter, timeframeFilter, setTimeframeFilter, expiryFilter, setExpiryFilter } = useStore();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Signal filters */}
      <div className="flex items-center gap-1.5">
        <Filter className="w-3 h-3 text-slate-500" />
        {signalFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setSignalFilter(f.value)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider transition-all duration-200',
              signalFilter === f.value ? f.activeColor : f.color
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/5" />

      {/* Timeframe filters */}
      <div className="flex items-center gap-1.5">
        {timeframeFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setTimeframeFilter(f.value)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider transition-all duration-200',
              timeframeFilter === f.value
                ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                : 'text-slate-400 border-white/5 bg-white/[0.02]'
            )}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {/* Expiry filters (for options tabs) */}
      {showExpiry && (
        <>
          <div className="w-px h-5 bg-white/5" />
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-500" />
            {expiryFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setExpiryFilter(f.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider transition-all duration-200',
                  expiryFilter === f.value
                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    : 'text-slate-400 border-white/5 bg-white/[0.02]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
