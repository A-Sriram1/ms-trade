import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { OptionsAnalytics } from '../types';

export function OptionsChain() {
    const { marketData } = useStore();
    const [symbol, setSymbol] = useState('NIFTY');
    const [analytics, setAnalytics] = useState<OptionsAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const liveSpot = symbol === 'NIFTY' ? marketData.nifty?.ltp : symbol === 'BANKNIFTY' ? marketData.banknifty?.ltp : marketData.sensex?.ltp;
    const maxPain = analytics?.maxPain || (liveSpot ? (Math.round(liveSpot / (symbol === 'NIFTY' ? 50 : 100)) * (symbol === 'NIFTY' ? 50 : 100)) : 0);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/options/${symbol}`)
            .then(async (res) => {
                const payload = await res.json();
                if (!res.ok) {
                    throw new Error(payload.error || 'Failed to load options data.');
                }
                return payload as OptionsAnalytics;
            })
            .then((payload) => {
                setAnalytics(payload);
                setLoading(false);
            })
            .catch((err: Error) => {
                setAnalytics(null);
                setError(err.message || 'Failed to load options data.');
                setLoading(false);
            });
    }, [symbol]);

    return (
        <div className="space-y-4 flex flex-col h-full">
            <header className="flex justify-between items-end pb-3 border-b border-[#27272a]">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight uppercase">Options Chain</h1>
                        <div className="flex gap-3 text-[10px] font-mono mt-1">
                            <span className="text-slate-500">Live Spot: <span className="text-blue-400">{liveSpot?.toFixed(2) || '---'}</span></span>
                            <span className="text-slate-500">Max Pain: <span className="text-white">{maxPain || '---'}</span></span>
                        </div>
                    </div>
                </div>
                <div className="flex bg-[#18181b] rounded border border-[#27272a] p-1">
                    {['NIFTY', 'BANKNIFTY'].map(sym => (
                        <button 
                            key={sym}
                            onClick={() => setSymbol(sym)}
                            className={`px-4 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                symbol === sym ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            </header>

            {analytics?.dataSource && (
                <div className="rounded border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[11px] text-amber-200">
                    {analytics.dataSource.banner}
                </div>
            )}

            {error && (
                <div className="rounded border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] text-rose-300">
                    {error}
                </div>
            )}

            <div className="bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden flex-1">
                <div className="overflow-x-auto h-full">
                    <table className="w-full text-[11px] font-mono text-right border-collapse">
                        <thead className="bg-[#09090b] text-slate-500 uppercase text-[9px] sticky top-0 z-10 shadow-sm border-b border-[#27272a]">
                            <tr>
                                <th colSpan={4} className="border-b border-t border-l border-[#27272a] p-2 text-center text-emerald-400">CALLS</th>
                                <th className="border border-[#27272a] p-2 text-center text-white bg-[#18181b]">STRIKE</th>
                                <th colSpan={4} className="border-b border-t border-r border-[#27272a] p-2 text-center text-rose-400">PUTS</th>
                            </tr>
                            <tr>
                                <th className="p-2 border-b border-[#27272a] font-normal">OI (L)</th>
                                <th className="p-2 border-b border-[#27272a] font-normal">Vol</th>
                                <th className="p-2 border-b border-[#27272a] font-normal">Chng %</th>
                                <th className="p-2 border-b border-[#27272a] font-bold text-emerald-400 bg-emerald-500/5">LTP</th>
                                <th className="p-2 border border-[#27272a] text-center font-bold text-white bg-[#18181b]">PRICE</th>
                                <th className="p-2 border-b border-[#27272a] font-bold text-rose-400 bg-rose-500/5">LTP</th>
                                <th className="p-2 border-b border-[#27272a] font-normal">Chng %</th>
                                <th className="p-2 border-b border-[#27272a] font-normal">Vol</th>
                                <th className="p-2 border-b border-[#27272a] font-normal">OI (L)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]/50 text-slate-300">
                            {loading ? (
                                <tr><td colSpan={9} className="p-8 text-center text-slate-500">Loading options data...</td></tr>
                            ) : !analytics || analytics.rows.length === 0 ? (
                                <tr><td colSpan={9} className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
                                    <div className="text-sm">No options rows available</div>
                                    <div className="text-xs mt-1">The options service did not return any strikes for this symbol.</div>
                                </td></tr>
                            ) : analytics.rows.map((row, i) => (
                                <tr key={i} className="hover:bg-[#18181b]">
                                    <td className="p-2 text-slate-400">{(row.ceOi/100000).toFixed(1)}</td>
                                    <td className="p-2 text-slate-400">{(row.ceVolume/100000).toFixed(1)}</td>
                                    <td className={`p-2 ${(row.ceOiChange > 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {row.ceOiChange > 0 ? '+' : ''}{(row.ceOiChange/10000).toFixed(1)}%
                                    </td>
                                    <td className="p-2 font-bold text-emerald-400 bg-emerald-500/5">{row.ceLtp.toFixed(1)}</td>
                                    <td className="p-2 text-center font-bold text-white bg-[#18181b]/50 border-x border-[#27272a]">{row.strike}</td>
                                    <td className="p-2 font-bold text-rose-400 bg-rose-500/5">{row.peLtp.toFixed(1)}</td>
                                    <td className={`p-2 ${(row.peOiChange > 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {row.peOiChange > 0 ? '+' : ''}{(row.peOiChange/10000).toFixed(1)}%
                                    </td>
                                    <td className="p-2 text-slate-400">{(row.peVolume/100000).toFixed(1)}</td>
                                    <td className="p-2 text-slate-400">{(row.peOi/100000).toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
