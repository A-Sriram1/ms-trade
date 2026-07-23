import React from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Signal } from '../types';

interface AIReasoningPanelProps {
  signal: Signal;
}

function ReasonRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
      <span className="text-[8px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={cn('text-[9px] font-bold font-mono', color || 'text-white')}>{value}</span>
    </div>
  );
}

function ScoreDot({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className={cn('h-full rounded-full animate-bar-fill', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[8px] font-bold font-mono text-white w-6 text-right">{score}</span>
    </div>
  );
}

export function AIReasoningPanel({ signal }: AIReasoningPanelProps) {
  const isBullish = signal.action === 'STRONG BUY' || signal.action === 'BUY';
  const isBearish = signal.action === 'STRONG SELL' || signal.action === 'SELL';
  const trendIcon = isBullish ? <TrendingUp className="w-3 h-3" /> : isBearish ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-blue-500/[0.03]">
        <Brain className="w-4 h-4 text-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white">AI Institutional Report</span>
        <div className="ml-auto flex items-center gap-1.5">
          {trendIcon}
          <span className="text-[9px] font-bold uppercase">{signal.action}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Signal Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-lg p-2.5 text-center">
            <div className="text-[7px] uppercase text-slate-500 tracking-wider">Confidence</div>
            <div className="text-lg font-bold font-mono text-white mt-1">{signal.confidence}%</div>
          </div>
          <div className="glass rounded-lg p-2.5 text-center">
            <div className="text-[7px] uppercase text-slate-500 tracking-wider">AI Score</div>
            <div className="text-lg font-bold font-mono text-blue-400 mt-1">{signal.scorecard.total}/80</div>
          </div>
          <div className="glass rounded-lg p-2.5 text-center">
            <div className="text-[7px] uppercase text-slate-500 tracking-wider">Risk:Reward</div>
            <div className="text-lg font-bold font-mono text-white mt-1">{signal.riskReward}</div>
          </div>
        </div>

        {/* Technical Analysis Breakdown */}
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3 h-3 text-blue-400" />
            <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Technical Analysis</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase text-slate-500">Trend</span>
              <ScoreDot score={signal.scorecard.trend} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase text-slate-500">Momentum</span>
              <ScoreDot score={signal.scorecard.momentum} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase text-slate-500">Volume</span>
              <ScoreDot score={signal.scorecard.volume} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase text-slate-500">Volatility</span>
              <ScoreDot score={signal.scorecard.volatility} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase text-slate-500">Breadth</span>
              <ScoreDot score={signal.scorecard.breadth} />
            </div>
          </div>
        </div>

        {/* Indicator Values */}
        <div className="glass rounded-lg p-3">
          <div className="text-[8px] uppercase text-slate-500 font-bold mb-2">Indicator Stack</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'EMA 9', value: signal.indicators.ema9.toFixed(2) },
              { label: 'EMA 21', value: signal.indicators.ema21.toFixed(2) },
              { label: 'EMA 50', value: signal.indicators.ema50.toFixed(2) },
              { label: 'RSI', value: signal.indicators.rsi.toFixed(1), color: signal.indicators.rsi > 70 ? 'text-rose-400' : signal.indicators.rsi < 30 ? 'text-emerald-400' : 'text-white' },
              { label: 'MACD', value: signal.indicators.macd.toFixed(2) },
              { label: 'VWAP', value: signal.indicators.vwap.toFixed(2) },
              { label: 'ATR', value: signal.indicators.atr.toFixed(2) },
              { label: 'ADX', value: signal.indicators.adx.toFixed(1), color: signal.indicators.adx > 25 ? 'text-emerald-400' : 'text-slate-400' },
              { label: 'Volume Ratio', value: signal.indicators.volumeRatio.toFixed(2) + 'x', color: signal.indicators.volumeRatio > 1.5 ? 'text-emerald-400' : 'text-slate-400' },
              { label: 'Candlestick', value: signal.candlestickPattern },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center rounded bg-surface border border-white/[0.03] px-2 py-1">
                <span className="text-[7px] uppercase text-slate-500">{item.label}</span>
                <span className={cn('text-[9px] font-bold font-mono', item.color || 'text-white')}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Options & Institutional */}
        <div className="glass rounded-lg p-3">
          <div className="text-[8px] uppercase text-slate-500 font-bold mb-2">Options & Institutional</div>
          <div className="grid grid-cols-2 gap-1.5">
            <ReasonRow label="Options Score" value={`${signal.scorecard.options}/10`} color={signal.scorecard.options >= 7 ? 'text-emerald-400' : signal.scorecard.options >= 4 ? 'text-amber-400' : 'text-rose-400'} />
            <ReasonRow label="News Score" value={`${signal.scorecard.news}/10`} color={signal.scorecard.news >= 7 ? 'text-emerald-400' : signal.scorecard.news >= 4 ? 'text-amber-400' : 'text-rose-400'} />
            <ReasonRow label="Institutional" value={`${signal.scorecard.institutional}/10`} color={signal.scorecard.institutional >= 7 ? 'text-emerald-400' : signal.scorecard.institutional >= 4 ? 'text-amber-400' : 'text-rose-400'} />
          </div>
        </div>

        {/* AI Decision Reasons */}
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3 h-3 text-blue-400" />
            <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">AI Decision Factors</span>
          </div>
          <div className="space-y-1.5">
            {signal.reason.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[9px] text-slate-400">
                <div className={cn('mt-1 w-1 h-1 rounded-full shrink-0', isBullish ? 'bg-emerald-400' : isBearish ? 'bg-rose-400' : 'bg-amber-400')} />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="glass rounded-lg p-3 border-blue-500/10">
          <div className="text-[8px] uppercase text-blue-400 font-bold mb-1">AI Summary</div>
          <p className="text-[10px] text-slate-300 leading-4">{signal.explanation}</p>
        </div>
      </div>
    </div>
  );
}
