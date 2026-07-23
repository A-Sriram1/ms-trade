import React, { useState } from 'react';
import {
  ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Shield, Activity, BarChart3, AlertTriangle, Layers,
  Clock, Target,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { OptionsStrategyRecommendation } from '../types';

function fp(v: number, dec = 2) {
  return v ? v.toLocaleString('en-IN', { maximumFractionDigits: dec }) : '—';
}

function riskColor(level: string) {
  if (level === 'Low') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (level === 'Medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
}

function DataQualityBanner({ dq }: { dq: OptionsStrategyRecommendation['dataQuality'] }) {
  return (
    <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
      <div className="text-[9px] text-amber-200/80 leading-4">
        <span className="font-bold uppercase tracking-wide text-amber-400">Data Quality: </span>
        {dq.isLiveNseData ? 'Live NSE OI' : 'Model-generated OI (not live NSE)'} · Premium targets via delta-approximation
      </div>
    </div>
  );
}

interface OptionChainPanelProps {
  strategy: OptionsStrategyRecommendation;
}

export function OptionChainPanel({ strategy }: OptionChainPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!strategy.canGenerate) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Options Strategy</div>
            <p className="mt-1 text-[10px] text-slate-500 leading-4">{strategy.cannotGenerateReason || 'Recommendation unavailable.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isCE = strategy.optionType === 'CE';
  const accentText = isCE ? 'text-emerald-400' : 'text-rose-400';
  const accentBadge = isCE ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  const accentBorder = isCE ? 'border-emerald-500/15' : 'border-rose-500/15';
  const profitPotential = strategy.target2Premium - strategy.entryPremium;
  const riskAmount = strategy.entryPremium - strategy.stopLossPremium;
  const rrDisplay = riskAmount > 0 ? `1:${(profitPotential / riskAmount).toFixed(1)}` : '—';

  return (
    <div className={cn('glass-card rounded-xl overflow-hidden', accentBorder)}>
      {/* Header */}
      <div className="flex items-start justify-between p-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', isCE ? 'bg-emerald-500/15' : 'bg-rose-500/15')}>
            <Layers className={cn('w-3.5 h-3.5', accentText)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Option Chain Analysis</span>
              <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8px] font-bold uppercase', accentBadge)}>
                {isCE ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                BUY {strategy.optionType}
              </span>
            </div>
            <div className="text-[8px] text-slate-500 mt-0.5">
              {strategy.symbol} · {strategy.strikeSelection} · {strategy.expiry}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className={cn('text-lg font-bold font-mono', accentText)}>{strategy.recommendedStrike}</div>
            <div className="text-[8px] text-slate-500">Strike</div>
          </div>
          <div className={cn('rounded-md border px-2 py-1 text-[8px] font-bold uppercase', riskColor(strategy.riskLevel))}>
            {strategy.riskLevel}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mx-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="glass rounded-lg p-2">
          <div className="text-[7px] uppercase text-slate-500 tracking-wider">Entry Premium</div>
          <div className={cn('text-[11px] font-bold font-mono mt-0.5', accentText)}>₹{fp(strategy.entryPremium)}</div>
        </div>
        <div className="glass rounded-lg p-2 border-rose-500/10">
          <div className="text-[7px] uppercase text-rose-400/70 tracking-wider">SL Premium</div>
          <div className="text-[11px] font-bold font-mono mt-0.5 text-rose-400">
            ₹{fp(strategy.stopLossPremium)}
            <span className="text-[8px] font-normal ml-1 text-rose-400/60">−{strategy.stopLossPercent}%</span>
          </div>
        </div>
        <div className="glass rounded-lg p-2 border-emerald-500/10">
          <div className="text-[7px] uppercase text-emerald-400/70 tracking-wider">Target 1</div>
          <div className="text-[11px] font-bold font-mono mt-0.5 text-emerald-400">₹{fp(strategy.target1Premium)}</div>
        </div>
        <div className="glass rounded-lg p-2">
          <div className="text-[7px] uppercase text-slate-500 tracking-wider">Risk : Reward</div>
          <div className="text-[11px] font-bold font-mono mt-0.5 text-white">{rrDisplay}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="mx-3 mb-3 flex flex-wrap gap-1.5">
        <div className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase', accentBadge)}>
          <div className={cn('w-1.5 h-1.5 rounded-full', isCE ? 'bg-emerald-400' : 'bg-rose-400')} />
          {strategy.confidence}% Confidence
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.02] px-2 py-0.5 text-[8px] font-bold uppercase text-slate-400">
          <Clock className="w-2.5 h-2.5" />
          {strategy.holdingTime}
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-0.5 text-[8px] font-bold uppercase text-blue-400">
          IV {strategy.impliedVolatility.toFixed(1)}%
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 text-[8px] font-bold uppercase text-purple-400">
          PCR {strategy.pcr.toFixed(2)}
        </div>
      </div>

      {/* Expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mx-3 mb-3 w-[calc(100%-24px)] flex items-center justify-center gap-1.5 rounded-lg border border-white/5 py-1.5 text-[8px] uppercase tracking-wider text-slate-500 hover:text-white hover:border-white/10 transition-all bg-white/[0.01]"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide details' : 'Full option chain analysis'}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-slide-up">
          {/* Premium levels */}
          <div className="glass rounded-lg p-3">
            <div className="text-[8px] uppercase text-slate-500 font-bold mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3" /> Premium Levels
            </div>
            {[
              { label: 'Entry', value: `₹${fp(strategy.entryPremium)}`, color: accentText },
              { label: 'Stop Loss', value: `₹${fp(strategy.stopLossPremium)}`, color: 'text-rose-400' },
              { label: 'Target 1', value: `₹${fp(strategy.target1Premium)}`, color: 'text-emerald-400' },
              { label: 'Target 2', value: `₹${fp(strategy.target2Premium)}`, color: 'text-emerald-300' },
              { label: 'Target 3', value: `₹${fp(strategy.target3Premium)}`, color: 'text-emerald-200' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                <span className="text-[8px] uppercase tracking-wider text-slate-500">{item.label}</span>
                <span className={cn('text-[10px] font-bold font-mono', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Chain context */}
          <div className="glass rounded-lg p-3">
            <div className="text-[8px] uppercase text-slate-500 font-bold mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" /> Chain Context
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Spot', value: `₹${fp(strategy.spotPrice)}`, color: 'text-white' },
                { label: 'ATM', value: `${fp(strategy.atmStrike, 0)}`, color: 'text-white' },
                { label: 'Max Pain', value: `${fp(strategy.maxPain, 0)}`, color: 'text-amber-400' },
                { label: 'PCR', value: strategy.pcr.toFixed(2), color: strategy.pcr >= 1 ? 'text-emerald-400' : 'text-rose-400' },
                { label: `OI @ Strike`, value: `${(strategy.oiAtStrike / 1e5).toFixed(2)}L`, color: 'text-slate-300' },
                { label: 'OI Change', value: `${(strategy.oiChangeAtStrike / 1e4).toFixed(1)}K`, color: strategy.oiChangeAtStrike > 0 ? 'text-emerald-400' : 'text-rose-400' },
                { label: 'Volume', value: `${(strategy.volumeAtStrike / 1e3).toFixed(1)}K`, color: 'text-slate-300' },
                { label: 'IV', value: `${strategy.impliedVolatility.toFixed(1)}%`, color: 'text-blue-400' },
              ].map(item => (
                <div key={item.label} className="rounded bg-surface border border-white/[0.03] px-2 py-1.5 flex justify-between items-center">
                  <span className="text-[7px] uppercase text-slate-600">{item.label}</span>
                  <span className={cn('text-[9px] font-bold font-mono', item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reasons */}
          <div className="glass rounded-lg p-3 space-y-2">
            <div>
              <div className="text-[8px] uppercase text-slate-500 font-bold mb-1">Technical Basis</div>
              <p className="text-[9px] text-slate-400 leading-4">{strategy.technicalReason}</p>
            </div>
            <div>
              <div className="text-[8px] uppercase text-slate-500 font-bold mb-1">Options Chain Analysis</div>
              <p className="text-[9px] text-slate-400 leading-4">{strategy.optionChainReason}</p>
            </div>
          </div>

          {/* Risk warning */}
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 flex items-start gap-2">
            <Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-amber-200/80 leading-4">{strategy.riskWarning}</p>
          </div>

          <DataQualityBanner dq={strategy.dataQuality} />
        </div>
      )}
    </div>
  );
}


