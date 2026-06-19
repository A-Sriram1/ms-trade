export type Stock = {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  sector: string;
  marketCap: string;
};

export type OptionContract = {
  strike: number;
  callOi: number;
  callOiChange: number;
  callVolume: number;
  callLtp: number;
  putLtp: number;
  putVolume: number;
  putOiChange: number;
  putOi: number;
};

export type OptionsAnalyticsRow = {
  strike: number;
  ceOi: number;
  peOi: number;
  ceOiChange: number;
  peOiChange: number;
  ceVolume: number;
  peVolume: number;
  ceLtp: number;
  peLtp: number;
  ceIv: number;
  peIv: number;
  pcr: number;
  totalOi: number;
  heat: number;
};

export type OptionsDataSourceStatus = {
  provider: string;
  mode: 'mock';
  supportsLiveIndianIndexOptions: false;
  banner: string;
};

export type OptionsStrikeLevel = {
  strike: number;
  oi: number;
};

export type OptionsAnalytics = {
  symbol: 'NIFTY' | 'BANKNIFTY';
  spot: number;
  atmStrike: number;
  strikeStep: number;
  updatedAt: string;
  refreshIntervalSeconds: number;
  pcr: number;
  maxPain: number;
  totalCeOi: number;
  totalPeOi: number;
  highestCallOiStrikes: OptionsStrikeLevel[];
  highestPutOiStrikes: OptionsStrikeLevel[];
  dataSource: OptionsDataSourceStatus;
  rows: OptionsAnalyticsRow[];
};

export type Signal = {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  explanation: string;
  reason: string[];
  timestamp: string;
  timeframe: '1m';
  indicators: {
    ema9: number;
    ema21: number;
    ema50: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    vwap: number;
  };
};

export type NewsCategory = 'MARKET' | 'COMPANY' | 'SECTOR';

export type NewsArticle = {
  id: string;
  category: NewsCategory;
  entity: string;
  headline: string;
  link: string;
  source: string;
  timestamp: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  impactScore: number;
  aiSummary: string;
};

export type NewsIntelligence = {
  market: NewsArticle[];
  company: NewsArticle[];
  sector: NewsArticle[];
  updatedAt: string | null;
  refreshIntervalSeconds: number;
};

export type IndexData = {
  name: string;
  value: number;
  change: number;
  changePercent: number;
};
