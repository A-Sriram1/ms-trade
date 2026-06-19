import { create } from 'zustand';
import type { NewsIntelligence, Signal } from './types';

export type AppTab = 'dashboard' | 'explorer' | 'watchlists' | 'options' | 'options-dashboard' | 'news-intelligence' | 'assistant' | 'health';

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
        vix: MarketItem | null;
        stocks: Array<MarketItem>;
        signals: Signal[];
        signalUpdatedAt: string | null;
        signalRefreshIntervalSeconds: number;
        news: NewsIntelligence;
        status: 'OPEN' | 'CLOSED' | 'LOADING';
        serverTime: string | null;
        error: string | null;
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
}

export const useStore = create<StoreState>((set) => ({
    marketData: {
        nifty: null,
        banknifty: null,
        sensex: null,
        vix: null,
        stocks: [],
        signals: [],
        signalUpdatedAt: null,
        signalRefreshIntervalSeconds: 60,
        news: {
            market: [],
            company: [],
            sector: [],
            updatedAt: null,
            refreshIntervalSeconds: 60
        },
        status: 'LOADING',
        serverTime: null,
        error: null
    },
    setMarketData: (data) => set({ marketData: data }),
    activeTab: 'dashboard',
    setActiveTab: (tab) => set({ activeTab: tab })
}));
