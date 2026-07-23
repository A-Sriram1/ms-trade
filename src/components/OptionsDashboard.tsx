import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, RefreshCw, Scale, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';
import type { OptionsAnalytics, OptionsAnalyticsRow } from '../types';
import { OptionsStrategyPanel } from './OptionsStrategyPanel';

type OptionsSymbol = 'NIFTY' | 'BANKNIFTY';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCompact(value: number) {
  const compact = formatCompact(Math.abs(value));

  if (value > 0) {
    return `+${compact}`;
  }

  if (value < 0) {
    return `-${compact}`;
  }

  return compact;
}

function pcrTone(pcr: number) {
  if (pcr >= 1.2) {
    return {
      label: 'Put Heavy',
      className: 'text-emerald-400',
      barClass: 'bg-emerald-500',
    };
  }

  if (pcr <= 0.8) {
    return {
      label: 'Call Heavy',
      className: 'text-rose-400',
      barClass: 'bg-rose-500',
    };
  }

  return {
    label: 'Balanced',
    className: 'text-amber-400',
    barClass: 'bg-amber-500',
  };
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#111114] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

function HeatmapRow({ row, maxOi }: { row: OptionsAnalyticsRow; maxOi: number }) {
  const callWidth = `${Math.max(8, (row.ceOi / maxOi) * 100)}%`;
  const putWidth = `${Math.max(8, (row.peOi / maxOi) * 100)}%`;
  const heatOpacity = Math.min(0.6, Math.max(0.15, row.heat));

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-[#27272a]/70 bg-[#0d0d11] px-3 py-2">
      <div className="h-8 rounded bg-[#18181b]">
        <div
          className="flex h-full items-center rounded px-3 text-[10px] font-bold text-emerald-200"
          style={{ width: callWidth, backgroundColor: `rgba(16, 185, 129, ${heatOpacity})` }}
        >
          <span className="truncate">{formatCompact(row.ceOi)}</span>
        </div>
      </div>
      <div className="min-w-[104px] text-center">
        <div className="text-[11px] font-bold text-white">{row.strike}</div>
        <div className="mt-1 text-[9px] uppercase tracking-[0.24em] text-slate-500">PCR {row.pcr.toFixed(2)}</div>
      </div>
      <div className="ml-auto h-8 w-full rounded bg-[#18181b]">
        <div
          className="ml-auto flex h-full items-center justify-end rounded px-3 text-[10px] font-bold text-rose-200"
          style={{ width: putWidth, backgroundColor: `rgba(244, 63, 94, ${heatOpacity})` }}
        >
          <span className="truncate">{formatCompact(row.peOi)}</span>
        </div>
      </div>
    </div>
  );
}

export function OptionsDashboard() {
  const [symbol, setSymbol] = useState<OptionsSymbol>('NIFTY');
  const [analytics, setAnalytics] = useState<OptionsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(
    async (isBackgroundRefresh = false) => {
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/options/${symbol}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load options analytics.');
        }

        setAnalytics(payload);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load options analytics.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [symbol]
  );

  useEffect(() => {
    fetchAnalytics();

    const timer = window.setInterval(() => {
      fetchAnalytics(true);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [fetchAnalytics]);

  const maxOi = useMemo(
    () => Math.max(...(analytics?.rows.map((row) => Math.max(row.ceOi, row.peOi)) || [1])),
    [analytics]
  );
  const totalVolume = useMemo(
    () => (analytics?.rows || []).reduce((sum, row) => sum + row.ceVolume + row.peVolume, 0),
    [analytics]
  );

  const tone = analytics ? pcrTone(analytics.pcr) : pcrTone(1);

  return (
    <div className="flex h-full flex-col space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#27272a] pb-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-white">Options Dashboard</h1>
          <p className="mt-1 text-[11px] font-mono text-blue-500">
            NIFTY and BANKNIFTY options analytics with 60-second refresh
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded border border-[#27272a] bg-[#18181b] p-1">
            {(['NIFTY', 'BANKNIFTY'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSymbol(item)}
                className={`rounded px-4 py-1 text-[10px] font-bold uppercase transition-colors ${
                  symbol === item ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            className="flex items-center gap-2 rounded border border-[#27272a] bg-[#111114] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {analytics?.dataSource && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {analytics.dataSource.banner}
        </div>
      )}

      {loading && !analytics ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-[#27272a] bg-[#111114]">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
            Loading options analytics...
          </div>
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-[#27272a] bg-gradient-to-br from-[#111114] via-[#111114] to-blue-950/30 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-400">
                    {analytics.symbol} Options Dashboard
                  </div>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                    {analytics.spot.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span>ATM {analytics.atmStrike}</span>
                    <span>Step {analytics.strikeStep}</span>
                    <span>Max Pain {formatNumber(analytics.maxPain)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">PCR Indicator</div>
                  <div className={`mt-2 text-3xl font-bold ${tone.className}`}>{analytics.pcr.toFixed(2)}</div>
                  <div className={`mt-1 text-[11px] font-semibold ${tone.className}`}>{tone.label}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[#27272a] bg-[#09090b]/70 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Total CE OI</div>
                  <div className="mt-2 text-2xl font-bold text-emerald-300">{formatCompact(analytics.totalCeOi)}</div>
                  <div className="mt-1 text-[11px] text-slate-500">Writer resistance concentration</div>
                </div>
                <div className="rounded-xl border border-[#27272a] bg-[#09090b]/70 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Total PE OI</div>
                  <div className="mt-2 text-2xl font-bold text-rose-300">{formatCompact(analytics.totalPeOi)}</div>
                  <div className="mt-1 text-[11px] text-slate-500">Put support concentration</div>
                </div>
                <div className="rounded-xl border border-[#27272a] bg-[#09090b]/70 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Combined Volume</div>
                  <div className="mt-2 text-2xl font-bold text-white">{formatCompact(totalVolume)}</div>
                  <div className="mt-1 text-[11px] text-slate-500">CE and PE traded volume</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
              <SummaryCard
                label="Last Update"
                value={analytics.updatedAt}
                hint={`Auto refresh every ${analytics.refreshIntervalSeconds} seconds`}
              />
              <SummaryCard
                label="Highest CE OI"
                value={formatNumber(analytics.highestCallOiStrikes[0]?.strike || 0)}
                hint={`${formatCompact(analytics.highestCallOiStrikes[0]?.oi || 0)} contracts`}
              />
              <SummaryCard
                label="Highest PE OI"
                value={formatNumber(analytics.highestPutOiStrikes[0]?.strike || 0)}
                hint={`${formatCompact(analytics.highestPutOiStrikes[0]?.oi || 0)} contracts`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="ATM Strike"
              value={formatNumber(analytics.atmStrike)}
              hint={`${analytics.symbol} closest active strike`}
            />
            <SummaryCard
              label="PCR Indicator"
              value={analytics.pcr.toFixed(2)}
              hint={`${tone.label} positioning`}
            />
            <SummaryCard
              label="Max Pain"
              value={formatNumber(analytics.maxPain)}
              hint="Minimum writer payout zone"
            />
            <SummaryCard
              label="Refresh Cycle"
              value={`${analytics.refreshIntervalSeconds}s`}
              hint="Background data update cadence"
            />
            <SummaryCard
              label="Strikes Tracked"
              value={`${analytics.rows.length}`}
              hint="Strike levels around ATM"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-[#27272a] bg-[#111114] p-4 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">OI Heatmap</h2>
                  <p className="mt-1 text-[11px] text-slate-500">Call and put concentration by strike</p>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Auto refresh 60s</div>
              </div>

              <div className="space-y-3">
                {analytics.rows.map((row) => (
                  <HeatmapRow key={row.strike} row={row} maxOi={maxOi} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#27272a] bg-[#111114] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">PCR Indicator</h2>
                </div>
                <div className={`text-3xl font-bold ${tone.className}`}>{analytics.pcr.toFixed(2)}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#18181b]">
                  <div
                    className={`h-full ${tone.barClass}`}
                    style={{ width: `${Math.min(100, analytics.pcr * 50)}%` }}
                  />
                </div>
                <div className={`mt-3 text-xs font-bold uppercase tracking-wider ${tone.className}`}>{tone.label}</div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Total CE OI {formatCompact(analytics.totalCeOi)} vs PE OI {formatCompact(analytics.totalPeOi)}
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock3 className="h-3.5 w-3.5 text-blue-400" />
                  Last refresh {analytics.updatedAt} IST
                </div>
              </div>

              <div className="rounded-xl border border-[#27272a] bg-[#111114] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Highest OI Strikes</h2>
                </div>
                <div className="space-y-3">
                  {analytics.highestCallOiStrikes.map((level, index) => (
                    <div key={`call-${level.strike}`} className="flex items-center justify-between rounded bg-[#18181b] px-3 py-2 text-[11px]">
                      <div className="flex items-center gap-2 text-rose-400">
                        <TrendingDown className="h-3.5 w-3.5" />
                        <span className="font-bold uppercase">CE #{index + 1}</span>
                      </div>
                      <span className="font-mono text-white">{level.strike}</span>
                      <span className="text-slate-400">{formatCompact(level.oi)}</span>
                    </div>
                  ))}
                  {analytics.highestPutOiStrikes.map((level, index) => (
                    <div key={`put-${level.strike}`} className="flex items-center justify-between rounded bg-[#18181b] px-3 py-2 text-[11px]">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="font-bold uppercase">PE #{index + 1}</span>
                      </div>
                      <span className="font-mono text-white">{level.strike}</span>
                      <span className="text-slate-400">{formatCompact(level.oi)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#27272a] bg-[#111114] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Max Pain Calculator</h2>
                </div>
                <div className="text-3xl font-bold text-white">{formatNumber(analytics.maxPain)}</div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Derived from strike-wise CE and PE open interest payout pressure.
                </div>
                <div className="mt-4 rounded bg-[#18181b] px-3 py-2 text-[11px] text-slate-300">
                  Updated {analytics.updatedAt} IST
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#27272a] bg-[#111114]">
            <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">{analytics.symbol} Option Chain</h2>
                <p className="mt-1 text-[11px] text-slate-500">Strike price, OI, OI change, volume, IV and per-strike PCR</p>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Refreshes every {analytics.refreshIntervalSeconds}s
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-right font-mono text-[11px]">
                <thead className="sticky top-0 z-10 bg-[#09090b] text-[9px] uppercase text-slate-500">
                  <tr>
                    <th className="border-b border-[#27272a] px-3 py-2 text-emerald-400">CE OI</th>
                    <th className="border-b border-[#27272a] px-3 py-2">OI Chg</th>
                    <th className="border-b border-[#27272a] px-3 py-2">Volume</th>
                    <th className="border-b border-[#27272a] px-3 py-2">IV</th>
                    <th className="border-x border-b border-[#27272a] px-3 py-2 text-center text-white">Strike Price</th>
                    <th className="border-b border-[#27272a] px-3 py-2">IV</th>
                    <th className="border-b border-[#27272a] px-3 py-2">Volume</th>
                    <th className="border-b border-[#27272a] px-3 py-2">OI Chg</th>
                    <th className="border-b border-[#27272a] px-3 py-2 text-rose-400">PE OI</th>
                    <th className="border-b border-[#27272a] px-3 py-2 text-amber-400">PCR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/50 text-slate-300">
                  {analytics.rows.map((row) => (
                    <tr key={row.strike} className={row.strike === analytics.atmStrike ? 'bg-blue-500/5' : 'hover:bg-[#18181b]'}>
                      <td className="px-3 py-2 text-emerald-300">{formatCompact(row.ceOi)}</td>
                      <td className={row.ceOiChange >= 0 ? 'px-3 py-2 text-emerald-400' : 'px-3 py-2 text-rose-400'}>
                        {formatSignedCompact(row.ceOiChange)}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{formatCompact(row.ceVolume)}</td>
                      <td className="px-3 py-2 text-slate-400">{row.ceIv.toFixed(2)}%</td>
                      <td className="border-x border-[#27272a] px-3 py-2 text-center font-bold text-white">{row.strike}</td>
                      <td className="px-3 py-2 text-slate-400">{row.peIv.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-slate-400">{formatCompact(row.peVolume)}</td>
                      <td className={row.peOiChange >= 0 ? 'px-3 py-2 text-emerald-400' : 'px-3 py-2 text-rose-400'}>
                        {formatSignedCompact(row.peOiChange)}
                      </td>
                      <td className="px-3 py-2 text-rose-300">{formatCompact(row.peOi)}</td>
                      <td className={row.pcr >= 1 ? 'px-3 py-2 text-emerald-400' : 'px-3 py-2 text-rose-400'}>
                        {row.pcr.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── AI Options Strategy Engine ──────────────────────────────── */}
          <div className="rounded-xl border border-[#27272a] bg-[#111114] p-4">
            <OptionsStrategyPanel />
          </div>
        </>
      ) : null}
    </div>
  );
}
