import { create } from 'zustand';
import type { NewsIntelligence, Signal, MarketContext } from './types';

export type AppTab =
  | 'dashboard'
  | 'signals'
  | 'explorer'
  | 'options'
  | 'watchlist'
  | 'news'
  | 'assistant'
  | 'settings';

export type SignalSubTab =
  | 'stock-signals'
  | 'stock-options'
  | 'nifty-options'
  | 'banknifty-options'
  | 'sensex-options'
  | 'finnifty-options';

export type SignalFilter = 'ALL' | 'STRONG BUY' | 'BUY' | 'WAIT' | 'SELL' | 'STRONG SELL';

export type TimeframeFilter = 'ALL' | 'SCALPING' | 'INTRADAY' | 'SWING';

export type ExpiryFilter = 'ALL' | 'TODAY' | 'WEEKLY' | 'MONTHLY';

interface MarketItem {
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  change_pct: number;
  volume?: number;
  symbol?: string;
}

interface StoreState {
  marketData: {
    nifty: MarketItem | null;
    banknifty: MarketItem | null;
    sensex: MarketItem | null;
    finnifty: MarketItem | null;
    vix: MarketItem | null;
    stocks: Array<MarketItem & { symbol: string }>;
    signals: Signal[];
    signalUpdatedAt: string | null;
    signalRefreshIntervalSeconds: number;
    news: NewsIntelligence;
    status: 'OPEN' | 'CLOSED' | 'LOADING';
    serverTime: string | null;
    marketContext: MarketContext | null;
    error: string | null;
    globalMarkets?: {
      dollarIndex: { value: number; change: number; changePct: number } | null;
      crudeOil: { value: number; change: number; changePct: number } | null;
      gold: { value: number; change: number; changePct: number } | null;
      usdInr: { value: number; change: number; changePct: number } | null;
    };
    health?: {
      apiConnected: boolean;
      wsConnected: boolean;
      lastTickTime: string | null;
      redisConnected: boolean;
      errorMessage: string | null;
    };
  };
  setMarketData: (data: any) => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  signalSubTab: SignalSubTab;
  setSignalSubTab: (tab: SignalSubTab) => void;
  signalFilter: SignalFilter;
  setSignalFilter: (filter: SignalFilter) => void;
  timeframeFilter: TimeframeFilter;
  setTimeframeFilter: (filter: TimeframeFilter) => void;
  expiryFilter: ExpiryFilter;
  setExpiryFilter: (filter: ExpiryFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  positionCalc: { capital: number; riskPercent: number };
  setPositionCalc: (calc: { capital: number; riskPercent: number }) => void;
}

export const useStore = create<StoreState>((set) => ({
  marketData: {
    nifty: null,
    banknifty: null,
    sensex: null,
    finnifty: null,
    vix: null,
    stocks: [],
    signals: [],
    signalUpdatedAt: null,
    signalRefreshIntervalSeconds: 60,
    news: {
      market: [], company: [], sector: [],
      updatedAt: null, refreshIntervalSeconds: 60,
    },
    status: 'LOADING',
    serverTime: null,
    marketContext: null,
    error: null,
  },
  setMarketData: (data) => set({ marketData: data }),
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  signalSubTab: 'stock-signals',
  setSignalSubTab: (tab) => set({ signalSubTab: tab }),
  signalFilter: 'ALL',
  setSignalFilter: (filter) => set({ signalFilter: filter }),
  timeframeFilter: 'ALL',
  setTimeframeFilter: (filter) => set({ timeframeFilter: filter }),
  expiryFilter: 'ALL',
  setExpiryFilter: (filter) => set({ expiryFilter: filter }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  positionCalc: { capital: 100000, riskPercent: 1 },
  setPositionCalc: (calc) => set({ positionCalc: calc }),
}));
