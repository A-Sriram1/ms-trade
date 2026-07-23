import React from 'react';
import { useStore } from '../store';
import { TrendingUp, TrendingDown, Globe, Activity, BarChart3, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

function MiniCard({ label, value, change, changePct }: { label: string; value: string; change?: number; changePct?: number }) {
  const isUp = (change ?? 0) >= 0;
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium whitespace-nowrap">{label}</span>
      <span className="text-[11px] font-mono font-bold text-white">{value}</span>
      {changePct !== undefined && (
        <span className={cn('text-[9px] font-mono font-bold flex items-center gap-0.5', isUp ? 'text-emerald-400' : 'text-rose-400')}>
          {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {isUp ? '+' : ''}{changePct.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function SentimentBadge({ trend }: { trend: string }) {
  const style = trend === 'BULLISH'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : trend === 'BEARISH'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', style)}>
      {trend === 'BULLISH' ? <TrendingUp className="w-2.5 h-2.5" /> : trend === 'BEARISH' ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
      {trend}
    </span>
  );
}

export function TopDashboardBar() {
  const { marketData } = useStore();
  const ctx = marketData.marketContext;
  const gm = marketData.globalMarkets;

  const sentiment = ctx?.trend || 'NEUTRAL';

  return (
    <div className="glass-strong rounded-xl border border-white/5 overflow-hidden animate-fade-in">
      <div className="flex items-center overflow-x-auto">
        {/* Market Sentiment */}
        <div className="flex items-center gap-2 px-4 py-2 border-r border-white/5 bg-blue-500/5">
          <Activity className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold whitespace-nowrap">Sentiment</span>
          <SentimentBadge trend={sentiment} />
        </div>

        {/* Index Trends */}
        {ctx && (
          <div className="flex items-center gap-1 px-2 py-2 border-r border-white/5">
            {[
              { label: 'NIFTY', trend: ctx.niftyTrend },
              { label: 'BANKNIFTY', trend: ctx.bankniftyTrend },
              { label: 'SENSEX', trend: ctx.sensexTrend },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 px-2">
                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-medium">{item.label}</span>
                <SentimentBadge trend={item.trend} />
              </div>
            ))}
          </div>
        )}

        {/* India VIX + Breadth */}
        <div className="flex items-center gap-1 px-2 py-2 border-r border-white/5">
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[8px] uppercase tracking-wider text-slate-500 font-medium">VIX</span>
            <span className="text-[10px] font-mono font-bold text-white">{marketData.vix?.ltp?.toFixed(2) || '—'}</span>
            {ctx && (
              <span className={cn('text-[8px] font-bold uppercase',
                ctx.vixLevel === 'LOW' ? 'text-emerald-400' :
                ctx.vixLevel === 'MEDIUM' ? 'text-amber-400' :
                ctx.vixLevel === 'HIGH' ? 'text-orange-400' : 'text-rose-400'
              )}>{ctx.vixLevel}</span>
            )}
          </div>
          {ctx && (
            <>
              <div className="w-px h-3 bg-white/5" />
              <div className="flex items-center gap-1.5 px-2">
                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-medium">Breadth</span>
                <SentimentBadge trend={ctx.breadth} />
              </div>
            </>
          )}
        </div>

        {/* FII/DII */}
        <div className="flex items-center gap-1 px-2 py-2 border-r border-white/5">
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[8px] uppercase tracking-wider text-slate-500 font-medium">FII</span>
            <span className="text-[9px] font-mono font-bold text-slate-300">—</span>
          </div>
          <div className="w-px h-3 bg-white/5" />
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[8px] uppercase tracking-wider text-slate-500 font-medium">DII</span>
            <span className="text-[9px] font-mono font-bold text-slate-300">—</span>
          </div>
        </div>

        {/* Global Markets */}
        <div className="flex items-center gap-1 px-2 py-2">
          <Globe className="w-3 h-3 text-slate-500 shrink-0 mx-1" />
          <MiniCard label="DXY" value={gm?.dollarIndex?.value?.toFixed(2) || '—'} changePct={gm?.dollarIndex?.changePct} />
          <div className="w-px h-3 bg-white/5" />
          <MiniCard label="CRUDE" value={gm?.crudeOil?.value?.toFixed(2) || '—'} changePct={gm?.crudeOil?.changePct} />
          <div className="w-px h-3 bg-white/5" />
          <MiniCard label="GOLD" value={gm?.gold?.value?.toFixed(2) || '—'} changePct={gm?.gold?.changePct} />
          <div className="w-px h-3 bg-white/5" />
          <MiniCard label="USD/INR" value={gm?.usdInr?.value?.toFixed(2) || '—'} changePct={gm?.usdInr?.changePct} />
        </div>
      </div>
    </div>
  );
}
