import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Plus, Star, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { normalizeTradingViewLookupSymbol } from '../lib/tradingview';
import type { Signal } from '../types';

const WATCHLIST_STORAGE_KEY = 'trademind-watchlists-v1';
const DEFAULT_WATCHLIST_ID = 'default-watchlist';

type Watchlist = {
  id: string;
  name: string;
  symbols: string[];
  createdAt: string;
};

type WatchlistAlertType = 'EMA_CROSSOVER' | 'RSI_OVERBOUGHT' | 'RSI_OVERSOLD' | 'VOLUME_BREAKOUT' | 'PRICE_BREAKOUT';
type WatchlistAlertTone = 'bullish' | 'bearish' | 'neutral';

type WatchlistAlert = {
  id: string;
  watchlistId: string;
  watchlistName: string;
  symbol: string;
  type: WatchlistAlertType;
  message: string;
  tone: WatchlistAlertTone;
  timestamp: string;
};

type SymbolState = {
  emaRelation: 'above' | 'below' | 'unknown';
  rsiZone: 'overbought' | 'oversold' | 'neutral';
  volumeSamples: number[];
  priceSamples: number[];
};

function createDefaultWatchlist(): Watchlist {
  return {
    id: DEFAULT_WATCHLIST_ID,
    name: 'My Watchlist',
    symbols: [],
    createdAt: new Date().toISOString(),
  };
}

function formatPrice(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '---';
  }

  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toneClass(tone: WatchlistAlertTone) {
  if (tone === 'bullish') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  }

  if (tone === 'bearish') {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-400';
  }

  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function alertTypeLabel(type: WatchlistAlertType) {
  switch (type) {
    case 'EMA_CROSSOVER':
      return 'EMA Crossover';
    case 'RSI_OVERBOUGHT':
      return 'RSI > 70';
    case 'RSI_OVERSOLD':
      return 'RSI < 30';
    case 'VOLUME_BREAKOUT':
      return 'Volume Breakout';
    case 'PRICE_BREAKOUT':
      return 'Price Breakout';
    default:
      return type;
  }
}

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

function getSignalForSymbol(symbol: string, signals: Signal[]) {
  const normalized = normalizeTradingViewLookupSymbol(symbol);
  return signals.find((signal) => normalizeTradingViewLookupSymbol(signal.symbol) === normalized) || null;
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

export function Watchlists() {
  const { marketData } = useStore();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>(DEFAULT_WATCHLIST_ID);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const symbolStateRef = useRef<Record<string, SymbolState>>({});
  const cooldownRef = useRef<Record<string, number>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (!stored) {
        setWatchlists([createDefaultWatchlist()]);
        return;
      }

      const parsed = JSON.parse(stored) as Watchlist[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setWatchlists([createDefaultWatchlist()]);
        return;
      }

      setWatchlists(parsed);
      setSelectedWatchlistId(parsed[0]?.id || DEFAULT_WATCHLIST_ID);
    } catch {
      setWatchlists([createDefaultWatchlist()]);
    }
  }, []);

  useEffect(() => {
    if (watchlists.length === 0) {
      return;
    }

    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlists));
  }, [watchlists]);

  useEffect(() => {
    if (watchlists.length === 0) {
      setSelectedWatchlistId(DEFAULT_WATCHLIST_ID);
      return;
    }

    if (!watchlists.some((watchlist) => watchlist.id === selectedWatchlistId)) {
      setSelectedWatchlistId(watchlists[0].id);
    }
  }, [selectedWatchlistId, watchlists]);

  const availableSymbols = useMemo(() => {
    const allSymbols = new Set<string>();

    if (marketData.nifty) allSymbols.add('NIFTY');
    if (marketData.banknifty) allSymbols.add('BANKNIFTY');
    if (marketData.sensex) allSymbols.add('SENSEX');

    marketData.stocks.forEach((stock) => {
      if (stock.symbol) {
        allSymbols.add(normalizeTradingViewLookupSymbol(stock.symbol));
      }
    });

    marketData.signals.forEach((signal) => {
      allSymbols.add(normalizeTradingViewLookupSymbol(signal.symbol));
    });

    return [...allSymbols].sort();
  }, [marketData.banknifty, marketData.nifty, marketData.sensex, marketData.signals, marketData.stocks]);

  useEffect(() => {
    const watchedSymbols = [...new Set(watchlists.flatMap((watchlist) => watchlist.symbols))];
    if (watchedSymbols.length === 0) {
      return;
    }

    const nowMs = Date.now();
    const timestamp = marketData.serverTime || new Date().toISOString();
    const nextAlerts: WatchlistAlert[] = [];

    watchedSymbols.forEach((symbol) => {
      const normalizedSymbol = normalizeTradingViewLookupSymbol(symbol);
      const liveInstrument = getInstrumentForSymbol(normalizedSymbol, marketData);
      const signal = getSignalForSymbol(normalizedSymbol, marketData.signals);
      const previousState = symbolStateRef.current[normalizedSymbol] || {
        emaRelation: 'unknown',
        rsiZone: 'neutral',
        volumeSamples: [],
        priceSamples: [],
      };

      const nextState: SymbolState = {
        emaRelation: previousState.emaRelation,
        rsiZone: previousState.rsiZone,
        volumeSamples: previousState.volumeSamples,
        priceSamples: previousState.priceSamples,
      };

      const emittedAlerts: Array<Omit<WatchlistAlert, 'id' | 'watchlistId' | 'watchlistName'>> = [];

      if (signal) {
        const emaRelation = signal.indicators.ema9 >= signal.indicators.ema21 ? 'above' : 'below';
        if (
          previousState.emaRelation !== 'unknown' &&
          previousState.emaRelation !== emaRelation
        ) {
          emittedAlerts.push({
            symbol: normalizedSymbol,
            type: 'EMA_CROSSOVER',
            tone: emaRelation === 'above' ? 'bullish' : 'bearish',
            message:
              emaRelation === 'above'
                ? `${normalizedSymbol} triggered a bullish EMA 9/21 crossover.`
                : `${normalizedSymbol} triggered a bearish EMA 9/21 crossover.`,
            timestamp,
          });
        }
        nextState.emaRelation = emaRelation;

        const rsiZone =
          signal.indicators.rsi > 70 ? 'overbought' : signal.indicators.rsi < 30 ? 'oversold' : 'neutral';

        if (previousState.rsiZone !== rsiZone) {
          if (rsiZone === 'overbought') {
            emittedAlerts.push({
              symbol: normalizedSymbol,
              type: 'RSI_OVERBOUGHT',
              tone: 'bearish',
              message: `${normalizedSymbol} RSI moved above 70 and is now overbought.`,
              timestamp,
            });
          }

          if (rsiZone === 'oversold') {
            emittedAlerts.push({
              symbol: normalizedSymbol,
              type: 'RSI_OVERSOLD',
              tone: 'bullish',
              message: `${normalizedSymbol} RSI dropped below 30 and is now oversold.`,
              timestamp,
            });
          }
        }
        nextState.rsiZone = rsiZone;
      }

      if (liveInstrument) {
        const currentVolume = liveInstrument.volume || 0;
        const currentPrice = liveInstrument.ltp || 0;
        const volumeAverage = average(previousState.volumeSamples);
        const historicalHigh = previousState.priceSamples.length > 0 ? Math.max(...previousState.priceSamples) : 0;
        const historicalLow = previousState.priceSamples.length > 0 ? Math.min(...previousState.priceSamples) : 0;

        if (
          previousState.volumeSamples.length >= 3 &&
          currentVolume > 0 &&
          volumeAverage > 0 &&
          currentVolume > volumeAverage * 1.5
        ) {
          const cooldownKey = `${normalizedSymbol}-VOLUME_BREAKOUT`;
          if (!cooldownRef.current[cooldownKey] || nowMs - cooldownRef.current[cooldownKey] > 10 * 60 * 1000) {
            emittedAlerts.push({
              symbol: normalizedSymbol,
              type: 'VOLUME_BREAKOUT',
              tone: 'neutral',
              message: `${normalizedSymbol} volume broke out above its recent local average.`,
              timestamp,
            });
            cooldownRef.current[cooldownKey] = nowMs;
          }
        }

        if (previousState.priceSamples.length >= 3 && currentPrice > 0) {
          const upsideBreakout = historicalHigh > 0 && currentPrice > historicalHigh * 1.004;
          const downsideBreakout = historicalLow > 0 && currentPrice < historicalLow * 0.996;
          const cooldownKey = `${normalizedSymbol}-PRICE_BREAKOUT`;

          if ((upsideBreakout || downsideBreakout) && (!cooldownRef.current[cooldownKey] || nowMs - cooldownRef.current[cooldownKey] > 10 * 60 * 1000)) {
            emittedAlerts.push({
              symbol: normalizedSymbol,
              type: 'PRICE_BREAKOUT',
              tone: upsideBreakout ? 'bullish' : 'bearish',
              message: upsideBreakout
                ? `${normalizedSymbol} price broke above its recent local range.`
                : `${normalizedSymbol} price broke below its recent local range.`,
              timestamp,
            });
            cooldownRef.current[cooldownKey] = nowMs;
          }
        }

        nextState.volumeSamples = [...previousState.volumeSamples, currentVolume].slice(-8);
        nextState.priceSamples = [...previousState.priceSamples, currentPrice].slice(-8);
      }

      symbolStateRef.current[normalizedSymbol] = nextState;

      if (emittedAlerts.length > 0) {
        watchlists
          .filter((watchlist) => watchlist.symbols.includes(normalizedSymbol))
          .forEach((watchlist) => {
            emittedAlerts.forEach((alert) => {
              nextAlerts.push({
                ...alert,
                id: `${watchlist.id}-${alert.symbol}-${alert.type}-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
                watchlistId: watchlist.id,
                watchlistName: watchlist.name,
              });
            });
          });
      }
    });

    if (nextAlerts.length > 0) {
      setAlerts((previous) => [...nextAlerts, ...previous].slice(0, 60));
    }
  }, [marketData, watchlists]);

  const selectedWatchlist = watchlists.find((watchlist) => watchlist.id === selectedWatchlistId) || watchlists[0] || null;
  const watchedSymbolCount = watchlists.reduce((sum, watchlist) => sum + watchlist.symbols.length, 0);

  const createWatchlist = () => {
    const name = newWatchlistName.trim();
    if (!name) {
      return;
    }

    const watchlist: Watchlist = {
      id: `watchlist-${Date.now()}`,
      name,
      symbols: [],
      createdAt: new Date().toISOString(),
    };

    setWatchlists((previous) => [...previous, watchlist]);
    setSelectedWatchlistId(watchlist.id);
    setNewWatchlistName('');
  };

  const addSymbolToWatchlist = () => {
    const normalizedSymbol = normalizeTradingViewLookupSymbol(newSymbol);
    if (!normalizedSymbol || !selectedWatchlist) {
      return;
    }

    if (!availableSymbols.includes(normalizedSymbol)) {
      return;
    }

    setWatchlists((previous) =>
      previous.map((watchlist) =>
        watchlist.id === selectedWatchlist.id
          ? {
              ...watchlist,
              symbols: watchlist.symbols.includes(normalizedSymbol)
                ? watchlist.symbols
                : [...watchlist.symbols, normalizedSymbol],
            }
          : watchlist
      )
    );
    setNewSymbol('');
  };

  const removeSymbolFromWatchlist = (watchlistId: string, symbol: string) => {
    setWatchlists((previous) =>
      previous.map((watchlist) =>
        watchlist.id === watchlistId
          ? { ...watchlist, symbols: watchlist.symbols.filter((item) => item !== symbol) }
          : watchlist
      )
    );
  };

  const removeWatchlist = (watchlistId: string) => {
    setWatchlists((previous) => {
      const remaining = previous.filter((watchlist) => watchlist.id !== watchlistId);
      if (remaining.length > 0) {
        return remaining;
      }

      return [createDefaultWatchlist()];
    });
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#27272a] pb-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-white">Watchlist System</h1>
          <p className="mt-1 text-[11px] font-mono text-blue-500">Local watchlists with live technical alerts</p>
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          Stored locally in your browser. Alerts use live tracked symbols only.
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Watchlists" value={`${watchlists.length}`} hint="Create and manage multiple local watchlists" />
        <SummaryCard label="Tracked Symbols" value={`${watchedSymbolCount}`} hint="Across all watchlists" />
        <SummaryCard label="Recent Alerts" value={`${alerts.length}`} hint="EMA, RSI, volume, and price breakout triggers" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Manage Watchlists</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={newWatchlistName}
              onChange={(event) => setNewWatchlistName(event.target.value)}
              placeholder="Create watchlist name"
              className="rounded border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={createWatchlist}
              className="inline-flex items-center justify-center gap-2 rounded border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto]">
            <select
              value={selectedWatchlist?.id || ''}
              onChange={(event) => setSelectedWatchlistId(event.target.value)}
              className="rounded border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {watchlists.map((watchlist) => (
                <option key={watchlist.id} value={watchlist.id}>
                  {watchlist.name}
                </option>
              ))}
            </select>
            <div>
              <input
                list="watchlist-symbols"
                value={newSymbol}
                onChange={(event) => setNewSymbol(event.target.value.toUpperCase())}
                placeholder="Add tracked stock symbol"
                className="w-full rounded border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
              <datalist id="watchlist-symbols">
                {availableSymbols.map((symbol) => (
                  <option key={symbol} value={symbol} />
                ))}
              </datalist>
            </div>
            <button
              type="button"
              onClick={addSymbolToWatchlist}
              className="inline-flex items-center justify-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Stock
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {watchlists.map((watchlist) => (
              <div key={watchlist.id} className="rounded-xl border border-[#27272a] bg-[#09090b] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">{watchlist.name}</div>
                    <div className="mt-1 text-[10px] font-mono text-slate-500">{watchlist.symbols.length} symbols</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWatchlist(watchlist.id)}
                    className="rounded border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400"
                    aria-label={`Remove ${watchlist.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {watchlist.symbols.length === 0 ? (
                    <div className="rounded border border-dashed border-[#27272a] px-3 py-4 text-center text-xs text-slate-500">
                      Add stocks to start receiving alerts.
                    </div>
                  ) : (
                    watchlist.symbols.map((symbol) => {
                      const liveInstrument = getInstrumentForSymbol(symbol, marketData);
                      const signal = getSignalForSymbol(symbol, marketData.signals);

                      return (
                        <div key={symbol} className="rounded-lg border border-[#27272a] bg-[#111114] px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-bold text-white">{symbol}</div>
                              <div className="mt-1 text-[10px] font-mono text-slate-500">
                                Price {formatPrice(liveInstrument?.ltp)} · Volume {(liveInstrument?.volume || 0).toLocaleString()}
                              </div>
                              <div className="mt-1 text-[10px] font-mono text-slate-500">
                                Signal {signal?.action || 'N/A'} · RSI {signal?.indicators.rsi?.toFixed(2) || 'N/A'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSymbolFromWatchlist(watchlist.id, symbol)}
                              className="rounded border border-[#27272a] bg-[#09090b] p-2 text-slate-400 hover:text-white"
                              aria-label={`Remove ${symbol}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Live Alerts</h2>
          </div>

          <div className="mb-4 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Alerts trigger for EMA crossover, RSI above 70, RSI below 30, volume breakout, and price breakout.
          </div>

          <div className="space-y-3 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#27272a] px-4 py-8 text-center text-xs text-slate-500">
                Waiting for watchlist alerts...
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-[#27272a] bg-[#09090b] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">{alert.symbol}</div>
                      <div className="mt-1 text-[10px] font-mono text-slate-500">{alert.watchlistName} · {alert.timestamp}</div>
                    </div>
                    <div className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${toneClass(alert.tone)}`}>
                      {alertTypeLabel(alert.type)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    <span>{alert.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
