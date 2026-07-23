import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Target, ShieldAlert,
  BarChart2, ChevronDown, ChevronUp, Minus, Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Signal } from '../types';
import { OptionsStrategyCard } from './OptionsStrategyCard';

// ─── Action styling ──────────────────────────────────────────────────────────

function getActionStyle(action: Signal['action']) {
  switch (action) {
    case 'STRONG BUY':  return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' };
    case 'BUY':         return { bg: 'bg-emerald-500/8',  border: 'border-emerald-500/25', text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' };
    case 'WAIT':        return { bg: 'bg-amber-500/8',    border: 'border-amber-500/25',   text: 'text-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   dot: 'bg-amber-400' };
    case 'EXIT':        return { bg: 'bg-orange-500/8',   border: 'border-orange-500/25',  text: 'text-orange-400',  badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',  dot: 'bg-orange-400' };
    case 'SELL':        return { bg: 'bg-rose-500/8',     border: 'border-rose-500/25',    text: 'text-rose-400',    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',    dot: 'bg-rose-500' };
    case 'STRONG SELL': return { bg: 'bg-rose-500/15',    border: 'border-rose-500/40',    text: 'text-rose-300',    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',    dot: 'bg-rose-400' };
    default:            return { bg: 'bg-slate-500/8',    border: 'border-slate-500/25',   text: 'text-slate-400',   badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',   dot: 'bg-slate-500' };
  }
}

function getActionIcon(action: Signal['action']) {
  if (action === 'STRONG BUY' || action === 'BUY') return <TrendingUp className="w-3.5 h-3.5" />;
  if (action === 'STRONG SELL' || action === 'SELL') return <TrendingDown className="w-3.5 h-3.5" />;
  if (action === 'EXIT') return <ShieldAlert className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[#27272a] overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function ScoreRow({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 w-20 shrink-0">{label}</span>
      <div className="flex-1"><ConfidenceBar value={pct} color={color} /></div>
      <span className="text-[10px] font-bold text-white w-8 text-right">{value}/{max}</span>
    </div>
  );
}

// ─── Position Size Calculator ─────────────────────────────────────────────────

function PositionCalc({ signal }: { signal: Signal }) {
  const [capital, setCapital] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);

  const slDistance = Math.abs(signal.entry - signal.stopLoss);
  const riskAmount = capital * (riskPct / 100);
  const quantity = slDistance > 0 ? Math.floor(riskAmount / slDistance) : 0;
  const maxLoss = quantity * slDistance;
  const capitalUsed = quantity * signal.entry;
  const marginRequired = capitalUsed * 0.2; // approximate 5x leverage

  return (
    <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Position Size Calculator</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[9px] uppercase text-slate-500 block mb-1">Capital (₹)</label>
          <input
            type="number"
            value={capital}
            onChange={e => setCapital(Number(e.target.value))}
            className="w-full bg-[#09090b] border border-[#27272a] text-white text-[11px] px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase text-slate-500 block mb-1">Risk %</label>
          <input
            type="number"
            value={riskPct}
            step={0.5}
            min={0.5}
            max={5}
            onChange={e => setRiskPct(Number(e.target.value))}
            className="w-full bg-[#09090b] border border-[#27272a] text-white text-[11px] px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded bg-[#09090b] border border-[#27272a] p-2">
          <div className="text-slate-500 uppercase text-[8px]">Quantity</div>
          <div className="text-white font-bold font-mono mt-0.5">{quantity.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded bg-[#09090b] border border-[#27272a] p-2">
          <div className="text-slate-500 uppercase text-[8px]">Max Loss</div>
          <div className="text-rose-400 font-bold font-mono mt-0.5">₹{maxLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="rounded bg-[#09090b] border border-[#27272a] p-2">
          <div className="text-slate-500 uppercase text-[8px]">Capital Used</div>
          <div className="text-white font-bold font-mono mt-0.5">₹{capitalUsed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="rounded bg-[#09090b] border border-[#27272a] p-2">
          <div className="text-slate-500 uppercase text-[8px]">Margin Req.</div>
          <div className="text-amber-400 font-bold font-mono mt-0.5">₹{marginRequired.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
      </div>
    </div>
  );
}

// ─── MTF Badge ───────────────────────────────────────────────────────────────

function MTFBadge({ label, value }: { label: string; value: string }) {
  const color = value === 'BUY' || value === 'STRONG BUY'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : value === 'SELL' || value === 'STRONG SELL'
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      : 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <div className={`rounded border px-1.5 py-1 text-center ${color}`}>
      <div className="text-[8px] uppercase text-current/60 font-bold">{label}</div>
      <div className="text-[9px] font-bold uppercase mt-0.5">{value}</div>
    </div>
  );
}

// ─── Main SignalCard ──────────────────────────────────────────────────────────

export function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const style = getActionStyle(signal.action);
  const isBullish = signal.action === 'STRONG BUY' || signal.action === 'BUY';
  const isBearish = signal.action === 'STRONG SELL' || signal.action === 'SELL';

  const formatPrice = (v: number) =>
    v ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';

  return (
    <div className={cn('rounded-xl border p-4 transition-all duration-200', style.bg, style.border)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full animate-pulse', style.dot)} />
          <div>
            <div className="text-sm font-bold text-white tracking-wide">{signal.symbol}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              {signal.timeframe} · {signal.tradeType} · {signal.timestamp} IST
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider', style.badge)}>
            {getActionIcon(signal.action)}
            {signal.action}
          </div>
          <div className="text-right">
            <div className={cn('text-[11px] font-bold', style.text)}>{signal.confidence}%</div>
            <div className="text-[9px] text-slate-500 uppercase">Confidence</div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3">
        <ConfidenceBar
          value={signal.confidence}
          color={isBullish ? 'bg-emerald-500' : isBearish ? 'bg-rose-500' : 'bg-amber-500'}
        />
      </div>

      {/* Explanation */}
      <p className="mt-3 text-[11px] leading-5 text-slate-300">{signal.explanation}</p>

      {/* Status + Holding time */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div className={cn('inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-wider', style.badge)}>
          <Zap className="w-2.5 h-2.5" />
          {signal.tradeStatus}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          <Clock className="w-2.5 h-2.5" />
          {signal.tradeDuration}
        </div>
        {signal.candlestickPattern !== 'None' && (
          <div className="inline-flex items-center gap-1.5 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-purple-400">
            {signal.candlestickPattern}
          </div>
        )}
      </div>

      {/* Entry Zone, SL, Targets grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[8px] uppercase text-slate-500">Entry Zone</div>
          <div className="text-[10px] font-bold text-white mt-0.5 font-mono">
            {formatPrice(signal.entryZoneLow)} – {formatPrice(signal.entryZoneHigh)}
          </div>
        </div>
        <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2">
          <div className="text-[8px] uppercase text-rose-400/70">Stop Loss</div>
          <div className="text-[10px] font-bold text-rose-400 mt-0.5 font-mono">{formatPrice(signal.stopLoss)}</div>
        </div>
        <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
          <div className="text-[8px] uppercase text-emerald-400/70">Target 1</div>
          <div className="text-[10px] font-bold text-emerald-400 mt-0.5 font-mono">{formatPrice(signal.target1)}</div>
        </div>
        <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[8px] uppercase text-slate-500">Risk:Reward</div>
          <div className="text-[10px] font-bold text-white mt-0.5 font-mono">{signal.riskReward}</div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded border border-[#27272a] py-1.5 text-[9px] uppercase tracking-wider text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Less detail' : 'Full analysis'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* All targets */}
          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Target 1', val: signal.target1 }, { label: 'Target 2', val: signal.target2 }, { label: 'Target 3', val: signal.target3 }].map(t => (
              <div key={t.label} className="rounded border border-emerald-500/15 bg-emerald-500/5 p-2">
                <div className="text-[8px] uppercase text-emerald-400/60">{t.label}</div>
                <div className="text-[10px] font-bold text-emerald-400 mt-0.5 font-mono">{formatPrice(t.val)}</div>
              </div>
            ))}
          </div>

          {/* Trailing SL */}
          <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2 flex justify-between items-center">
            <div>
              <div className="text-[8px] uppercase text-amber-400/70">Trailing Stop Loss</div>
              <div className="text-[11px] font-bold text-amber-400 font-mono">{formatPrice(signal.trailingStopLoss)}</div>
            </div>
            <div className="text-[9px] text-slate-500">Activates after T1 hit</div>
          </div>

          {/* Support / Resistance */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
              <div className="text-[8px] uppercase text-slate-500">Support</div>
              <div className="text-[10px] font-bold text-white mt-0.5 font-mono">{formatPrice(signal.supportLevel)}</div>
            </div>
            <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
              <div className="text-[8px] uppercase text-slate-500">Resistance</div>
              <div className="text-[10px] font-bold text-white mt-0.5 font-mono">{formatPrice(signal.resistanceLevel)}</div>
            </div>
          </div>

          {/* Indicators */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            {[
              ['EMA 9', signal.indicators.ema9],
              ['EMA 21', signal.indicators.ema21],
              ['EMA 50', signal.indicators.ema50],
              ['RSI', signal.indicators.rsi],
              ['ATR', signal.indicators.atr],
              ['ADX', signal.indicators.adx],
              ['VWAP', signal.indicators.vwap],
              ['Vol Ratio', signal.indicators.volumeRatio + 'x'],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded border border-[#27272a] bg-[#09090b] px-2 py-1.5 flex justify-between">
                <span className="text-slate-500 uppercase text-[9px]">{k}</span>
                <span className="text-white font-bold">{typeof v === 'number' ? v.toFixed(2) : v}</span>
              </div>
            ))}
          </div>

          {/* MTF Confirmation */}
          <div>
            <div className="text-[9px] uppercase text-slate-500 mb-2 flex items-center gap-2">
              Multi-Timeframe
              <span className={cn('rounded px-1.5 py-0.5 text-[8px] font-bold', signal.mtf.confirmedCount >= 4 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')}>
                {signal.mtf.confirmedCount}/6 confirmed
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {[['1M', signal.mtf.tf1m], ['3M', signal.mtf.tf3m], ['5M', signal.mtf.tf5m], ['15M', signal.mtf.tf15m], ['30M', signal.mtf.tf30m], ['1H', signal.mtf.tf1h]].map(([l, v]) => (
                <MTFBadge key={l as string} label={l as string} value={v as string} />
              ))}
            </div>
          </div>

          {/* AI Scorecard */}
          <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">AI Scorecard</span>
              <span className={cn('text-[10px] font-bold', style.text)}>{signal.scorecard.total}/80</span>
            </div>
            <div className="space-y-1.5">
              {[
                ['Trend', signal.scorecard.trend],
                ['Momentum', signal.scorecard.momentum],
                ['Volume', signal.scorecard.volume],
                ['Options', signal.scorecard.options],
                ['News', signal.scorecard.news],
                ['Volatility', signal.scorecard.volatility],
                ['Institutional', signal.scorecard.institutional],
                ['Breadth', signal.scorecard.breadth],
              ].map(([l, v]) => (
                <ScoreRow key={l as string} label={l as string} value={v as number} />
              ))}
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-1.5">
            {signal.reason.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                <div className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
                <span>{r}</span>
              </div>
            ))}
          </div>

          {/* Position calculator */}
          <PositionCalc signal={signal} />

          {/* Options Strategy Engine */}
          {signal.optionsStrategy && (
            <OptionsStrategyCard strategy={signal.optionsStrategy} />
          )}
        </div>
      )}
    </div>
  );
}
