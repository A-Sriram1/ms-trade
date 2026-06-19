import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { Search, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { TradingViewAdvancedChart } from './TradingViewAdvancedChart';
import {
    normalizeTradingViewLookupSymbol,
    resolveTradingViewSymbol,
    SUPPORTED_TRADINGVIEW_SYMBOLS,
} from '../lib/tradingview';

type ExplorerInterval = '1m' | '5m' | '15m' | '1D' | '1W' | 'ALL';

function getInstrumentForSymbol(symbol: string, marketData: ReturnType<typeof useStore.getState>['marketData']) {
    const normalized = normalizeTradingViewLookupSymbol(symbol);

    if (normalized === 'NIFTY' || normalized === 'NIFTY50' || normalized === 'NIFTY 50') {
        return marketData.nifty ? { ...marketData.nifty, symbol: 'NIFTY' } : null;
    }

    if (normalized === 'BANKNIFTY' || normalized === 'BANK NIFTY') {
        return marketData.banknifty ? { ...marketData.banknifty, symbol: 'BANKNIFTY' } : null;
    }

    if (normalized === 'SENSEX') {
        return marketData.sensex ? { ...marketData.sensex, symbol: 'SENSEX' } : null;
    }

    return marketData.stocks.find((stock) => normalizeTradingViewLookupSymbol(stock.symbol || '') === normalized) || null;
}

export function StockExplorer() {
    const { marketData } = useStore();
    const [searchSymbol, setSearchSymbol] = useState('RELIANCE');
    const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
    const [selectedInterval, setSelectedInterval] = useState<ExplorerInterval>('15m');

    useEffect(() => {
        const normalized = normalizeTradingViewLookupSymbol(searchSymbol);

        if (!normalized) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setSelectedSymbol(normalized);
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [searchSymbol]);

    const symbolResolution = useMemo(() => resolveTradingViewSymbol(selectedSymbol), [selectedSymbol]);

    const liveStock = useMemo(
        () => getInstrumentForSymbol(symbolResolution.normalizedSymbol || selectedSymbol, marketData),
        [marketData, selectedSymbol, symbolResolution.normalizedSymbol]
    );

    const displaySymbol = liveStock?.symbol || symbolResolution.normalizedSymbol || selectedSymbol || 'RELIANCE';

    return (
        <div className="space-y-4 flex flex-col h-full">
            <header className="flex justify-between items-end pb-3 border-b border-[#27272a]">
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight uppercase">Stock Explorer</h1>
                    <p className="text-blue-500 text-[11px] font-mono mt-1">Deep technical analysis</p>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2 text-slate-500" />
                    <input 
                        list="supported-symbols"
                        value={searchSymbol}
                        onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                        className="bg-[#18181b] border border-[#27272a] text-[#e4e4e7] pl-9 pr-4 py-1.5 rounded text-[11px] w-64 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <datalist id="supported-symbols">
                        {SUPPORTED_TRADINGVIEW_SYMBOLS.map((symbol) => (
                            <option key={symbol} value={symbol} />
                        ))}
                    </datalist>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
                <div className="lg:col-span-3 bg-[#111114] border border-[#27272a] rounded-xl p-4 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{displaySymbol} (NSE)</h2>
                            <p className="text-slate-500 text-[10px] mt-1 uppercase">Live Yahoo Finance Data</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-mono font-bold text-emerald-400 underline decoration-dotted underline-offset-4">
                                {typeof liveStock?.ltp === 'number' ? liveStock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 'Loading...'}
                            </h3>
                            <p className={cn("font-bold text-[10px] mt-1", (liveStock?.change || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                {liveStock?.change && liveStock?.change > 0 ? '+' : ''}
                                {liveStock?.change?.toFixed(2) || '0'} ({liveStock?.change_pct?.toFixed(2) || '0'}%)
                            </p>
                        </div>
                    </div>

                    {!symbolResolution.isSupported && (
                        <div className="mb-4 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                            {symbolResolution.errorMessage}
                        </div>
                    )}
                    
                    <div className="flex-1 min-h-[300px]">
                        <TradingViewAdvancedChart symbol={selectedSymbol} interval={selectedInterval} />
                    </div>

                    <div className="flex gap-1 mt-4">
                        {['1m', '5m', '15m', '1D', '1W', 'ALL'].map(tf => (
                            <button
                                key={tf}
                                type="button"
                                onClick={() => setSelectedInterval(tf as ExplorerInterval)}
                                className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${tf === selectedInterval ? 'bg-blue-600/20 text-blue-400' : 'bg-[#18181b] text-slate-400'}`}
                            >
                                {tf}
                            </button>
                        ))}
                        <div className="ml-auto flex gap-2">
                            <span className="px-2 py-1 text-[10px] font-bold bg-[#18181b] text-indigo-400 rounded border border-[#27272a]">EMA</span>
                            <span className="px-2 py-1 text-[10px] font-bold bg-[#18181b] text-sky-400 rounded border border-[#27272a]">RSI</span>
                            <span className="px-2 py-1 text-[10px] font-bold bg-[#18181b] text-rose-400 rounded border border-[#27272a]">MACD</span>
                            <span className="px-2 py-1 text-[10px] font-bold bg-[#18181b] text-amber-500 rounded border border-[#27272a]">VWAP</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                     <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4">
                        <h3 className="text-[11px] text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <Info className="w-3 h-3 text-blue-500" />
                            Key Statistics
                        </h3>
                        <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between items-center py-1 border-b border-[#27272a]/50">
                                <span className="text-slate-500 uppercase text-[9px]">Open</span>
                                <span className="text-white font-mono font-bold">{liveStock?.open?.toFixed(2) || '---'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#27272a]/50">
                                <span className="text-slate-500 uppercase text-[9px]">High</span>
                                <span className="text-white font-mono font-bold">{liveStock?.high?.toFixed(2) || '---'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#27272a]/50">
                                <span className="text-slate-500 uppercase text-[9px]">Low</span>
                                <span className="text-white font-mono font-bold">{liveStock?.low?.toFixed(2) || '---'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#27272a]/50">
                                <span className="text-slate-500 uppercase text-[9px]">Vol</span>
                                <span className="text-white font-mono font-bold">{(liveStock?.volume || 0).toLocaleString()}</span>
                            </div>
                        </div>
                     </div>

                     <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                           <h3 className="text-white font-bold text-[11px] uppercase tracking-wider">Quant Signal</h3>
                        </div>
                        <div className="flex items-center justify-center py-4">
                            <div className="relative w-24 h-24 rounded-full border-4 border-[#27272a] flex items-center justify-center">
                                <div 
                                   className={cn(
                                       "absolute inset-[-4px] rounded-full border-4 border-t-transparent border-r-transparent animate-[spin_2s_linear_infinite]",
                                       (liveStock?.change || 0) >= 0 ? "border-emerald-500" : "border-rose-500"
                                   )}
                                   style={{ transform: 'rotate(-45deg)'}}>
                                </div>
                                <div className="text-center">
                                    <div className={cn("font-bold text-xs", (liveStock?.change || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                        {Math.abs(liveStock?.change_pct || 0) > 1 ? 'STRONG' : 'MILD'}
                                    </div>
                                    <div className={cn("font-bold text-xs", (liveStock?.change || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                        {(liveStock?.change || 0) >= 0 ? 'BUY' : 'SELL'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-[9px] text-center text-slate-500 uppercase mt-2">Driven by real-time change %.</p>
                     </div>
                </div>
            </div>
        </div>
    );
}
