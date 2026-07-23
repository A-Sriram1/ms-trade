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

// ─── Enhanced Signal Types ────────────────────────────────────────────────────

export type SignalAction =
  | 'STRONG BUY'
  | 'BUY'
  | 'WAIT'
  | 'EXIT'
  | 'SELL'
  | 'STRONG SELL';

export type TradeStatus =
  | 'WAITING FOR ENTRY'
  | 'ENTRY TRIGGERED'
  | 'TRADE ACTIVE'
  | 'TARGET 1 HIT'
  | 'TARGET 2 HIT'
  | 'TARGET 3 HIT'
  | 'STOPLOSS HIT'
  | 'TRADE CLOSED';

export type TradeType = 'Intraday Momentum' | 'Intraday Reversal' | 'Scalp' | 'Swing';

export type StopLossMode = 'Conservative' | 'Balanced' | 'Aggressive';

export type ExitReason =
  | 'BOOK PROFIT'
  | 'PARTIAL EXIT'
  | 'TRAIL SL'
  | 'EXIT IMMEDIATELY'
  | 'REVERSAL DETECTED';

export type CandlestickPattern =
  | 'Hammer'
  | 'Shooting Star'
  | 'Doji'
  | 'Morning Star'
  | 'Evening Star'
  | 'Bullish Engulfing'
  | 'Bearish Engulfing'
  | 'Inside Bar'
  | 'Outside Bar'
  | 'None';

export type MultiTimeframeConfirmation = {
  tf1m: SignalAction | 'NEUTRAL';
  tf3m: SignalAction | 'NEUTRAL';
  tf5m: SignalAction | 'NEUTRAL';
  tf15m: SignalAction | 'NEUTRAL';
  tf30m: SignalAction | 'NEUTRAL';
  tf1h: SignalAction | 'NEUTRAL';
  confirmedCount: number;
};

export type AIScorecard = {
  trend: number;       // /10
  momentum: number;    // /10
  volume: number;      // /10
  options: number;     // /10
  news: number;        // /10
  volatility: number;  // /10
  institutional: number; // /10
  breadth: number;     // /10
  total: number;       // /80
  recommendation: SignalAction;
};

export type PositionSize = {
  capital: number;
  riskPercent: number;
  slDistance: number;
  quantity: number;
  maxLoss: number;
  capitalUsed: number;
  marginRequired: number;
};

export type Signal = {
  symbol: string;
  action: SignalAction;
  confidence: number;
  entry: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  trailingStopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: string;
  explanation: string;
  reason: string[];
  timestamp: string;
  timeframe: '1m';
  tradeType: TradeType;
  tradeDuration: string;
  tradeStatus: TradeStatus;
  exitReason?: ExitReason;
  indicators: {
    ema9: number;
    ema21: number;
    ema50: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    vwap: number;
    atr: number;
    adx: number;
    volumeRatio: number;
  };
  scorecard: AIScorecard;
  mtf: MultiTimeframeConfirmation;
  candlestickPattern: CandlestickPattern;
  supportLevel: number;
  resistanceLevel: number;
  optionsStrategy?: OptionsStrategyRecommendation;
  // Legacy fields kept for backward compat
  stopLoss_legacy?: number;
  target1_legacy?: number;
  target2_legacy?: number;
  target3_legacy?: number;
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

export type MarketContext = {
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  niftyTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  bankniftyTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  sensexTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  vixLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  advanceDeclineRatio: number;
  breadth: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
};

// ─── Options Strategy Engine ──────────────────────────────────────────────────

export type OptionType = 'CE' | 'PE';
export type StrikeSelection = 'ATM' | 'ITM-1' | 'ITM-2' | 'OTM-1' | 'OTM-2';
export type OptionsRiskLevel = 'Low' | 'Medium' | 'High';
export type ExpirySuggestion = 'Current Weekly' | 'Next Weekly' | 'Current Monthly' | 'Next Monthly';

export type OptionsStrategyDataQuality = {
  spotAvailable: boolean;
  chainAvailable: boolean;
  ivAvailable: boolean;
  oiAvailable: boolean;
  signalAvailable: boolean;
  isLiveNseData: boolean;          // always false until NSE broker API is wired
  dataQualityNote: string;
};

export type OptionsStrategyRecommendation = {
  symbol: string;                  // underlying: NIFTY, BANKNIFTY, RELIANCE …
  optionType: OptionType;          // CE or PE
  recommendedStrike: number;
  strikeSelection: StrikeSelection;
  expiry: ExpirySuggestion;
  entryPremium: number;            // from chain ceLtp / peLtp at recommended strike
  stopLossPremium: number;         // absolute premium level to exit
  stopLossPercent: number;         // % below entry premium
  target1Premium: number;
  target2Premium: number;
  target3Premium: number;
  expectedPremiumMove: number;     // points move expected to T1
  confidence: number;              // 0–100
  riskLevel: OptionsRiskLevel;
  holdingTime: string;
  // Option chain context used
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPain: number;
  impliedVolatility: number;       // IV at recommended strike (from chain row)
  oiAtStrike: number;
  oiChangeAtStrike: number;
  volumeAtStrike: number;
  // Reason breakdown
  technicalReason: string;
  optionChainReason: string;
  riskWarning: string;
  // Data quality metadata
  dataQuality: OptionsStrategyDataQuality;
  timestamp: string;
  canGenerate: boolean;            // false if insufficient data
  cannotGenerateReason?: string;
};
