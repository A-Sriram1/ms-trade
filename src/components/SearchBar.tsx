import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Zap, BarChart2, Hash, Clock } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

const FNO_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'ICICIBANK', 'AXISBANK',
  'TATASTEEL', 'ITC', 'LT', 'BAJFINANCE', 'BHARTIARTL', 'KOTAKBANK',
  'ASIANPAINT', 'HCLTECH', 'WIPRO', 'MARUTI', 'TITAN', 'SUNPHARMA',
  'ULTRACEMCO', 'ONGC', 'TATAMOTORS', 'POWERGRID', 'NTPC', 'ADANIENT',
];

const INDICES = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY'];

export function SearchBar() {
  const { searchQuery, setSearchQuery, marketData, setActiveTab, setSignalSubTab } = useStore();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setFocused(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toUpperCase();
    const stockHits = marketData.stocks
      .filter(s => s.symbol?.toUpperCase().includes(q))
      .slice(0, 5)
      .map(s => ({ type: 'stock' as const, symbol: s.symbol!, label: s.symbol! }));
    const fnoHits = FNO_STOCKS
      .filter(s => s.includes(q) && !stockHits.find(h => h.symbol === s))
      .slice(0, 3)
      .map(s => ({ type: 'fno' as const, symbol: s, label: s }));
    const indexHits = INDICES
      .filter(s => s.includes(q))
      .map(s => ({ type: 'index' as const, symbol: s, label: s }));
    return [...indexHits, ...stockHits, ...fnoHits];
  }, [searchQuery, marketData.stocks]);

  const handleSelect = (result: typeof results[0]) => {
    setSearchQuery('');
    setFocused(false);
    if (result.type === 'index') {
      if (result.symbol === 'NIFTY') { setActiveTab('signals'); setSignalSubTab('nifty-options'); }
      else if (result.symbol === 'BANKNIFTY') { setActiveTab('signals'); setSignalSubTab('banknifty-options'); }
      else if (result.symbol === 'SENSEX') { setActiveTab('signals'); setSignalSubTab('sensex-options'); }
      else if (result.symbol === 'FINNIFTY') { setActiveTab('signals'); setSignalSubTab('finnifty-options'); }
    } else if (result.type === 'fno') {
      setActiveTab('signals');
      setSignalSubTab('stock-options');
    } else {
      setActiveTab('explorer');
    }
  };

  const typeIcon = (type: string) => {
    if (type === 'index') return <BarChart2 className="w-3 h-3 text-blue-400" />;
    if (type === 'fno') return <Zap className="w-3 h-3 text-purple-400" />;
    return <Hash className="w-3 h-3 text-emerald-400" />;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200',
        focused
          ? 'border-blue-500/40 bg-[#111114] shadow-lg shadow-blue-500/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10'
      )}>
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search stocks, options, strikes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          className="flex-1 bg-transparent text-[11px] text-white placeholder-slate-500 outline-none font-medium"
        />
        {searchQuery ? (
          <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] font-mono text-slate-500">
            ⌘K
          </kbd>
        )}
      </div>

      {focused && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-white/10 bg-[#111114] shadow-2xl shadow-black/50 overflow-hidden z-50 animate-scale-in">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.symbol}`}
              onClick={() => handleSelect(r)}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
            >
              {typeIcon(r.type)}
              <span className="text-[11px] font-bold text-white font-mono">{r.label}</span>
              <span className="text-[8px] uppercase tracking-wider text-slate-500 ml-auto">{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
