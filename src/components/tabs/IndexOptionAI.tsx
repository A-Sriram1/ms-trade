import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Activity, Clock3, RefreshCw, Scale, ShieldAlert, TrendingDown, TrendingUp,
  Brain, Zap, Target, AlertTriangle, Layers,
} from 'lucide-react';
import type { OptionsAnalytics, OptionsAnalyticsRow, Signal, OptionsStrategyRecommendation } from '../../types';
import { cn } from '../../lib/utils';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function formatSignedCompact(value: number) {
  const compact = formatCompact(Math.abs(value));
  if (value > 0) return `+${compact}`;
  if (value < 0) return `-${compact}`;
  return compact;
}

function pcrTone(pcr: number) {
  if (pcr >= 1.2) return { label: 'BULLISH', className: 'text-emerald-400', barClass: 'bg-emerald-500' };
  if (pcr <= 0.8) return { label: 'BEARISH', className: 'text-rose-400', barClass: 'bg-rose-500' };
  return { label: 'NEUTRAL', className: 'text-amber-400', barClass: 'bg-amber-500' };
}

function HeatmapRow({ row, maxOi }: { row: OptionsAnalyticsRow; maxOi: number }) {
  const callWidth = `${Math.max(8, (row.ceOi / maxOi) * 100)}%`;
  const putWidth = `${Math.max(8, (row.peOi / maxOi) * 100)}%`;
  const heatOpacity = Math.min(0.6, Math.max(0.15, row.heat));

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.03] transition-colors">
      <div className="h-7 rounded bg-white/[0.02]">
        <div
          className="flex h-full items-center rounded px-3 text-[9px] font-bold text-emerald-200"
          style={{ width: callWidth, backgroundColor: `rgba(16, 185, 129, ${heatOpacity})` }}
        >
          <span className="truncate">{formatCompact(row.ceOi)}</span>
        </div>
      </div>
      <div className="min-w-[100px] text-center">
        <div className="text-[10px] font-bold font-mono text-white">{row.strike}</div>
        <div className="mt-0.5 text-[8px] uppercase tracking-[0.2em] text-slate-500">PCR {row.pcr.toFixed(2)}</div>
      </div>
      <div className="ml-auto h-7 w-full rounded bg-white/[0.02]">
        <div
          className="ml-auto flex h-full items-center justify-end rounded px-3 text-[9px] font-bold text-rose-200"
          style={{ width: putWidth, backgroundColor: `rgba(244, 63, 94, ${heatOpacity})` }}
        >
          <span className="truncate">{formatCompact(row.peOi)}</span>
        </div>
      </div>
    </div>
  );
}

interface IndexOptionAIProps {
  symbol: 'NIFTY' | 'BANKNIFTY' | 'SENSEX' | 'FINNIFTY';
  displayName: string;
}

export function IndexOptionAI({ symbol, displayName }: IndexOptionAIProps) {
  const [analytics, setAnalytics] = useState<OptionsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (bg = false) => {
    if (bg) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/options/${symbol}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load options analytics.');
      setAnalytics(payload);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load options analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchAnalytics();
    const timer = window.setInterval(() => fetchAnalytics(true), 60000);
    return () => window.clearInterval(timer);
  }, [fetchAnalytics]);

  const maxOi = useMemo(
    () => Math.max(...(analytics?.rows.map(row => Math.max(row.ceOi, row.peOi)) || [1])),
    [analytics]
  );

  const tone = analytics ? pcrTone(analytics.pcr) : pcrTone(1);

  if (loading && !analytics) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl glass-card">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
          Loading {displayName} options analytics...
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const totalVolume = analytics.rows.reduce((sum, row) => sum + row.ceVolume + row.peVolume, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>
      )}

      {analytics.dataSource && (
        <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-2 text-[10px] text-amber-200/80">{analytics.dataSource.banner}</div>
      )}

      {/* Hero Section */}
      <div className="glass-card rounded-2xl p-5 gradient-border">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.28em] text-blue-400">{displayName} AI Engine</div>
            <h2 className="mt-2 text-3xl font-bold font-mono tracking-tight text-white">
              {analytics.spot.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
              <span>ATM {analytics.atmStrike}</span>
              <span>Step {analytics.strikeStep}</span>
              <span>Max Pain {formatNumber(analytics.maxPain)}</span>
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-3 text-right">
            <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">PCR</div>
            <div className={cn('mt-2 text-3xl font-bold font-mono', tone.className)}>{analytics.pcr.toFixed(2)}</div>
            <div className={cn('mt-1 text-[10px] font-bold uppercase', tone.className)}>{tone.label}</div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { label: 'Total CE OI', value: formatCompact(analytics.totalCeOi), color: 'text-emerald-300', hint: 'Call writer resistance' },
            { label: 'Total PE OI', value: formatCompact(analytics.totalPeOi), color: 'text-rose-300', hint: 'Put support concentration' },
            { label: 'Combined Volume', value: formatCompact(totalVolume), color: 'text-white', hint: 'CE + PE traded volume' },
          ].map(item => (
            <div key={item.label} className="glass rounded-xl p-4">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</div>
              <div className={cn('mt-2 text-2xl font-bold font-mono', item.color)}>{item.value}</div>
              <div className="mt-1 text-[10px] text-slate-500">{item.hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Max Pain', value: formatNumber(analytics.maxPain), color: 'text-amber-400' },
          { label: 'PCR', value: analytics.pcr.toFixed(2), color: tone.className },
          { label: 'ATM Strike', value: formatNumber(analytics.atmStrike), color: 'text-white' },
          { label: 'Strikes', value: `${analytics.rows.length}`, color: 'text-blue-400' },
        ].map(item => (
          <div key={item.label} className="glass-card rounded-lg p-3">
            <div className="text-[8px] uppercase text-slate-500 tracking-wider">{item.label}</div>
            <div className={cn('text-lg font-bold font-mono mt-1', item.color)}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* OI Heatmap */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Option Chain Heatmap</h3>
            <p className="mt-1 text-[10px] text-slate-500">Call and put OI concentration by strike</p>
          </div>
          <button
            onClick={() => fetchAnalytics(true)}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:border-white/10 transition-all"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="space-y-2">
          {analytics.rows.map(row => (
            <HeatmapRow key={row.strike} row={row} maxOi={maxOi} />
          ))}
        </div>
      </div>

      {/* Full Option Chain Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">{displayName} Option Chain</h3>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Auto-refresh 60s</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-right font-mono text-[10px]">
            <thead className="sticky top-0 z-10 bg-surface text-[8px] uppercase text-slate-500">
              <tr>
                <th className="border-b border-white/5 px-3 py-2 text-emerald-400">CE OI</th>
                <th className="border-b border-white/5 px-3 py-2">OI Chg</th>
                <th className="border-b border-white/5 px-3 py-2">Vol</th>
                <th className="border-b border-white/5 px-3 py-2">IV</th>
                <th className="border-x border-b border-white/5 px-3 py-2 text-center text-white font-bold">Strike</th>
                <th className="border-b border-white/5 px-3 py-2">IV</th>
                <th className="border-b border-white/5 px-3 py-2">Vol</th>
                <th className="border-b border-white/5 px-3 py-2">OI Chg</th>
                <th className="border-b border-white/5 px-3 py-2 text-rose-400">PE OI</th>
                <th className="border-b border-white/5 px-3 py-2 text-amber-400">PCR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-slate-300">
              {analytics.rows.map(row => (
                <tr key={row.strike} className={row.strike === analytics.atmStrike ? 'bg-blue-500/5' : 'hover:bg-white/[0.02]'}>
                  <td className="px-3 py-2 text-emerald-300">{formatCompact(row.ceOi)}</td>
                  <td className={cn('px-3 py-2', row.ceOiChange >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{formatSignedCompact(row.ceOiChange)}</td>
                  <td className="px-3 py-2 text-slate-400">{formatCompact(row.ceVolume)}</td>
                  <td className="px-3 py-2 text-slate-400">{row.ceIv.toFixed(2)}%</td>
                  <td className="border-x border-white/5 px-3 py-2 text-center font-bold text-white">{row.strike}</td>
                  <td className="px-3 py-2 text-slate-400">{row.peIv.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-slate-400">{formatCompact(row.peVolume)}</td>
                  <td className={cn('px-3 py-2', row.peOiChange >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{formatSignedCompact(row.peOiChange)}</td>
                  <td className="px-3 py-2 text-rose-300">{formatCompact(row.peOi)}</td>
                  <td className={cn('px-3 py-2', row.pcr >= 1 ? 'text-emerald-400' : 'text-rose-400')}>{row.pcr.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Option Chain Analysis */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">AI Option Chain Analysis</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Highest Call OI', value: `${analytics.highestCallOiStrikes[0]?.strike || '—'}`, sub: formatCompact(analytics.highestCallOiStrikes[0]?.oi || 0) + ' contracts' },
            { label: 'Highest Put OI', value: `${analytics.highestPutOiStrikes[0]?.strike || '—'}`, sub: formatCompact(analytics.highestPutOiStrikes[0]?.oi || 0) + ' contracts' },
            { label: 'Call Writing', value: formatCompact(analytics.totalCeOi), sub: 'Resistance buildup' },
            { label: 'Put Writing', value: formatCompact(analytics.totalPeOi), sub: 'Support buildup' },
          ].map(item => (
            <div key={item.label} className="glass rounded-lg p-3">
              <div className="text-[8px] uppercase text-slate-500 tracking-wider">{item.label}</div>
              <div className="text-lg font-bold font-mono text-white mt-1">{item.value}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* AI Bias */}
        <div className="mt-4 glass rounded-lg p-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">AI Bias</span>
          </div>
          <div className={cn('text-sm font-bold uppercase', tone.className)}>
            {analytics.pcr >= 1.2 ? 'BULLISH' : analytics.pcr <= 0.8 ? 'BEARISH' : 'NEUTRAL'}
          </div>
          <div className="ml-auto flex items-center gap-2 text-[9px] text-slate-400">
            <span>Support: {analytics.highestPutOiStrikes[0]?.strike || '—'}</span>
            <span className="text-slate-600">|</span>
            <span>Resistance: {analytics.highestCallOiStrikes[0]?.strike || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
