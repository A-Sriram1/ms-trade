import Redis from 'ioredis';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import type { GoogleGenAI } from '@google/genai';
import yfinance from 'yahoo-finance2';
import { buildOptionsStrategy, type ChainInput } from './OptionsStrategyEngine';

const YahooFinance = (yfinance as any).default || yfinance;
const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;
if (typeof yahooFinance.suppressNotices === 'function') {
  yahooFinance.suppressNotices(['yahooSurvey']);
}

const TIMEZONE = 'Asia/Kolkata';

type SupportedOptionSymbol = 'NIFTY' | 'BANKNIFTY';

type SignalAction = 'STRONG BUY' | 'BUY' | 'WAIT' | 'EXIT' | 'SELL' | 'STRONG SELL';

type TradeStatus =
  | 'WAITING FOR ENTRY' | 'ENTRY TRIGGERED' | 'TRADE ACTIVE'
  | 'TARGET 1 HIT' | 'TARGET 2 HIT' | 'TARGET 3 HIT'
  | 'STOPLOSS HIT' | 'TRADE CLOSED';

type TradeType = 'Intraday Momentum' | 'Intraday Reversal' | 'Scalp' | 'Swing';

type CandlestickPattern =
  | 'Hammer' | 'Shooting Star' | 'Doji' | 'Morning Star' | 'Evening Star'
  | 'Bullish Engulfing' | 'Bearish Engulfing' | 'Inside Bar' | 'Outside Bar' | 'None';

type MultiTimeframeConfirmation = {
  tf1m: string; tf3m: string; tf5m: string;
  tf15m: string; tf30m: string; tf1h: string;
  confirmedCount: number;
};

type AIScorecard = {
  trend: number; momentum: number; volume: number; options: number;
  news: number; volatility: number; institutional: number; breadth: number;
  total: number; recommendation: SignalAction;
};

type IntradayCandle = {
  open: number; high: number; low: number; close: number; volume: number;
};

type QuantSignal = {
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
  indicators: {
    ema9: number; ema21: number; ema50: number;
    rsi: number; macd: number; macdSignal: number;
    vwap: number; atr: number; adx: number; volumeRatio: number;
  };
  scorecard: AIScorecard;
  mtf: MultiTimeframeConfirmation;
  candlestickPattern: CandlestickPattern;
  supportLevel: number;
  resistanceLevel: number;
  optionsStrategy?: import('./OptionsStrategyEngine').OptionsStrategyRecommendation;
};

type NewsCategory = 'MARKET' | 'COMPANY' | 'SECTOR';

type NewsArticle = {
  id: string; category: NewsCategory; entity: string;
  headline: string; link: string; source: string; timestamp: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number; impactScore: number; aiSummary: string;
};

type NewsIntelligencePayload = {
  market: NewsArticle[]; company: NewsArticle[]; sector: NewsArticle[];
  updatedAt: string | null; refreshIntervalSeconds: number;
};

type RawNewsItem = {
  id: string; category: NewsCategory; entity: string;
  headline: string; link: string; source: string; timestamp: string;
};

type OptionsAnalyticsRow = {
  strike: number; ceOi: number; peOi: number;
  ceOiChange: number; peOiChange: number;
  ceVolume: number; peVolume: number;
  ceLtp: number; peLtp: number;
  ceIv: number; peIv: number;
  pcr: number; totalOi: number; heat: number;
};

class InMemoryCache {
  private cache = new Map<string, string>();
  async get(key: string) { return this.cache.get(key) || null; }
  async set(key: string, value: string) { this.cache.set(key, value); }
}

export class MarketDataService {
  private redis: Redis | InMemoryCache;
  private ai: GoogleGenAI | null;
  private latestSignals: QuantSignal[] = [];
  private signalUpdatedAt: string | null = null;
  private lastSignalMinuteKey: string | null = null;
  private latestNews: NewsIntelligencePayload = {
    market: [], company: [], sector: [], updatedAt: null, refreshIntervalSeconds: 60,
  };
  private lastNewsMinuteKey: string | null = null;
  private newsSentimentCache: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  private latestOptionsChains: Record<string, ChainInput> = {};

  public healthStatus = {
    apiConnected: true, wsConnected: false,
    lastTickTime: null as string | null,
    redisConnected: false, errorMessage: null as string | null,
  };

  private latestData: Record<string, any> = {};

  private symbolMap: Record<string, string> = {
    'NIFTY': '^NSEI', 'BANKNIFTY': '^NSEBANK', 'SENSEX': '^BSESN',
    'INDIA VIX': '^INDIAVIX', 'RELIANCE': 'RELIANCE.NS',
    'HDFCBANK': 'HDFCBANK.NS', 'TCS': 'TCS.NS',
    'INFY': 'INFY.NS', 'ICICIBANK': 'ICICIBANK.NS', 'SBIN': 'SBIN.NS',
  };

  private reverseMap: Record<string, string> = {};
  private readonly signalSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'HDFCBANK', 'TCS'] as const;

  constructor(ai: GoogleGenAI | null = null) {
    this.ai = ai;
    this.redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new InMemoryCache();
    if (this.redis instanceof Redis) {
      this.redis.on('connect', () => { this.healthStatus.redisConnected = true; });
      this.redis.on('error', () => { this.healthStatus.redisConnected = false; });
    } else {
      this.healthStatus.redisConnected = true;
    }
    for (const [key, val] of Object.entries(this.symbolMap)) {
      this.reverseMap[val] = key;
    }
    this.pollData();
    setInterval(() => this.pollData(), 30000);
  }

  public getLatestData() { return this.latestData; }

  private async pollData() {
    try {
      const timestamp = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
      this.healthStatus.lastTickTime = timestamp;

      for (const [key, symbol] of Object.entries(this.symbolMap)) {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!data.chart?.result?.[0]) continue;
          const meta = data.chart.result[0].meta;
          const quote = data.chart.result[0].indicators?.quote?.[0] || {};
          const ltp = meta.regularMarketPrice || 0;
          const close = meta.chartPreviousClose || 0;
          const highs = quote.high || [];
          const lows = quote.low || [];
          const opens = quote.open || [];
          const vols = quote.volume || [];
          const lastIdx = highs.length > 0 ? highs.length - 1 : 0;
          const high = highs[lastIdx] || ltp;
          const low = lows[lastIdx] || ltp;
          const open = opens[lastIdx] || ltp;
          const volume = vols[lastIdx] || 0;
          const change = ltp - close;
          const change_pct = close > 0 ? (change / close) * 100 : 0;
          this.latestData[key] = {
            symbol: key, ltp, open, high, low, close, volume,
            change: parseFloat(change.toFixed(2)),
            change_pct: parseFloat(change_pct.toFixed(2)),
          };
        } catch (e: any) {
          console.error(`Failed Yahoo Finance for ${symbol}:`, e.message);
        }
      }

      const signalMinuteKey = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm');
      if (this.lastSignalMinuteKey !== signalMinuteKey) {
        await this.refreshSignals(signalMinuteKey);
      }
      if (this.lastNewsMinuteKey !== signalMinuteKey) {
        await this.refreshNews(signalMinuteKey);
      }

      this.healthStatus.apiConnected = true;
      this.healthStatus.errorMessage = null;
      this.redis.set('yahoo_latest_market_data', JSON.stringify(this.latestData));
    } catch (err: any) {
      console.error('Yahoo Finance Poll Error:', err);
      this.healthStatus.apiConnected = false;
      this.healthStatus.errorMessage = err.message;
    }
  }

  get_market_status(): { status: 'OPEN' | 'CLOSED'; serverTime: string } {
    const now = new Date();
    const zonedTime = toZonedTime(now, TIMEZONE);
    const hour = zonedTime.getHours();
    const minute = zonedTime.getMinutes();
    const day = zonedTime.getDay();
    const serverTime = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    if (day === 0 || day === 6) return { status: 'CLOSED', serverTime };
    const timeInMinutes = hour * 60 + minute;
    if (timeInMinutes >= 555 && timeInMinutes < 930) return { status: 'OPEN', serverTime };
    return { status: 'CLOSED', serverTime };
  }

  // ─── Technical Indicator Calculations ───────────────────────────────────────

  private calculateEMA(values: number[], period: number): number[] {
    if (values.length === 0) return [];
    const k = 2 / (period + 1);
    const ema: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  private calculateRSI(values: number[], period = 14): number[] {
    if (values.length <= period) return new Array(values.length).fill(50);
    const rsi = new Array(values.length).fill(50);
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = values[i] - values[i - 1];
      if (d >= 0) gains += d; else losses += Math.abs(d);
    }
    let avgGain = gains / period, avgLoss = losses / period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < values.length; i++) {
      const d = values[i] - values[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
      rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return rsi;
  }

  private calculateMACD(values: number[]) {
    const ema12 = this.calculateEMA(values, 12);
    const ema26 = this.calculateEMA(values, 26);
    const macd = values.map((_, i) => ema12[i] - ema26[i]);
    const signal = this.calculateEMA(macd, 9);
    const histogram = macd.map((v, i) => v - signal[i]);
    return { macd, signal, histogram };
  }

  private calculateVWAP(candles: IntradayCandle[]): number[] {
    let cumPV = 0, cumV = 0;
    return candles.map(c => {
      const tp = (c.high + c.low + c.close) / 3;
      cumPV += tp * c.volume;
      cumV += Math.max(c.volume, 1);
      return cumPV / cumV;
    });
  }

  private calculateATR(candles: IntradayCandle[], period = 14): number[] {
    if (candles.length < 2) return new Array(candles.length).fill(0);
    const trs: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      trs.push(Math.max(hl, hc, lc));
    }
    const atr: number[] = new Array(candles.length).fill(0);
    let sum = 0;
    for (let i = 0; i < Math.min(period, trs.length); i++) sum += trs[i];
    if (trs.length >= period) {
      atr[period - 1] = sum / period;
      for (let i = period; i < trs.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + trs[i]) / period;
      }
    }
    return atr;
  }

  private calculateADX(candles: IntradayCandle[], period = 14): number {
    if (candles.length < period + 1) return 20;
    let plusDM = 0, minusDM = 0, tr = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const upMove = candles[i].high - candles[i - 1].high;
      const downMove = candles[i - 1].low - candles[i].low;
      if (upMove > downMove && upMove > 0) plusDM += upMove;
      if (downMove > upMove && downMove > 0) minusDM += downMove;
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr += Math.max(hl, hc, lc);
    }
    if (tr === 0) return 20;
    const plusDI = (plusDM / tr) * 100;
    const minusDI = (minusDM / tr) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI + 0.001) * 100;
    return Math.min(100, Math.max(0, dx));
  }

  // ─── Candlestick Pattern Detection ──────────────────────────────────────────

  private detectCandlestickPattern(candles: IntradayCandle[]): CandlestickPattern {
    if (candles.length < 3) return 'None';
    const c0 = candles[candles.length - 1]; // latest
    const c1 = candles[candles.length - 2];
    const c2 = candles[candles.length - 3];
    const body0 = Math.abs(c0.close - c0.open);
    const body1 = Math.abs(c1.close - c1.open);
    const range0 = c0.high - c0.low;
    const range1 = c1.high - c1.low;

    // Doji
    if (body0 < range0 * 0.1) return 'Doji';
    // Hammer (bullish) — small body, long lower wick, after downtrend
    const lowerWick0 = c0.open > c0.close ? c0.close - c0.low : c0.open - c0.low;
    const upperWick0 = c0.open > c0.close ? c0.high - c0.open : c0.high - c0.close;
    if (c1.close < c1.open && lowerWick0 > body0 * 2 && upperWick0 < body0 * 0.5) return 'Hammer';
    // Shooting Star (bearish)
    if (c1.close > c1.open && upperWick0 > body0 * 2 && lowerWick0 < body0 * 0.5) return 'Shooting Star';
    // Bullish Engulfing
    if (c1.close < c1.open && c0.close > c0.open && c0.open < c1.close && c0.close > c1.open) return 'Bullish Engulfing';
    // Bearish Engulfing
    if (c1.close > c1.open && c0.close < c0.open && c0.open > c1.close && c0.close < c1.open) return 'Bearish Engulfing';
    // Morning Star
    if (c2.close < c2.open && body1 < range1 * 0.3 && c0.close > c0.open && c0.close > (c2.open + c2.close) / 2) return 'Morning Star';
    // Evening Star
    if (c2.close > c2.open && body1 < range1 * 0.3 && c0.close < c0.open && c0.close < (c2.open + c2.close) / 2) return 'Evening Star';
    // Inside Bar
    if (c0.high < c1.high && c0.low > c1.low) return 'Inside Bar';
    // Outside Bar
    if (c0.high > c1.high && c0.low < c1.low) return 'Outside Bar';
    return 'None';
  }

  // ─── Support & Resistance Detection ─────────────────────────────────────────

  private detectSupportResistance(candles: IntradayCandle[]): { support: number; resistance: number } {
    if (candles.length < 20) {
      const last = candles[candles.length - 1];
      return { support: last?.low || 0, resistance: last?.high || 0 };
    }
    const recent = candles.slice(-40);
    const highs = recent.map(c => c.high).sort((a, b) => b - a);
    const lows = recent.map(c => c.low).sort((a, b) => a - b);
    // Take the 2nd-highest high and 2nd-lowest low to avoid outliers
    const resistance = highs[Math.floor(highs.length * 0.1)] || highs[0];
    const support = lows[Math.floor(lows.length * 0.1)] || lows[0];
    return { support: this.round(support), resistance: this.round(resistance) };
  }

  // ─── Multi-Timeframe Simulation ──────────────────────────────────────────────

  private simulateMTF(candles: IntradayCandle[], bullishScore: number, bearishScore: number): MultiTimeframeConfirmation {
    const total = bullishScore + bearishScore;
    const bias = total > 0 ? bullishScore / total : 0.5;
    // Simulate different timeframe resolution by sampling candle windows
    const resolve = (windowSize: number): string => {
      if (candles.length < windowSize) return 'NEUTRAL';
      const slice = candles.slice(-windowSize);
      const closes = slice.map(c => c.close);
      const ema9 = this.calculateEMA(closes, Math.min(9, closes.length));
      const ema21 = this.calculateEMA(closes, Math.min(21, closes.length));
      const rsi = this.calculateRSI(closes, Math.min(14, closes.length));
      const last = closes.length - 1;
      const bullish = ema9[last] > ema21[last] && rsi[last] > 50;
      const bearish = ema9[last] < ema21[last] && rsi[last] < 50;
      if (bullish) return bias >= 0.6 ? 'BUY' : 'WAIT';
      if (bearish) return bias <= 0.4 ? 'SELL' : 'WAIT';
      return 'NEUTRAL';
    };
    const tf1m = resolve(10);
    const tf3m = resolve(20);
    const tf5m = resolve(30);
    const tf15m = resolve(60);
    const tf30m = resolve(90);
    const tf1h = resolve(120);
    const confirmedCount = [tf1m, tf3m, tf5m, tf15m, tf30m, tf1h].filter(
      t => t === 'BUY' || t === 'SELL'
    ).length;
    return { tf1m, tf3m, tf5m, tf15m, tf30m, tf1h, confirmedCount };
  }

  // ─── AI Scorecard ────────────────────────────────────────────────────────────

  private buildScorecard(
    bullishScore: number, bearishScore: number,
    volumeRatio: number, adx: number, rsi: number,
    macd: number, macdSignal: number,
    priceAboveVwap: boolean, ema9: number, ema21: number, ema50: number, price: number,
    mtfCount: number, newsSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ): AIScorecard {
    const bullDir = bullishScore > bearishScore;
    const trend = Math.min(10, Math.round(
      (ema9 > ema21 && ema21 > ema50 ? 8 : ema9 > ema21 ? 5 : 3) +
      (adx > 30 ? 2 : adx > 20 ? 1 : 0)
    ));
    const momentum = Math.min(10, Math.round(
      (rsi >= 55 && rsi <= 70 ? 8 : rsi >= 50 ? 5 : rsi < 30 ? 7 : 3) +
      (macd > macdSignal ? 2 : 0)
    ));
    const volume = Math.min(10, Math.round(
      (volumeRatio > 2 ? 10 : volumeRatio > 1.5 ? 8 : volumeRatio > 1 ? 5 : 3)
    ));
    const options = Math.min(10, 6); // based on PCR when available
    const news = newsSentiment === 'BULLISH' ? 8 : newsSentiment === 'BEARISH' ? 3 : 5;
    const volatility = Math.min(10, Math.round(adx > 25 ? 7 : adx > 15 ? 5 : 3));
    const institutional = Math.min(10, Math.round(volumeRatio > 1.5 && adx > 25 ? 8 : 5));
    const breadth = Math.min(10, Math.round(priceAboveVwap ? 8 : 4) + (mtfCount >= 4 ? 2 : 0));
    const total = trend + momentum + volume + options + news + volatility + institutional + breadth;
    let recommendation: SignalAction = 'WAIT';
    if (bullDir) {
      if (total >= 60) recommendation = 'STRONG BUY';
      else if (total >= 45) recommendation = 'BUY';
      else recommendation = 'WAIT';
    } else {
      if (total >= 60) recommendation = 'STRONG SELL';
      else if (total >= 45) recommendation = 'SELL';
      else recommendation = 'WAIT';
    }
    return { trend, momentum, volume, options, news, volatility, institutional, breadth, total, recommendation };
  }

  // ─── Core Signal Builder ─────────────────────────────────────────────────────

  private buildQuantSignal(symbol: string, candles: IntradayCandle[]): QuantSignal | null {
    if (candles.length < 60) return null;

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const ema9Series = this.calculateEMA(closes, 9);
    const ema21Series = this.calculateEMA(closes, 21);
    const ema50Series = this.calculateEMA(closes, 50);
    const rsiSeries = this.calculateRSI(closes, 14);
    const macdData = this.calculateMACD(closes);
    const vwapSeries = this.calculateVWAP(candles);
    const atrSeries = this.calculateATR(candles, 14);
    const adx = this.calculateADX(candles, 14);

    const last = closes.length - 1;
    const price = closes[last];
    const ema9 = ema9Series[last];
    const ema21 = ema21Series[last];
    const ema50 = ema50Series[last];
    const rsi = rsiSeries[last];
    const macd = macdData.macd[last];
    const macdSignal = macdData.signal[last];
    const macdHistogram = macdData.histogram[last];
    const vwap = vwapSeries[last];
    const atr = atrSeries[last] || price * 0.003;

    // Volume ratio vs 20-bar average
    const recentVols = volumes.slice(-20);
    const avgVol = recentVols.reduce((s, v) => s + v, 0) / recentVols.length;
    const volumeRatio = avgVol > 0 ? volumes[last] / avgVol : 1;

    const recentCandles = candles.slice(-20);
    const recentLow = Math.min(...recentCandles.map(c => c.low));
    const recentHigh = Math.max(...recentCandles.map(c => c.high));
    const { support, resistance } = this.detectSupportResistance(candles);
    const candlestickPattern = this.detectCandlestickPattern(candles);
    const priceAboveVwap = price > vwap;

    // ─── Scoring engine ──────────────────────────────────────────────────────
    let bullishScore = 0, bearishScore = 0;
    const reasons: string[] = [];

    // EMA alignment (28pts)
    if (ema9 > ema21 && ema21 > ema50) {
      bullishScore += 28;
      reasons.push('EMA 9 > EMA 21 > EMA 50 — full bullish trend alignment confirmed.');
    } else if (ema9 < ema21 && ema21 < ema50) {
      bearishScore += 28;
      reasons.push('EMA 9 < EMA 21 < EMA 50 — full bearish trend alignment confirmed.');
    } else {
      reasons.push('EMA alignment is mixed — trend conviction is reduced.');
    }

    // VWAP (18pts)
    if (priceAboveVwap) { bullishScore += 18; reasons.push('Price above VWAP — intraday buying control.'); }
    else { bearishScore += 18; reasons.push('Price below VWAP — intraday selling pressure.'); }

    // RSI (16pts)
    if (rsi >= 55 && rsi <= 70) { bullishScore += 16; reasons.push(`RSI ${this.round(rsi)} in bullish momentum zone (55–70).`); }
    else if (rsi <= 45 && rsi >= 28) { bearishScore += 16; reasons.push(`RSI ${this.round(rsi)} in bearish momentum zone (28–45).`); }
    else if (rsi > 70) { bearishScore += 8; reasons.push(`RSI ${this.round(rsi)} overbought — pullback risk elevated.`); }
    else if (rsi < 28) { bullishScore += 8; reasons.push(`RSI ${this.round(rsi)} oversold — potential reversal zone.`); }

    // MACD (24pts)
    if (macd > macdSignal && macdHistogram > 0) { bullishScore += 24; reasons.push('MACD bullish crossover with positive histogram momentum.'); }
    else if (macd < macdSignal && macdHistogram < 0) { bearishScore += 24; reasons.push('MACD bearish crossover with negative histogram momentum.'); }

    // Price vs EMA9 (14pts)
    if (price > ema9) { bullishScore += 14; reasons.push('Price above EMA 9 — short-term momentum intact.'); }
    else { bearishScore += 14; reasons.push('Price below EMA 9 — short-term momentum lost.'); }

    // ADX strength bonus (10pts)
    if (adx > 25) {
      if (bullishScore > bearishScore) bullishScore += 10;
      else bearishScore += 10;
      reasons.push(`ADX ${this.round(adx)} > 25 — strong directional momentum.`);
    }

    // Volume confirmation (10pts)
    if (volumeRatio > 1.5) {
      if (bullishScore > bearishScore) bullishScore += 10;
      else bearishScore += 10;
      reasons.push(`Volume ${this.round(volumeRatio)}x average — institutional participation.`);
    }

    // Candlestick pattern bonus
    const bullishPatterns: CandlestickPattern[] = ['Hammer', 'Morning Star', 'Bullish Engulfing'];
    const bearishPatterns: CandlestickPattern[] = ['Shooting Star', 'Evening Star', 'Bearish Engulfing'];
    if (bullishPatterns.includes(candlestickPattern)) { bullishScore += 8; reasons.push(`${candlestickPattern} pattern detected — bullish reversal signal.`); }
    else if (bearishPatterns.includes(candlestickPattern)) { bearishScore += 8; reasons.push(`${candlestickPattern} pattern detected — bearish reversal signal.`); }

    // ─── Determine action ────────────────────────────────────────────────────
    const scoreDiff = bullishScore - bearishScore;
    let action: SignalAction = 'WAIT';
    if (bullishScore >= 80 && scoreDiff >= 40) action = 'STRONG BUY';
    else if (bullishScore >= 58 && scoreDiff >= 20) action = 'BUY';
    else if (bearishScore >= 80 && scoreDiff <= -40) action = 'STRONG SELL';
    else if (bearishScore >= 58 && scoreDiff <= -20) action = 'SELL';

    const domScore = Math.max(bullishScore, bearishScore);
    const confidence = action === 'WAIT'
      ? Math.min(65, Math.max(45, 45 + Math.abs(scoreDiff) * 0.3))
      : Math.min(97, Math.max(60, 60 + domScore * 0.18 + Math.abs(scoreDiff) * 0.2));

    // ─── Stop Loss & Targets via ATR ─────────────────────────────────────────
    let stopLoss = 0, trailingStopLoss = 0;
    let target1 = 0, target2 = 0, target3 = 0;
    const entryZoneLow = this.round(price - atr * 0.3);
    const entryZoneHigh = this.round(price + atr * 0.3);

    if (action === 'STRONG BUY' || action === 'BUY') {
      const supports = [ema21, ema50, vwap, support, recentLow].filter(v => v > 0 && v < price);
      const supportLevel = supports.length > 0 ? Math.max(...supports) : price - atr * 1.5;
      stopLoss = Math.max(supportLevel - atr * 0.5, price - atr * 2);
      trailingStopLoss = price - atr * 1.2;
      if (stopLoss >= price) stopLoss = price - atr * 1.5;
      const risk = Math.max(price - stopLoss, price * 0.003);
      target1 = price + risk * 1.5;
      target2 = price + risk * 2.5;
      target3 = price + risk * 4;
    } else if (action === 'STRONG SELL' || action === 'SELL') {
      const resistances = [ema21, ema50, vwap, resistance, recentHigh].filter(v => v > price);
      const resistLevel = resistances.length > 0 ? Math.min(...resistances) : price + atr * 1.5;
      stopLoss = Math.min(resistLevel + atr * 0.5, price + atr * 2);
      trailingStopLoss = price + atr * 1.2;
      if (stopLoss <= price) stopLoss = price + atr * 1.5;
      const risk = Math.max(stopLoss - price, price * 0.003);
      target1 = price - risk * 1.5;
      target2 = price - risk * 2.5;
      target3 = price - risk * 4;
    } else {
      stopLoss = price - atr * 1.5;
      trailingStopLoss = price - atr;
      target1 = price + atr * 1.5;
      target2 = price + atr * 2.5;
      target3 = price + atr * 4;
    }

    const riskAmt = Math.abs(price - stopLoss);
    const rewardAmt = Math.abs(target2 - price);
    const rrRatio = riskAmt > 0 ? (rewardAmt / riskAmt).toFixed(1) : '0';
    const riskReward = `1:${rrRatio}`;

    // ─── Multi-timeframe ─────────────────────────────────────────────────────
    const mtf = this.simulateMTF(candles, bullishScore, bearishScore);

    // ─── Scorecard ───────────────────────────────────────────────────────────
    const scorecard = this.buildScorecard(
      bullishScore, bearishScore, volumeRatio, adx, rsi,
      macd, macdSignal, priceAboveVwap, ema9, ema21, ema50, price,
      mtf.confirmedCount, this.newsSentimentCache
    );

    // ─── Trade metadata ──────────────────────────────────────────────────────
    let tradeType: TradeType = 'Intraday Momentum';
    let tradeDuration = '20–45 Minutes';
    if (action === 'STRONG BUY' || action === 'STRONG SELL') { tradeType = 'Intraday Momentum'; tradeDuration = '30–60 Minutes'; }
    else if (candlestickPattern !== 'None') { tradeType = 'Intraday Reversal'; tradeDuration = '15–30 Minutes'; }
    else if (adx < 20) { tradeType = 'Scalp'; tradeDuration = '5–15 Minutes'; }

    const tradeStatus: TradeStatus = action === 'WAIT' ? 'WAITING FOR ENTRY' : 'WAITING FOR ENTRY';

    const explanation = action === 'STRONG BUY'
      ? `${symbol} prints a STRONG BUY. All indicator dimensions are aligned bullishly — EMA stack, VWAP, MACD, and ${mtf.confirmedCount} of 6 timeframes confirm the move.`
      : action === 'BUY'
        ? `${symbol} shows a BUY setup with trend, momentum, and VWAP supporting upside.`
        : action === 'STRONG SELL'
          ? `${symbol} prints a STRONG SELL. Bearish EMA stack, MACD cross, and ${mtf.confirmedCount} timeframes confirm downside bias.`
          : action === 'SELL'
            ? `${symbol} shows a SELL setup with bearish trend, momentum, and VWAP breakdown.`
            : `${symbol} is on WAIT — indicator mix is insufficient for a high-confidence directional trade.`;

    return {
      symbol, action, confidence: Math.round(confidence),
      entry: this.round(price), entryZoneLow, entryZoneHigh,
      stopLoss: this.round(stopLoss), trailingStopLoss: this.round(trailingStopLoss),
      target1: this.round(target1), target2: this.round(target2), target3: this.round(target3),
      riskReward, explanation, reason: reasons.slice(0, 5),
      timestamp: formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      timeframe: '1m', tradeType, tradeDuration, tradeStatus,
      indicators: {
        ema9: this.round(ema9), ema21: this.round(ema21), ema50: this.round(ema50),
        rsi: this.round(rsi), macd: this.round(macd), macdSignal: this.round(macdSignal),
        vwap: this.round(vwap), atr: this.round(atr), adx: this.round(adx),
        volumeRatio: this.round(volumeRatio),
      },
      scorecard, mtf, candlestickPattern,
      supportLevel: support, resistanceLevel: resistance,
    };
  }

  private async fetchIntradayCandles(symbolKey: string): Promise<IntradayCandle[]> {
    const yahooSymbol = this.symbolMap[symbolKey];
    if (!yahooSymbol) return [];
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m&includePrePost=false`
    );
    if (!response.ok) throw new Error(`Intraday request failed for ${symbolKey}`);
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const closes = result?.indicators?.adjclose?.[0]?.adjclose || quote?.close || [];
    const opens = quote?.open || [];
    const highs = quote?.high || [];
    const lows = quote?.low || [];
    const volumes = quote?.volume || [];
    const candles: IntradayCandle[] = [];
    for (let i = 0; i < closes.length; i++) {
      const close = closes[i], open = opens[i], high = highs[i], low = lows[i], volume = volumes[i];
      if ([close, open, high, low, volume].every(v => typeof v === 'number' && Number.isFinite(v))) {
        candles.push({ open, high, low, close, volume: Math.max(volume, 1) });
      }
    }
    return candles.slice(-180);
  }

  private async refreshSignals(signalMinuteKey: string) {
    const signals: QuantSignal[] = [];

    // Pre-fetch options chains for supported symbols so they're ready for strategy engine
    for (const optSym of ['NIFTY', 'BANKNIFTY'] as const) {
      try {
        const chainData = await this.get_options_data(optSym);
        this.latestOptionsChains[optSym] = {
          symbol: chainData.symbol,
          spot: chainData.spot,
          atmStrike: chainData.atmStrike,
          strikeStep: chainData.strikeStep,
          pcr: chainData.pcr,
          maxPain: chainData.maxPain,
          totalCeOi: chainData.totalCeOi,
          totalPeOi: chainData.totalPeOi,
          rows: chainData.rows,
        };
      } catch (e: any) {
        console.error(`Options chain prefetch failed for ${optSym}:`, e.message);
      }
    }

    for (const symbol of this.signalSymbols) {
      try {
        const candles = await this.fetchIntradayCandles(symbol);
        const signal = this.buildQuantSignal(symbol, candles);
        if (signal) {
          // Wire options strategy — only NIFTY & BANKNIFTY have chain data
          const chain = this.latestOptionsChains[symbol] ?? null;
          const vixLtp = this.latestData['INDIA VIX']?.ltp ?? null;
          const optionsStrategy = buildOptionsStrategy(signal, chain, vixLtp);
          signal.optionsStrategy = optionsStrategy;
          signals.push(signal);
        }
      } catch (error: any) {
        console.error(`Signal build failed for ${symbol}:`, error.message);
      }
    }

    this.latestSignals = signals.sort((a, b) => b.confidence - a.confidence);
    this.signalUpdatedAt = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    this.lastSignalMinuteKey = signalMinuteKey;
  }

  private round(v: number) { return parseFloat(v.toFixed(2)); }

  private isFiniteNumber(v: number | null | undefined): v is number {
    return typeof v === 'number' && Number.isFinite(v);
  }

  // ─── News ────────────────────────────────────────────────────────────────────

  private decodeXmlEntities(value: string) {
    return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  }

  private extractXmlTag(block: string, tagName: string) {
    const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match ? this.decodeXmlEntities(match[1]) : '';
  }

  private buildNewsSource(link: string, fallbackSource: string) {
    if (fallbackSource) return fallbackSource;
    try { return new URL(link).hostname.replace('www.', ''); } catch { return 'Unknown Source'; }
  }

  private parseRssFeed(xml: string, category: NewsCategory, entity: string): RawNewsItem[] {
    const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    return items.slice(0, 6).map((item, index) => {
      const headline = this.extractXmlTag(item, 'title');
      const link = this.extractXmlTag(item, 'link');
      const timestamp = this.extractXmlTag(item, 'pubDate') || formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
      const source = this.buildNewsSource(link, this.extractXmlTag(item, 'source'));
      return {
        id: `${category}-${entity}-${index}-${headline}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120),
        category, entity, headline, link, source, timestamp,
      } satisfies RawNewsItem;
    }).filter(i => i.headline && i.link);
  }

  private getNewsFeeds() {
    return [
      { category: 'MARKET' as const, entity: 'Indian Market', url: 'https://news.google.com/rss/search?q=Indian%20stock%20market%20OR%20NIFTY%20OR%20BANKNIFTY%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen' },
      { category: 'COMPANY' as const, entity: 'Tracked Companies', url: 'https://news.google.com/rss/search?q=RELIANCE%20OR%20HDFCBANK%20OR%20TCS%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen' },
      { category: 'SECTOR' as const, entity: 'Key Sectors', url: 'https://news.google.com/rss/search?q=India%20banking%20sector%20OR%20IT%20sector%20OR%20energy%20sector%20stocks%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen' },
    ];
  }

  private inferSentimentFromHeadline(headline: string): NewsArticle['sentiment'] {
    const n = headline.toLowerCase();
    const bull = ['surge', 'rally', 'gain', 'beats', 'upgrade', 'strong', 'growth', 'buy', 'profit jumps', 'record'].filter(k => n.includes(k)).length;
    const bear = ['falls', 'drop', 'slump', 'downgrade', 'misses', 'weak', 'warning', 'cuts', 'loss', 'selloff'].filter(k => n.includes(k)).length;
    if (bull > bear) return 'BULLISH';
    if (bear > bull) return 'BEARISH';
    return 'NEUTRAL';
  }

  private fallbackAnalyzeNews(items: RawNewsItem[]): NewsArticle[] {
    return items.map(item => {
      const sentiment = this.inferSentimentFromHeadline(item.headline);
      return {
        ...item, sentiment,
        sentimentScore: sentiment === 'BULLISH' ? 68 : sentiment === 'BEARISH' ? 34 : 50,
        impactScore: item.category === 'MARKET' ? 78 : item.category === 'SECTOR' ? 64 : 58,
        aiSummary: `${item.headline}. Categorized as ${sentiment.toLowerCase()} for ${item.entity}.`,
      };
    });
  }

  private async analyzeNewsWithGemini(items: RawNewsItem[]): Promise<NewsArticle[]> {
    if (!this.ai || items.length === 0) return this.fallbackAnalyzeNews(items);
    const prompt = [
      'You are an Indian stock market news intelligence engine.',
      'Analyze each news item and return strict JSON only as an array.',
      'For every item return: id, sentiment (BULLISH|BEARISH|NEUTRAL), sentimentScore (0-100), impactScore (0-100), aiSummary.',
      'aiSummary must be 1-2 concise sentences describing why the story matters for trading.',
      JSON.stringify(items),
    ].join('\n');
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const raw = (response.text || '[]').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(raw) as Array<{ id: string; sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; sentimentScore: number; impactScore: number; aiSummary: string }>;
      const map = new Map(parsed.map(p => [p.id, p]));
      return items.map(item => {
        const a = map.get(item.id);
        if (!a) return this.fallbackAnalyzeNews([item])[0];
        return { ...item, sentiment: a.sentiment, sentimentScore: Math.min(100, Math.max(0, Math.round(a.sentimentScore))), impactScore: Math.min(100, Math.max(0, Math.round(a.impactScore))), aiSummary: a.aiSummary?.trim() || '' };
      });
    } catch (e: any) {
      console.error('Gemini news analysis failed:', e.message);
      return this.fallbackAnalyzeNews(items);
    }
  }

  private async refreshNews(newsMinuteKey: string) {
    const buckets: NewsIntelligencePayload = { market: [], company: [], sector: [], updatedAt: null, refreshIntervalSeconds: 60 };
    for (const feed of this.getNewsFeeds()) {
      try {
        const res = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0 TradeMindAI' } });
        if (!res.ok) throw new Error(`News feed failed for ${feed.category}`);
        const xml = await res.text();
        const parsed = this.parseRssFeed(xml, feed.category, feed.entity);
        const analyzed = await this.analyzeNewsWithGemini(parsed.slice(0, 4));
        if (feed.category === 'MARKET') buckets.market = analyzed;
        else if (feed.category === 'COMPANY') buckets.company = analyzed;
        else buckets.sector = analyzed;
      } catch (e: any) { console.error(`Failed to refresh ${feed.category} news:`, e.message); }
    }
    buckets.updatedAt = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    // Cache aggregate news sentiment for scorecard
    const allArticles = [...buckets.market, ...buckets.company, ...buckets.sector];
    const bullCount = allArticles.filter(a => a.sentiment === 'BULLISH').length;
    const bearCount = allArticles.filter(a => a.sentiment === 'BEARISH').length;
    this.newsSentimentCache = bullCount > bearCount ? 'BULLISH' : bearCount > bullCount ? 'BEARISH' : 'NEUTRAL';
    this.latestNews = buckets;
    this.lastNewsMinuteKey = newsMinuteKey;
  }

  // ─── Options Chain ───────────────────────────────────────────────────────────

  private getOptionConfig(symbol: string): { symbol: SupportedOptionSymbol; strikeStep: number; defaultSpot: number; baseOi: number; baseIv: number } {
    const n = symbol.trim().toUpperCase();
    switch (n) {
      case 'NIFTY': return { symbol: 'NIFTY', strikeStep: 50, defaultSpot: 24500, baseOi: 125000, baseIv: 14.5 };
      case 'BANKNIFTY': return { symbol: 'BANKNIFTY', strikeStep: 100, defaultSpot: 54000, baseOi: 98000, baseIv: 17.8 };
      default: throw new Error('Options analytics are currently supported for NIFTY and BANKNIFTY only.');
    }
  }

  private deterministicNoise(symbol: string, strike: number, seedOffset = 0) {
    const base = [...symbol].reduce((acc, c) => acc + c.charCodeAt(0), 0) + strike + seedOffset;
    return (Math.sin(base) + 1) / 2;
  }

  private calculateMaxPain(rows: OptionsAnalyticsRow[]) {
    let bestStrike = rows[0]?.strike || 0, bestPain = Infinity;
    for (const candidate of rows) {
      const pain = rows.reduce((total, row) => {
        return total + Math.max(0, candidate.strike - row.strike) * row.ceOi + Math.max(0, row.strike - candidate.strike) * row.peOi;
      }, 0);
      if (pain < bestPain) { bestPain = pain; bestStrike = candidate.strike; }
    }
    return bestStrike;
  }

  async get_options_data(symbol: string) {
    const config = this.getOptionConfig(symbol);
    const marketSnapshot = this.latestData[config.symbol];
    const spot = marketSnapshot?.ltp || config.defaultSpot;
    const strikeStep = config.strikeStep;
    const atmStrike = Math.round(spot / strikeStep) * strikeStep;
    const rows: OptionsAnalyticsRow[] = [];

    for (let i = -6; i <= 6; i++) {
      const strike = atmStrike + i * strikeStep;
      const distance = Math.abs(i);
      const noise1 = this.deterministicNoise(config.symbol, strike, 1);
      const noise2 = this.deterministicNoise(config.symbol, strike, 2);
      const noise3 = this.deterministicNoise(config.symbol, strike, 3);
      const noise4 = this.deterministicNoise(config.symbol, strike, 4);
      const atmFactor = Math.max(0, 1 - distance * 0.12);
      const ceOi = Math.round(config.baseOi * atmFactor * (0.7 + noise1 * 0.6));
      const peOi = Math.round(config.baseOi * atmFactor * (0.7 + noise2 * 0.6));
      const ceOiChange = Math.round((noise3 - 0.5) * config.baseOi * 0.3 * atmFactor);
      const peOiChange = Math.round((noise4 - 0.5) * config.baseOi * 0.3 * atmFactor);
      const ceVolume = Math.round(ceOi * (0.08 + noise1 * 0.12));
      const peVolume = Math.round(peOi * (0.08 + noise2 * 0.12));
      const baseIvDist = config.baseIv * (1 + distance * 0.04);
      const ceIv = parseFloat((baseIvDist * (0.9 + noise3 * 0.2)).toFixed(2));
      const peIv = parseFloat((baseIvDist * (0.9 + noise4 * 0.2)).toFixed(2));
      const ivDecay = Math.max(0.1, 1 - distance * 0.08);
      const ceLtp = parseFloat((spot * ivDecay * 0.02 * (0.5 + noise1) * (i < 0 ? Math.max(0.1, 1 + i * 0.3) : 1)).toFixed(2));
      const peLtp = parseFloat((spot * ivDecay * 0.02 * (0.5 + noise2) * (i > 0 ? Math.max(0.1, 1 - i * 0.3) : 1)).toFixed(2));
      const pcr = peOi > 0 ? parseFloat((peOi / ceOi).toFixed(2)) : 1;
      const totalOi = ceOi + peOi;
      const heat = Math.min(1, atmFactor * (0.4 + (Math.abs(ceOiChange) + Math.abs(peOiChange)) / (config.baseOi * 0.5)));
      rows.push({ strike, ceOi, peOi, ceOiChange, peOiChange, ceVolume, peVolume, ceLtp, peLtp, ceIv, peIv, pcr, totalOi, heat });
    }

    const totalCeOi = rows.reduce((s, r) => s + r.ceOi, 0);
    const totalPeOi = rows.reduce((s, r) => s + r.peOi, 0);
    const pcr = totalCeOi > 0 ? parseFloat((totalPeOi / totalCeOi).toFixed(2)) : 1;
    const maxPain = this.calculateMaxPain(rows);
    const sortedCE = [...rows].sort((a, b) => b.ceOi - a.ceOi).slice(0, 3).map(r => ({ strike: r.strike, oi: r.ceOi }));
    const sortedPE = [...rows].sort((a, b) => b.peOi - a.peOi).slice(0, 3).map(r => ({ strike: r.strike, oi: r.peOi }));

    return {
      symbol: config.symbol, spot: this.round(spot), atmStrike, strikeStep,
      updatedAt: formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      refreshIntervalSeconds: 60, pcr, maxPain, totalCeOi, totalPeOi,
      highestCallOiStrikes: sortedCE, highestPutOiStrikes: sortedPE,
      dataSource: {
        provider: 'TradeMind Quant Engine', mode: 'mock' as const,
        supportsLiveIndianIndexOptions: false as const,
        banner: 'Options OI data is model-generated from spot price and volatility. For live NSE OI, a broker API integration is required.',
      },
      rows,
    };
  }

  // ─── Market Context ──────────────────────────────────────────────────────────

  private buildMarketContext() {
    const nifty = this.latestData['NIFTY'];
    const banknifty = this.latestData['BANKNIFTY'];
    const sensex = this.latestData['SENSEX'];
    const vix = this.latestData['INDIA VIX'];
    const trend = (item: any) => {
      if (!item) return 'SIDEWAYS' as const;
      if (item.change_pct > 0.3) return 'BULLISH' as const;
      if (item.change_pct < -0.3) return 'BEARISH' as const;
      return 'SIDEWAYS' as const;
    };
    const vixVal = vix?.ltp || 15;
    return {
      trend: trend(nifty), niftyTrend: trend(nifty), bankniftyTrend: trend(banknifty),
      sensexTrend: trend(sensex),
      vixLevel: (vixVal > 25 ? 'EXTREME' : vixVal > 18 ? 'HIGH' : vixVal > 12 ? 'MEDIUM' : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
      advanceDeclineRatio: 1.2, breadth: trend(nifty) as 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'SIDEWAYS',
    };
  }

  // ─── Public stream_market_data ───────────────────────────────────────────────

  async stream_market_data() {
    const { status, serverTime } = this.get_market_status();
    const marketContext = this.buildMarketContext();
    return {
      type: 'MARKET_UPDATE',
      nifty: this.latestData['NIFTY'] || null,
      banknifty: this.latestData['BANKNIFTY'] || null,
      sensex: this.latestData['SENSEX'] || null,
      vix: this.latestData['INDIA VIX'] || null,
      stocks: Object.entries(this.latestData)
        .filter(([k]) => !['NIFTY', 'BANKNIFTY', 'SENSEX', 'INDIA VIX'].includes(k))
        .map(([, v]) => v),
      signals: this.latestSignals,
      signalUpdatedAt: this.signalUpdatedAt,
      signalRefreshIntervalSeconds: 60,
      news: this.latestNews,
      status,
      serverTime,
      marketContext,
      error: this.healthStatus.errorMessage,
      health: this.healthStatus,
    };
  }
}
