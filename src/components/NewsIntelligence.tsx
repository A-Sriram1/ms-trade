import React from 'react';
import { Brain, Newspaper, RefreshCw, Signal, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import type { NewsArticle, NewsCategory } from '../types';

function sentimentTone(sentiment: NewsArticle['sentiment']) {
  if (sentiment === 'BULLISH') {
    return {
      badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
      icon: TrendingUp,
    };
  }

  if (sentiment === 'BEARISH') {
    return {
      badge: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
      icon: TrendingDown,
    };
  }

  return {
    badge: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    icon: Signal,
  };
}

function categoryTitle(category: NewsCategory) {
  if (category === 'MARKET') return 'Market News Feed';
  if (category === 'COMPANY') return 'Company News';
  return 'Sector News';
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#111114] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  const tone = sentimentTone(article.sentiment);
  const Icon = tone.icon;

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-[#27272a] bg-[#111114] p-4 transition-colors hover:bg-[#18181b]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{article.entity}</div>
          <h3 className="mt-2 text-sm font-semibold leading-5 text-white">{article.headline}</h3>
        </div>
        <div className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}>
          <Icon className="h-3.5 w-3.5" />
          {article.sentiment}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Sentiment Score</div>
          <div className="mt-1 text-[11px] font-bold text-white">{article.sentimentScore}</div>
        </div>
        <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Impact Score</div>
          <div className="mt-1 text-[11px] font-bold text-white">{article.impactScore}</div>
        </div>
        <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Source</div>
          <div className="mt-1 text-[11px] font-bold text-white">{article.source}</div>
        </div>
        <div className="rounded border border-[#27272a] bg-[#09090b] p-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Published</div>
          <div className="mt-1 text-[11px] font-bold text-white">{article.timestamp}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-blue-500/10 bg-blue-500/5 p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-400">
          <Brain className="h-3.5 w-3.5" />
          AI Summary
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-300">{article.aiSummary}</p>
      </div>
    </a>
  );
}

function NewsSection({ title, articles }: { title: string; articles: NewsArticle[] }) {
  return (
    <section className="rounded-2xl border border-[#27272a] bg-[#111114] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
          <p className="mt-1 text-[11px] text-slate-500">Gemini sentiment, impact scoring, and AI summaries</p>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{articles.length} stories</div>
      </div>

      <div className="space-y-3">
        {articles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#27272a] bg-[#09090b] px-4 py-8 text-center text-xs text-slate-500">
            Waiting for live news intelligence...
          </div>
        ) : (
          articles.map((article) => <NewsCard key={article.id} article={article} />)
        )}
      </div>
    </section>
  );
}

export function NewsIntelligence() {
  const { marketData } = useStore();
  const totalStories = marketData.news.market.length + marketData.news.company.length + marketData.news.sector.length;
  const allArticles = [...marketData.news.market, ...marketData.news.company, ...marketData.news.sector];
  const avgSentiment = allArticles.length > 0
    ? Math.round(allArticles.reduce((sum, article) => sum + article.sentimentScore, 0) / allArticles.length)
    : 0;
  const avgImpact = allArticles.length > 0
    ? Math.round(allArticles.reduce((sum, article) => sum + article.impactScore, 0) / allArticles.length)
    : 0;

  return (
    <div className="flex h-full flex-col space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#27272a] pb-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-white">News Intelligence</h1>
          <p className="mt-1 text-[11px] font-mono text-blue-500">Market, company, and sector news analyzed with Gemini</p>
        </div>
        <div className="flex items-center gap-2 rounded border border-[#27272a] bg-[#111114] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
          {marketData.news.updatedAt ? `Updated ${marketData.news.updatedAt} IST` : 'Refreshing every minute'}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Stories Tracked" value={`${totalStories}`} hint="Across market, company, and sector feeds" />
        <SummaryCard label="Avg Sentiment Score" value={`${avgSentiment}`} hint="Higher values indicate stronger bullish tone" />
        <SummaryCard label="Avg Impact Score" value={`${avgImpact}`} hint={`Feed refresh cycle ${marketData.news.refreshIntervalSeconds}s`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <NewsSection title={categoryTitle('MARKET')} articles={marketData.news.market} />
        <NewsSection title={categoryTitle('COMPANY')} articles={marketData.news.company} />
        <NewsSection title={categoryTitle('SECTOR')} articles={marketData.news.sector} />
      </div>
    </div>
  );
}
