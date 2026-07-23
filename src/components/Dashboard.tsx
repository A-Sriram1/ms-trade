import React from 'react';
import { useStore } from '../store';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Loader2, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { SignalCard } from './SignalCard';
import { MarketHeatmap } from './MarketHeatmap';
import type { NewsArticle } from '../types';

function MarketCard({ title, item, generateChart }: { title: string; item: any; generateChart?: boolean }) {
  if (!item) {
    return (
      <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between h-28 animate-pulse">
        <div className="h-4 bg-[#18181b] w-1/2 rounded" />
        <div className="h-8 bg-[#18181b] w-3/4 rounded mt-4" />
      </div>
    );
  }
  const { ltp, change, change_pct } = item;
  const isPositive = change >= 0;
  const chartData = React.useMemo(() => {
    if (!generateChart) return [];
    return [{ val: ltp - (change || 1) }, { val: ltp }];
  }, [ltp, change, generateChart]);

  return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between overflow-hidden relative group transition-colors">
      <div className="flex justify-between items-start z-10 relative">
        <h3 className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">{title}</h3>
        <span className={cn('text-[10px] font-bold flex items-center gap-1 rounded bg-[#18181b] border border-[#27272a] px-2 py-0.5', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {(change_pct || 0).toFixed(2)}%
        </span>
      </div>
      <div className="mt-4 z-10 relative flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {ltp ? ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '---'}
        </span>
        <span className={cn('font-mono text-[10px]', isPositive ? 'text-emerald-500/70' : 'text-rose-500/70')}>
          {(change || 0) > 0 ? '+' : ''}{(change || 0).toFixed(2)}
        </span>
      </div>
      {generateChart && ltp !== 0 && (
        <div className="absolute inset-0 top-1/2 opacity-20 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Line type="basis" dataKey="val" stroke={isPositive ? '#34d399' : '#fb7185'} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function newsTone(sentiment: NewsArticle['sentiment']) {
  if (sentiment === 'BULLISH') return 'border-emerald-500 text-emerald-400';
  if (sentiment === 'BEARISH') return 'border-rose-500 text-rose-400';
  return 'border-slate-500 text-slate-400';
}

export function Dashboard() {
  const { marketData } = useStore();
  const newsPreview = [
    marketData.news.market[0],
    marketData.news.company[0],
    marketData.news.sector[0],
  ].filter(Boolean) as NewsArticle[];

  // Top signals: prioritise STRONG BUY/SELL, then BUY/SELL
  const topSignals = [...marketData.signals]
    .sort((a, b) => {
      const rank = (s: typeof a) =>
        s.action === 'STRONG BUY' || s.action === 'STRONG SELL' ? 0
          : s.action === 'BUY' || s.action === 'SELL' ? 1 : 2;
      return rank(a) - rank(b) || b.confidence - a.confidence;
    })
    .slice(0, 3);

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Header */}
      <header className="flex justify-between items-end pb-3 border-b border-[#27272a]">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight uppercase">Market Overview</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-blue-500 text-[11px] font-mono">LIVE YAHOO FINANCE DATA</p>
            {marketData.serverTime && (
              <p className="text-slate-500 text-[10px] font-mono border-l border-[#27272a] pl-2">{marketData.serverTime} (IST)</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {marketData.error && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-rose-400 bg-rose-400/10 px-3 py-1.5 rounded border border-rose-400/20 uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3" />
              Feed Error
            </div>
          )}
          {marketData.status === 'LOADING' ? (
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded border border-blue-400/20 uppercase tracking-wider">
              <Loader2 className="w-3 h-3 animate-spin" />
              CONNECTING
            </div>
          ) : marketData.status === 'OPEN' ? (
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded border border-emerald-400/20 uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              MARKET OPEN
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-400/10 px-3 py-1.5 rounded border border-slate-400/20 uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              MARKET CLOSED
            </div>
          )}
        </div>
      </header>

      {marketData.error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{marketData.error} — showing cached or fallback values.</p>
        </div>
      )}

      {/* Index Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MarketCard title="NIFTY 50" item={marketData.nifty} generateChart />
        <MarketCard title="BANKNIFTY" item={marketData.banknifty} generateChart />
        <MarketCard title="SENSEX" item={marketData.sensex} generateChart />
        <MarketCard title="INDIA VIX" item={marketData.vix} />
      </div>

      {/* Market Heatmap */}
      <MarketHeatmap
        nifty={marketData.nifty}
        banknifty={marketData.banknifty}
        sensex={marketData.sensex}
        stocks={marketData.stocks}
        marketContext={marketData.marketContext}
      />

      {/* Signals + News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 mt-2">
        <div className="p-4 bg-[#111114] border border-[#27272a] rounded-xl col-span-2 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Top AI Signals</h3>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {marketData.signalUpdatedAt ? `Updated ${marketData.signalUpdatedAt} IST` : 'Updating every minute'}
            </div>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {topSignals.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-8">Waiting for quant signals...</div>
            ) : topSignals.map(signal => (
              <SignalCard key={`${signal.symbol}-${signal.timestamp}`} signal={signal} />
            ))}
          </div>
        </div>

        <div className="p-4 bg-[#111114] border border-[#27272a] rounded-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">News Intelligence</span>
            <span className="text-[10px] text-blue-400">
              {marketData.news.updatedAt ? `${marketData.news.refreshIntervalSeconds}s refresh` : 'Connecting'}
            </span>
          </div>
          <div className="space-y-3 flex-1 overflow-hidden">
            {newsPreview.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-8">Waiting for news analysis...</div>
            ) : newsPreview.map(article => (
              <div key={article.id} className={`border-l-2 pl-3 ${newsTone(article.sentiment)}`}>
                <p className="text-[11px] text-slate-300">
                  <span className="text-slate-200 font-bold uppercase">{article.category}:</span> {article.headline}
                </p>
                <span className="text-[10px] font-bold mt-1 block">
                  {article.sentiment} · {article.impactScore} IMPACT · {article.sentimentScore} SENTIMENT
                </span>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{article.aiSummary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
