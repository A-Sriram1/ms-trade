import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import type { MarketContext } from '../types';

interface HeatmapItem {
  symbol?: string;
  ltp: number;
  change: number;
  change_pct: number;
}

interface SectorGroup {
  name: string;
  stocks: string[];
}

const SECTORS: SectorGroup[] = [
  { name: 'Banking', stocks: ['HDFCBANK', 'ICICIBANK', 'SBIN'] },
  { name: 'IT', stocks: ['TCS', 'INFY'] },
  { name: 'Energy', stocks: ['RELIANCE'] },
];

function getHeatColor(changePct: number): string {
  const abs = Math.min(Math.abs(changePct), 5);
  const intensity = 0.15 + (abs / 5) * 0.55;
  if (changePct >= 0) {
    return `rgba(16, 185, 129, ${intensity})`;
  }
  return `rgba(244, 63, 94, ${intensity})`;
}

function getHeatBorder(changePct: number): string {
  if (changePct >= 0) return 'border-emerald-500/30';
  return 'border-rose-500/30';
}

function trendColor(t: string) {
  if (t === 'BULLISH') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (t === 'BEARISH') return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
  return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
}

function trendIcon(t: string) {
  if (t === 'BULLISH') return <TrendingUp className="w-2.5 h-2.5" />;
  if (t === 'BEARISH') return <TrendingDown className="w-2.5 h-2.5" />;
  return <Minus className="w-2.5 h-2.5" />;
}

function vixColor(level: string) {
  if (level === 'EXTREME') return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
  if (level === 'HIGH') return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
  if (level === 'MEDIUM') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
}

function IndexTile({ title, item, trend }: { title: string; item: HeatmapItem | null; trend?: string }) {
  if (!item) {
    return (
      <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4 animate-pulse h-24" />
    );
  }
  const isPositive = item.change >= 0;
  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col justify-between h-24 transition-colors',
        getHeatBorder(item.change_pct)
      )}
      style={{ backgroundColor: getHeatColor(item.change_pct) }}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-white/80 font-bold text-[10px] uppercase tracking-wider">{title}</h3>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={cn('text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border flex items-center gap-0.5', trendColor(trend))}>
              {trendIcon(trend)}
              {trend}
            </span>
          )}
          <span className={cn('text-[10px] font-bold flex items-center gap-0.5', isPositive ? 'text-emerald-200' : 'text-rose-200')}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {item.change_pct.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="text-lg font-bold font-mono text-white tracking-tight">
        {item.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function StockTile({ item }: { item: HeatmapItem | null }) {
  if (!item) return null;
  const isPositive = item.change >= 0;
  const stockTrend = item.change_pct > 0.3 ? 'BULLISH' : item.change_pct < -0.3 ? 'BEARISH' : 'SIDEWAYS';
  return (
    <div
      className={cn(
        'rounded-lg border p-3 flex flex-col justify-between h-20 transition-colors',
        getHeatBorder(item.change_pct)
      )}
      style={{ backgroundColor: getHeatColor(item.change_pct) }}
    >
      <div className="flex justify-between items-start">
        <span className="text-white/80 font-bold text-[10px] uppercase tracking-wider">{item.symbol}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[7px] font-bold uppercase px-1 py-0.5 rounded border flex items-center gap-0.5', trendColor(stockTrend))}>
            {trendIcon(stockTrend)}
          </span>
          <span className={cn('text-[10px] font-bold', isPositive ? 'text-emerald-200' : 'text-rose-200')}>
            {isPositive ? '+' : ''}{item.change_pct.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="text-sm font-bold font-mono text-white">
        {item.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function SectorSummary({ name, stocks }: { name: string; stocks: HeatmapItem[] }) {
  if (stocks.length === 0) return null;
  const avgChange = stocks.reduce((sum, s) => sum + s.change_pct, 0) / stocks.length;
  const sectorTrend = avgChange > 0.3 ? 'BULLISH' : avgChange < -0.3 ? 'BEARISH' : 'SIDEWAYS';
  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{name}</div>
      <span className={cn('text-[7px] font-bold uppercase px-1.5 py-0.5 rounded border flex items-center gap-0.5', trendColor(sectorTrend))}>
        {trendIcon(sectorTrend)}
        {sectorTrend}
      </span>
      <span className={cn('text-[9px] font-mono font-bold', avgChange >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
        {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
      </span>
    </div>
  );
}

export function MarketHeatmap({ nifty, banknifty, sensex, stocks, marketContext }: {
  nifty: HeatmapItem | null;
  banknifty: HeatmapItem | null;
  sensex: HeatmapItem | null;
  stocks: HeatmapItem[];
  marketContext?: MarketContext | null;
}) {
  const stockMap = new Map<string, HeatmapItem>();
  for (const s of stocks) {
    if (s.symbol) stockMap.set(s.symbol, s);
  }

  return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Market Heatmap</h3>
          <p className="mt-1 text-[10px] text-slate-500">Sector performance with trend</p>
        </div>
        <div className="flex items-center gap-3 text-[9px] uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500/50" /> Gain</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500/50" /> Loss</span>
        </div>
      </div>

      {/* Market Context Bar */}
      {marketContext && (
        <div className="flex flex-wrap gap-2 items-center mb-4 p-2.5 rounded-lg border border-[#27272a] bg-[#0d0d11] text-[9px]">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-blue-500" />
            <span className="text-slate-500 uppercase tracking-wider">Market</span>
            <span className={cn('font-bold uppercase px-1.5 py-0.5 rounded border flex items-center gap-0.5', trendColor(marketContext.trend))}>
              {trendIcon(marketContext.trend)}
              {marketContext.trend}
            </span>
          </div>
          <div className="w-px h-3 bg-[#27272a]" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider">Breadth</span>
            <span className={cn('font-bold uppercase px-1.5 py-0.5 rounded border flex items-center gap-0.5', trendColor(marketContext.breadth))}>
              {trendIcon(marketContext.breadth)}
              {marketContext.breadth}
            </span>
          </div>
          <div className="w-px h-3 bg-[#27272a]" />
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-slate-500 uppercase tracking-wider">VIX</span>
            <span className={cn('font-bold uppercase px-1.5 py-0.5 rounded border flex items-center gap-0.5', vixColor(marketContext.vixLevel))}>
              {marketContext.vixLevel}
            </span>
          </div>
          <div className="w-px h-3 bg-[#27272a]" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider">A/D</span>
            <span className={cn('font-mono font-bold', marketContext.advanceDeclineRatio >= 1 ? 'text-emerald-400' : 'text-rose-400')}>
              {marketContext.advanceDeclineRatio.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Index Tiles */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <IndexTile title="NIFTY 50" item={nifty} trend={marketContext?.niftyTrend} />
        <IndexTile title="SENSEX" item={sensex} trend={marketContext?.sensexTrend} />
        <IndexTile title="BANKNIFTY" item={banknifty} trend={marketContext?.bankniftyTrend} />
      </div>

      {/* Sector Groups */}
      <div className="space-y-3">
        {SECTORS.map(sector => {
          const sectorStocks = sector.stocks.map(s => stockMap.get(s) || null).filter(Boolean) as HeatmapItem[];
          if (sectorStocks.length === 0) return null;
          return (
            <div key={sector.name}>
              <SectorSummary name={sector.name} stocks={sectorStocks} />
              <div className="grid grid-cols-3 gap-2">
                {sectorStocks.map(stock => (
                  <StockTile key={stock.symbol} item={stock} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
