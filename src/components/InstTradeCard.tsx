import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Target, ShieldAlert,
  ChevronDown, ChevronUp, Minus, Zap, BarChart2, Brain,
  Layers, Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Signal } from '../types';
import { useStore } from '../store';

function getActionStyle(action: Signal['action']) {
  switch (action) {
    case 'STRONG BUY':  return { bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', text: 'text-emerald-300', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400', glow: 'glow-emerald' };
    case 'BUY':         return { bg: 'bg-emerald-500/[0.04]', border: 'border-emerald-500/15', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', glow: '' };
    case 'WAIT':        return { bg: 'bg-amber-500/[0.04]', border: 'border-amber-500/15', text: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400', glow: '' };
    case 'EXIT':        return { bg: 'bg-orange-500/[0.04]', border: 'border-orange-500/15', text: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-400', glow: '' };
    case 'SELL':        return { bg: 'bg-rose-500/[0.04]', border: 'border-rose-500/15', text: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-500', glow: '' };
    case 'STRONG SELL': return { bg: 'bg-rose-500/[0.06]', border: 'border-rose-500/20', text: 'text-rose-300', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dot: 'bg-rose-400', glow: 'glow-rose' };
    default:            return { bg: 'bg-slate-500/[0.04]', border: 'border-slate-500/15', text: 'text-slate-400', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dot: 'bg-slate-500', glow: '' };
  }
}

function getActionIcon(action: Signal['action']) {
  if (action === 'STRONG BUY' || action === 'BUY') return <TrendingUp className="w-3 h-3" />;
  if (action === 'STRONG SELL' || action === 'SELL') return <TrendingDown className="w-3 h-3" />;
  if (action === 'EXIT') return <ShieldAlert className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function fp(v: number) {
  return v ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
      <div className={cn('h-full rounded-full animate-bar-fill transition-all duration-700', color)} style={{ width: `${value}%` }} />
    </div>
  );
}

function ScoreRow({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] uppercase tracking-wider text-slate-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className={cn('h-full rounded-full animate-bar-fill', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-bold font-mono text-white w-8 text-right">{value}/{max}</span>
    </div>
  );
}

function PositionCalc({ signal }: { signal: Signal }) {
  const { positionCalc, setPositionCalc } = useStore();
  const slDistance = Math.abs(signal.entry - signal.stopLoss);
  const riskAmount = positionCalc.capital * (positionCalc.riskPercent / 100);
  const quantity = slDistance > 0 ? Math.floor(riskAmount / slDistance) : 0;
  const maxLoss = quantity * slDistance;
  const capitalUsed = quantity * signal.entry;
  const marginRequired = capitalUsed * 0.2;

  return (
    <div className="glass-card rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-3 h-3 text-blue-400" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Position Calculator</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[8px] uppercase text-slate-500 block mb-1">Capital (₹)</label>
          <input type="number" value={positionCalc.capital} onChange={e => setPositionCalc({ ...positionCalc, capital: Number(e.target.value) })}
            className="w-full bg-surface border border-white/5 text-white text-[10px] px-2 py-1.5 rounded-md focus:outline-none focus:border-blue-500/50 font-mono transition-colors" />
        </div>
        <div>
          <label className="text-[8px] uppercase text-slate-500 block mb-1">Risk %</label>
          <input type="number" value={positionCalc.riskPercent} step={0.5} min={0.5} max={5}
            onChange={e => setPositionCalc({ ...positionCalc, riskPercent: Number(e.target.value) })}
            className="w-full bg-surface border border-white/5 text-white text-[10px] px-2 py-1.5 rounded-md focus:outline-none focus:border-blue-500/50 font-mono transition-colors" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px]">
        {[
          { label: 'Quantity', value: quantity.toLocaleString('en-IN'), color: 'text-white' },
          { label: 'Max Loss', value: `₹${maxLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-rose-400' },
          { label: 'Capital Used', value: `₹${capitalUsed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-white' },
          { label: 'Margin Req.', value: `₹${marginRequired.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-amber-400' },
        ].map(item => (
          <div key={item.label} className="rounded-md bg-surface border border-white/5 px-2 py-1.5">
            <div className="text-[7px] uppercase text-slate-500">{item.label}</div>
            <div className={cn('font-bold font-mono mt-0.5', item.color)}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface InstTradeCardProps {
  signal: Signal;
  showOptions?: boolean;
  compact?: boolean;
}

export function InstTradeCard({ signal, showOptions = false, compact = false }: InstTradeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = getActionStyle(signal.action);
  const isBullish = signal.action === 'STRONG BUY' || signal.action === 'BUY';
  const isBearish = signal.action === 'STRONG SELL' || signal.action === 'SELL';

  return (
    <div className={cn('glass-card rounded-xl p-4 transition-all duration-300 signal-card-enter hover:border-white/10', style.bg, style.border, style.glow)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full animate-pulse', style.dot)} />
          <div>
            <div className="text-sm font-bold text-white tracking-wide">{signal.symbol}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-slate-500">{signal.timeframe}</span>
              <span className="text-[9px] font-mono text-slate-600">·</span>
              <span className="text-[9px] font-mono text-slate-500">{signal.tradeType}</span>
              <span className="text-[9px] font-mono text-slate-600">·</span>
              <span className="text-[9px] font-mono text-slate-500">{signal.timestamp}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider', style.badge)}>
            {getActionIcon(signal.action)}
            {signal.action}
          </div>
          <div className="text-right">
            <div className={cn('text-lg font-bold font-mono', style.text)}>{signal.confidence}%</div>
            <div className="text-[8px] text-slate-500 uppercase tracking-wider">Confidence</div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3">
        <ConfidenceBar value={signal.confidence} color={isBullish ? 'bg-emerald-500' : isBearish ? 'bg-rose-500' : 'bg-amber-500'} />
      </div>

      {/* Core trade data */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="glass rounded-lg p-2">
          <div className="text-[7px] uppercase text-slate-500 tracking-wider">Entry</div>
          <div className="text-[11px] font-bold font-mono text-white mt-0.5">{fp(signal.entry)}</div>
        </div>
        <div className="glass rounded-lg p-2 border-rose-500/10">
          <div className="text-[7px] uppercase text-rose-400/70 tracking-wider">Stoploss</div>
          <div className="text-[11px] font-bold font-mono text-rose-400 mt-0.5">{fp(signal.stopLoss)}</div>
        </div>
        <div className="glass rounded-lg p-2 border-emerald-500/10">
          <div className="text-[7px] uppercase text-emerald-400/70 tracking-wider">Target 1</div>
          <div className="text-[11px] font-bold font-mono text-emerald-400 mt-0.5">{fp(signal.target1)}</div>
        </div>
        <div className="glass rounded-lg p-2 border-emerald-500/10">
          <div className="text-[7px] uppercase text-emerald-400/70 tracking-wider">Target 2</div>
          <div className="text-[11px] font-bold font-mono text-emerald-300 mt-0.5">{fp(signal.target2)}</div>
        </div>
        <div className="glass rounded-lg p-2">
          <div className="text-[7px] uppercase text-slate-500 tracking-wider">Risk : Reward</div>
          <div className="text-[11px] font-bold font-mono text-white mt-0.5">{signal.riskReward}</div>
        </div>
      </div>

      {/* Badges row */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <div className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase', style.badge)}>
          <Zap className="w-2.5 h-2.5" />
          {signal.tradeStatus}
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.02] px-2 py-0.5 text-[8px] font-bold uppercase text-slate-400">
          <Clock className="w-2.5 h-2.5" />
          {signal.tradeDuration}
        </div>
        {signal.candlestickPattern !== 'None' && (
          <div className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 text-[8px] font-bold uppercase text-purple-400">
            {signal.candlestickPattern}
          </div>
        )}
        <div className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-0.5 text-[8px] font-bold uppercase text-blue-400">
          <Brain className="w-2.5 h-2.5" />
          {signal.scorecard.total}/80
        </div>
      </div>

      {/* Explanation */}
      <p className="mt-3 text-[10px] leading-4 text-slate-400">{signal.explanation}</p>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/5 py-1.5 text-[8px] uppercase tracking-wider text-slate-500 hover:text-white hover:border-white/10 transition-all duration-200 bg-white/[0.01]"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Less detail' : 'Full AI Analysis'}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 animate-slide-up">
          {/* All targets */}
          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Target 1', val: signal.target1 }, { label: 'Target 2', val: signal.target2 }, { label: 'Target 3', val: signal.target3 }].map(t => (
              <div key={t.label} className="glass rounded-lg p-2 border-emerald-500/10">
                <div className="text-[7px] uppercase text-emerald-400/60 tracking-wider">{t.label}</div>
                <div className="text-[11px] font-bold font-mono text-emerald-400 mt-0.5">{fp(t.val)}</div>
              </div>
            ))}
          </div>

          {/* Trailing SL + Support/Resistance */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass rounded-lg p-2 border-amber-500/10">
              <div className="text-[7px] uppercase text-amber-400/70 tracking-wider">Trailing SL</div>
              <div className="text-[10px] font-bold font-mono text-amber-400 mt-0.5">{fp(signal.trailingStopLoss)}</div>
              <div className="text-[7px] text-slate-600 mt-0.5">After T1 hit</div>
            </div>
            <div className="glass rounded-lg p-2">
              <div className="text-[7px] uppercase text-slate-500 tracking-wider">Support</div>
              <div className="text-[10px] font-bold font-mono text-white mt-0.5">{fp(signal.supportLevel)}</div>
            </div>
            <div className="glass rounded-lg p-2">
              <div className="text-[7px] uppercase text-slate-500 tracking-wider">Resistance</div>
              <div className="text-[10px] font-bold font-mono text-white mt-0.5">{fp(signal.resistanceLevel)}</div>
            </div>
          </div>

          {/* Indicators grid */}
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3 h-3 text-blue-400" />
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Technical Indicators</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
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
                <div key={k as string} className="flex justify-between items-center rounded bg-surface border border-white/[0.03] px-2 py-1">
                  <span className="text-slate-500 uppercase text-[8px]">{k}</span>
                  <span className="text-white font-bold">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Scorecard */}
          <div className="glass rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-3 h-3 text-blue-400" />
                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">AI Scorecard</span>
              </div>
              <span className={cn('text-[10px] font-bold font-mono', style.text)}>{signal.scorecard.total}/80</span>
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
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3 h-3 text-blue-400" />
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">AI Reasoning</span>
            </div>
            <div className="space-y-1.5">
              {signal.reason.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] text-slate-400">
                  <div className={cn('mt-1.5 w-1 h-1 rounded-full shrink-0', style.dot)} />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Position calculator */}
          <PositionCalc signal={signal} />
        </div>
      )}
    </div>
  );
}
