import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp,
  Layers, Info, ShieldAlert, Target, Clock, BarChart2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { OptionsStrategyRecommendation } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fp(v: number, dec = 2) {
  return v ? v.toLocaleString('en-IN', { maximumFractionDigits: dec }) : '—';
}

function riskColor(level: string) {
  if (level === 'Low')    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (level === 'Medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
}

function oiChangeColor(v: number) {
  return v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-slate-400';
}

function DataQualityBanner({ dq }: { dq: OptionsStrategyRecommendation['dataQuality'] }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
      <div className="text-[10px] text-amber-200 leading-4">
        <span className="font-bold uppercase tracking-wide text-amber-400">Data Quality: </span>
        {dq.isLiveNseData ? 'Live NSE OI' : 'Model-generated OI (not live NSE)'} ·{' '}
        IV from chain model · Premium targets via delta-approximation
      </div>
    </div>
  );
}

// ─── Cannot-Generate State ────────────────────────────────────────────────────

function CannotGenerateCard({ reason }: { reason: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#0d0d11] p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-700/30 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Options Strategy
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 leading-4">{reason}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Premium Level Row ────────────────────────────────────────────────────────

function PremRow({ label, value, color = 'text-white', sublabel }: {
  label: string; value: string; color?: string; sublabel?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1e1e22] last:border-0">
      <div>
        <span className="text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
        {sublabel && <span className="ml-1 text-[9px] text-slate-600">({sublabel})</span>}
      </div>
      <span className={cn('text-[11px] font-bold font-mono', color)}>{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OptionsStrategyCard({ strategy }: { strategy: OptionsStrategyRecommendation }) {
  const [expanded, setExpanded] = useState(false);

  if (!strategy.canGenerate) {
    return <CannotGenerateCard reason={strategy.cannotGenerateReason || 'Recommendation unavailable.'} />;
  }

  const isCE = strategy.optionType === 'CE';
  const headerColor = isCE
    ? 'border-emerald-500/30 bg-emerald-500/8'
    : 'border-rose-500/30 bg-rose-500/8';
  const accentText = isCE ? 'text-emerald-400' : 'text-rose-400';
  const accentBadge = isCE
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  const Icon = isCE ? TrendingUp : TrendingDown;

  const profitPotential = strategy.target2Premium - strategy.entryPremium;
  const riskAmount      = strategy.entryPremium - strategy.stopLossPremium;
  const rrDisplay       = riskAmount > 0
    ? `1:${(profitPotential / riskAmount).toFixed(1)}`
    : '—';

  return (
    <div className={cn('rounded-xl border mt-2', headerColor)}>
      {/* Header bar */}
      <div className="flex items-start justify-between p-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', isCE ? 'bg-emerald-500/20' : 'bg-rose-500/20')}>
            <Layers className={cn('w-3.5 h-3.5', accentText)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Options Strategy</span>
              <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase', accentBadge)}>
                <Icon className="w-2.5 h-2.5" />
                BUY {strategy.optionType}
              </span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              {strategy.symbol} · {strategy.strikeSelection} · {strategy.expiry}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className={cn('text-lg font-bold font-mono', accentText)}>
              {strategy.recommendedStrike}
            </div>
            <div className="text-[9px] text-slate-500">Strike</div>
          </div>
          <div className={cn('rounded border px-2 py-1 text-[9px] font-bold uppercase', riskColor(strategy.riskLevel))}>
            {strategy.riskLevel} Risk
          </div>
        </div>
      </div>

      {/* Core metrics strip */}
      <div className="mx-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[8px] uppercase text-slate-500">Entry Premium</div>
          <div className={cn('text-[12px] font-bold font-mono mt-0.5', accentText)}>
            ₹{fp(strategy.entryPremium)}
          </div>
        </div>
        <div className="rounded-lg border border-rose-500/15 bg-rose-500/5 p-2">
          <div className="text-[8px] uppercase text-rose-400/70">SL Premium</div>
          <div className="text-[12px] font-bold font-mono mt-0.5 text-rose-400">
            ₹{fp(strategy.stopLossPremium)}
            <span className="text-[9px] font-normal ml-1 text-rose-400/60">−{strategy.stopLossPercent}%</span>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2">
          <div className="text-[8px] uppercase text-emerald-400/70">Target 1</div>
          <div className="text-[12px] font-bold font-mono mt-0.5 text-emerald-400">
            ₹{fp(strategy.target1Premium)}
          </div>
        </div>
        <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[8px] uppercase text-slate-500">Risk:Reward</div>
          <div className="text-[12px] font-bold font-mono mt-0.5 text-white">{rrDisplay}</div>
        </div>
      </div>

      {/* Confidence + holding time badges */}
      <div className="mx-3 mb-3 flex flex-wrap gap-2">
        <div className={cn('inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase', accentBadge)}>
          <div className={cn('w-1.5 h-1.5 rounded-full', isCE ? 'bg-emerald-400' : 'bg-rose-400')} />
          {strategy.confidence}% Confidence
        </div>
        <div className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800/30 px-2 py-1 text-[9px] font-bold uppercase text-slate-400">
          <Clock className="w-2.5 h-2.5" />
          {strategy.holdingTime}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded border border-blue-500/20 bg-blue-500/5 px-2 py-1 text-[9px] font-bold uppercase text-blue-400">
          IV {strategy.impliedVolatility.toFixed(1)}%
        </div>
        <div className="inline-flex items-center gap-1.5 rounded border border-purple-500/20 bg-purple-500/5 px-2 py-1 text-[9px] font-bold uppercase text-purple-400">
          PCR {strategy.pcr.toFixed(2)}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mx-3 mb-3 w-[calc(100%-24px)] flex items-center justify-center gap-1.5 rounded border border-[#27272a] py-1.5 text-[9px] uppercase tracking-wider text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide full strategy' : 'Show full strategy'}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* All premium levels */}
          <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[9px] uppercase text-slate-500 font-bold mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3" />
              Premium Levels
            </div>
            <PremRow label="Entry Premium"   value={`₹${fp(strategy.entryPremium)}`}      color={accentText} />
            <PremRow label="Stop Loss"        value={`₹${fp(strategy.stopLossPremium)}`}   color="text-rose-400"    sublabel={`−${strategy.stopLossPercent}%`} />
            <PremRow label="Target 1"         value={`₹${fp(strategy.target1Premium)}`}    color="text-emerald-400" sublabel={`+${fp(strategy.target1Premium - strategy.entryPremium)} pts`} />
            <PremRow label="Target 2"         value={`₹${fp(strategy.target2Premium)}`}    color="text-emerald-300" sublabel={`+${fp(strategy.target2Premium - strategy.entryPremium)} pts`} />
            <PremRow label="Target 3"         value={`₹${fp(strategy.target3Premium)}`}    color="text-emerald-200" sublabel={`+${fp(strategy.target3Premium - strategy.entryPremium)} pts`} />
            <PremRow label="Expected Move T1" value={`+${fp(strategy.expectedPremiumMove)} pts`} color="text-blue-400" />
          </div>

          {/* Options chain context */}
          <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[9px] uppercase text-slate-500 font-bold mb-2 flex items-center gap-1.5">
              <BarChart2 className="w-3 h-3" />
              Options Chain Context
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Spot Price',    value: `₹${fp(strategy.spotPrice)}`,     color: 'text-white' },
                { label: 'ATM Strike',    value: `${fp(strategy.atmStrike, 0)}`,   color: 'text-white' },
                { label: 'Max Pain',      value: `${fp(strategy.maxPain, 0)}`,     color: 'text-amber-400' },
                { label: 'PCR',           value: `${strategy.pcr.toFixed(2)}`,     color: strategy.pcr >= 1 ? 'text-emerald-400' : 'text-rose-400' },
                { label: `OI @ ${strategy.recommendedStrike}`, value: `${(strategy.oiAtStrike / 1e5).toFixed(2)}L`, color: 'text-slate-300' },
                { label: 'OI Change',     value: `${(strategy.oiChangeAtStrike / 1e4).toFixed(1)}K`, color: oiChangeColor(strategy.oiChangeAtStrike) },
                { label: 'Volume',        value: `${(strategy.volumeAtStrike / 1e3).toFixed(1)}K`, color: 'text-slate-300' },
                { label: 'IV',            value: `${strategy.impliedVolatility.toFixed(1)}%`, color: 'text-blue-400' },
              ].map(item => (
                <div key={item.label} className="rounded border border-[#1e1e22] bg-[#0a0a0d] px-2 py-1.5 flex justify-between items-center">
                  <span className="text-[8px] uppercase text-slate-600">{item.label}</span>
                  <span className={cn('text-[10px] font-bold font-mono', item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical reason */}
          <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[9px] uppercase text-slate-500 font-bold mb-2">Technical Basis</div>
            <p className="text-[10px] text-slate-400 leading-4">{strategy.technicalReason}</p>
          </div>

          {/* Options chain reason */}
          <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[9px] uppercase text-slate-500 font-bold mb-2">Options Chain Analysis</div>
            <p className="text-[10px] text-slate-400 leading-4">{strategy.optionChainReason}</p>
          </div>

          {/* Risk warning */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-200 leading-4">{strategy.riskWarning}</p>
          </div>

          {/* Data quality */}
          <DataQualityBanner dq={strategy.dataQuality} />
        </div>
      )}
    </div>
  );
}
