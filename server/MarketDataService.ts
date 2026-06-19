import Redis from 'ioredis';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import type { GoogleGenAI } from '@google/genai';
import yfinance from 'yahoo-finance2';

// In yahoo-finance2 v3 or under esbuild, we need to instantiate it
const YahooFinance = (yfinance as any).default || yfinance;
const yahooFinance = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;

if (typeof yahooFinance.suppressNotices === 'function') {
  yahooFinance.suppressNotices(['yahooSurvey']);
}

const TIMEZONE = 'Asia/Kolkata';

type SupportedOptionSymbol = 'NIFTY' | 'BANKNIFTY';
type SignalAction = 'BUY' | 'SELL' | 'HOLD';

type IntradayCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type QuantSignal = {
  symbol: string;
  action: SignalAction;
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

type NewsCategory = 'MARKET' | 'COMPANY' | 'SECTOR';

type NewsArticle = {
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

type NewsIntelligencePayload = {
  market: NewsArticle[];
  company: NewsArticle[];
  sector: NewsArticle[];
  updatedAt: string | null;
  refreshIntervalSeconds: number;
};

type RawNewsItem = {
  id: string;
  category: NewsCategory;
  entity: string;
  headline: string;
  link: string;
  source: string;
  timestamp: string;
};

type OptionsAnalyticsRow = {
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

type OptionsStrikeLevel = {
  strike: number;
  oi: number;
};

type OptionsAnalytics = {
  symbol: SupportedOptionSymbol;
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
  dataSource: {
    provider: string;
    mode: 'mock';
    supportsLiveIndianIndexOptions: false;
    banner: string;
  };
  rows: OptionsAnalyticsRow[];
};

// In-memory fallback if Redis is not available
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
      market: [],
      company: [],
      sector: [],
      updatedAt: null,
      refreshIntervalSeconds: 60,
  };
  private lastNewsMinuteKey: string | null = null;
  
  public healthStatus = {
      apiConnected: true, // yahoo-finance is always "connected" initially
      wsConnected: false, // no websocket
      lastTickTime: null as string | null,
      redisConnected: false,
      errorMessage: null as string | null,
  };

  private latestData: Record<string, any> = {};

  private symbolMap: Record<string, string> = {
      'NIFTY': '^NSEI',
      'BANKNIFTY': '^NSEBANK',
      'SENSEX': '^BSESN',
      'INDIA VIX': '^INDIAVIX',
      'RELIANCE': 'RELIANCE.NS',
      'HDFCBANK': 'HDFCBANK.NS',
      'TCS': 'TCS.NS',
  };

  private reverseMap: Record<string, string> = {};
  private readonly signalSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'HDFCBANK', 'TCS'] as const;

  constructor(ai: GoogleGenAI | null = null) {
    this.ai = ai;
    this.redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new InMemoryCache();
    if (this.redis instanceof Redis) {
        this.redis.on('connect', () => this.healthStatus.redisConnected = true);
        this.redis.on('error', () => this.healthStatus.redisConnected = false);
    } else {
        this.healthStatus.redisConnected = true; // In-memory
    }
    
    // Create reverse map lookup
    for (const [key, val] of Object.entries(this.symbolMap)) {
        this.reverseMap[val] = key;
    }

    // Initialize polling
    this.pollData();
    setInterval(() => this.pollData(), 30000); // 30 seconds
  }

  public getLatestData() {
      return this.latestData;
  }

  private async pollData() {
      try {
          const timestamp = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
          this.healthStatus.lastTickTime = timestamp;

          for (const [key, symbol] of Object.entries(this.symbolMap)) {
              try {
                  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`);
                  if (!res.ok) continue;
                  const data = await res.json();
                  if (!data.chart || !data.chart.result || data.chart.result.length === 0) continue;
                  
                  const meta = data.chart.result[0].meta;
                  const quote = data.chart.result[0].indicators?.quote?.[0] || {};
                  
                  const ltp = meta.regularMarketPrice || 0;
                  const close = meta.chartPreviousClose || 0;
                  
                  // Extract High/Low/Open from latest quote array if available
                  const highs = quote.high || [];
                  const lows = quote.low || [];
                  const opens = quote.open || [];
                  const vols = quote.volume || [];
                  
                  const lastIdx = highs.length > 0 ? highs.length - 1 : 0;
                  const high = highs[lastIdx] || ltp;
                  const low = lows[lastIdx] || ltp;
                  const open = opens[lastIdx] || ltp;
                  const volume = vols[lastIdx] || 0;

                  const change = meta.regularMarketPrice ? meta.regularMarketPrice - close : 0;
                  const change_pct = close > 0 ? (change / close) * 100 : 0;

                  this.latestData[key] = {
                      symbol: key,
                      ltp,
                      open,
                      high,
                      low,
                      close,
                      volume,
                      change: parseFloat(change.toFixed(2)),
                      change_pct: parseFloat(change_pct.toFixed(2))
                  };
              } catch (e) {
                  console.error(`Failed to fetch Yahoo Finance for ${symbol}:`, e.message);
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
          console.error("Yahoo Finance Poll Error:", err);
          this.healthStatus.apiConnected = false;
          this.healthStatus.errorMessage = err.message;
      }
  }

  get_market_status(): { status: 'OPEN' | 'CLOSED', serverTime: string } {
    const now = new Date();
    const zonedTime = toZonedTime(now, TIMEZONE);
    const hour = zonedTime.getHours();
    const minute = zonedTime.getMinutes();
    const day = zonedTime.getDay(); // 0 is Sunday, 6 is Saturday

    const serverTime = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

    if (day === 0 || day === 6) {
      return { status: 'CLOSED', serverTime };
    }

    const timeInMinutes = hour * 60 + minute;
    // Market opens at 9:15 AM (555 mins) and closes at 3:30 PM (930 mins)
    if (timeInMinutes >= 555 && timeInMinutes < 930) {
      return { status: 'OPEN', serverTime };
    }

    return { status: 'CLOSED', serverTime };
  }

  private decodeXmlEntities(value: string) {
      return value
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
  }

  private extractXmlTag(block: string, tagName: string) {
      const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
      return match ? this.decodeXmlEntities(match[1]) : '';
  }

  private buildNewsSource(link: string, fallbackSource: string) {
      if (fallbackSource) {
          return fallbackSource;
      }

      try {
          const url = new URL(link);
          return url.hostname.replace('www.', '');
      } catch {
          return 'Unknown Source';
      }
  }

  private parseRssFeed(xml: string, category: NewsCategory, entity: string) {
      const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

      return items.slice(0, 6).map((item, index) => {
          const headline = this.extractXmlTag(item, 'title');
          const link = this.extractXmlTag(item, 'link');
          const timestamp = this.extractXmlTag(item, 'pubDate') || formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
          const source = this.buildNewsSource(link, this.extractXmlTag(item, 'source'));

          return {
              id: `${category}-${entity}-${index}-${headline}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120),
              category,
              entity,
              headline,
              link,
              source,
              timestamp,
          } satisfies RawNewsItem;
      }).filter((item) => item.headline && item.link);
  }

  private getNewsFeeds() {
      return [
          {
              category: 'MARKET' as const,
              entity: 'Indian Market',
              url: 'https://news.google.com/rss/search?q=Indian%20stock%20market%20OR%20NIFTY%20OR%20BANKNIFTY%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen',
          },
          {
              category: 'COMPANY' as const,
              entity: 'Tracked Companies',
              url: 'https://news.google.com/rss/search?q=RELIANCE%20OR%20HDFCBANK%20OR%20TCS%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen',
          },
          {
              category: 'SECTOR' as const,
              entity: 'Key Sectors',
              url: 'https://news.google.com/rss/search?q=India%20banking%20sector%20OR%20IT%20sector%20OR%20energy%20sector%20stocks%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen',
          },
      ];
  }

  private inferSentimentFromHeadline(headline: string): NewsArticle['sentiment'] {
      const normalized = headline.toLowerCase();
      const bullishKeywords = ['surge', 'rally', 'gain', 'beats', 'upgrade', 'strong', 'growth', 'buy', 'profit jumps', 'record'];
      const bearishKeywords = ['falls', 'drop', 'slump', 'downgrade', 'misses', 'weak', 'warning', 'cuts', 'loss', 'selloff'];

      const bullishHits = bullishKeywords.filter((keyword) => normalized.includes(keyword)).length;
      const bearishHits = bearishKeywords.filter((keyword) => normalized.includes(keyword)).length;

      if (bullishHits > bearishHits) {
          return 'BULLISH';
      }

      if (bearishHits > bullishHits) {
          return 'BEARISH';
      }

      return 'NEUTRAL';
  }

  private fallbackAnalyzeNews(items: RawNewsItem[]): NewsArticle[] {
      return items.map((item) => {
          const sentiment = this.inferSentimentFromHeadline(item.headline);
          const sentimentScore = sentiment === 'BULLISH' ? 68 : sentiment === 'BEARISH' ? 34 : 50;
          const impactScore = item.category === 'MARKET' ? 78 : item.category === 'SECTOR' ? 64 : 58;

          return {
              ...item,
              sentiment,
              sentimentScore,
              impactScore,
              aiSummary: `${item.headline}. This headline is categorized as ${sentiment.toLowerCase()} for ${item.entity.toLowerCase()} based on its market tone and likely trading relevance.`,
          };
      });
  }

  private async analyzeNewsWithGemini(items: RawNewsItem[]): Promise<NewsArticle[]> {
      if (!this.ai || items.length === 0) {
          return this.fallbackAnalyzeNews(items);
      }

      const prompt = [
          'You are an Indian stock market news intelligence engine.',
          'Analyze each news item and return strict JSON only as an array.',
          'For every item return: id, sentiment (BULLISH|BEARISH|NEUTRAL), sentimentScore (0-100), impactScore (0-100), aiSummary.',
          'aiSummary must be 1-2 concise sentences describing why the story matters for trading or investing.',
          'Base your analysis only on the provided headline, category, entity, and source.',
          JSON.stringify(items),
      ].join('\n');

      try {
          const response = await this.ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });

          const rawText = response.text || '[]';
          const jsonText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(jsonText) as Array<{
              id: string;
              sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
              sentimentScore: number;
              impactScore: number;
              aiSummary: string;
          }>;

          const analysisMap = new Map(parsed.map((item) => [item.id, item]));
          return items.map((item) => {
              const analysis = analysisMap.get(item.id);
              if (!analysis) {
                  return this.fallbackAnalyzeNews([item])[0];
              }

              return {
                  ...item,
                  sentiment: analysis.sentiment,
                  sentimentScore: Math.min(100, Math.max(0, Math.round(analysis.sentimentScore))),
                  impactScore: Math.min(100, Math.max(0, Math.round(analysis.impactScore))),
                  aiSummary: analysis.aiSummary?.trim() || this.fallbackAnalyzeNews([item])[0].aiSummary,
              };
          });
      } catch (error: any) {
          console.error('Gemini news analysis failed:', error.message || error);
          return this.fallbackAnalyzeNews(items);
      }
  }

  private async refreshNews(newsMinuteKey: string) {
      const categoryBuckets: NewsIntelligencePayload = {
          market: [],
          company: [],
          sector: [],
          updatedAt: null,
          refreshIntervalSeconds: 60,
      };

      for (const feed of this.getNewsFeeds()) {
          try {
              const response = await fetch(feed.url, {
                  headers: {
                      'User-Agent': 'Mozilla/5.0 TradeMindAI News Intelligence',
                  },
              });
              if (!response.ok) {
                  throw new Error(`News feed request failed for ${feed.category}`);
              }

              const xml = await response.text();
              const parsed = this.parseRssFeed(xml, feed.category, feed.entity);
              const analyzed = await this.analyzeNewsWithGemini(parsed.slice(0, 4));

              if (feed.category === 'MARKET') {
                  categoryBuckets.market = analyzed;
              } else if (feed.category === 'COMPANY') {
                  categoryBuckets.company = analyzed;
              } else {
                  categoryBuckets.sector = analyzed;
              }
          } catch (error: any) {
              console.error(`Failed to refresh ${feed.category} news:`, error.message || error);
          }
      }

      categoryBuckets.updatedAt = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
      this.latestNews = categoryBuckets;
      this.lastNewsMinuteKey = newsMinuteKey;
  }

  private round(value: number) {
      return parseFloat(value.toFixed(2));
  }

  private isFiniteNumber(value: number | null | undefined): value is number {
      return typeof value === 'number' && Number.isFinite(value);
  }

  private calculateEMA(values: number[], period: number) {
      if (values.length === 0) {
          return [];
      }

      const multiplier = 2 / (period + 1);
      const emaValues: number[] = [values[0]];

      for (let i = 1; i < values.length; i += 1) {
          emaValues.push(values[i] * multiplier + emaValues[i - 1] * (1 - multiplier));
      }

      return emaValues;
  }

  private calculateRSI(values: number[], period = 14) {
      if (values.length <= period) {
          return new Array(values.length).fill(50);
      }

      const rsi = new Array(values.length).fill(50);
      let gains = 0;
      let losses = 0;

      for (let i = 1; i <= period; i += 1) {
          const delta = values[i] - values[i - 1];
          if (delta >= 0) {
              gains += delta;
          } else {
              losses += Math.abs(delta);
          }
      }

      let averageGain = gains / period;
      let averageLoss = losses / period;
      rsi[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

      for (let i = period + 1; i < values.length; i += 1) {
          const delta = values[i] - values[i - 1];
          const gain = Math.max(delta, 0);
          const loss = Math.max(-delta, 0);
          averageGain = (averageGain * (period - 1) + gain) / period;
          averageLoss = (averageLoss * (period - 1) + loss) / period;
          rsi[i] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
      }

      return rsi;
  }

  private calculateMACD(values: number[]) {
      const ema12 = this.calculateEMA(values, 12);
      const ema26 = this.calculateEMA(values, 26);
      const macd = values.map((_, index) => ema12[index] - ema26[index]);
      const signal = this.calculateEMA(macd, 9);
      const histogram = macd.map((value, index) => value - signal[index]);

      return { macd, signal, histogram };
  }

  private calculateVWAP(candles: IntradayCandle[]) {
      let cumulativePriceVolume = 0;
      let cumulativeVolume = 0;

      return candles.map((candle) => {
          const typicalPrice = (candle.high + candle.low + candle.close) / 3;
          cumulativePriceVolume += typicalPrice * candle.volume;
          cumulativeVolume += Math.max(candle.volume, 1);
          return cumulativePriceVolume / cumulativeVolume;
      });
  }

  private async fetchIntradayCandles(symbolKey: string): Promise<IntradayCandle[]> {
      const yahooSymbol = this.symbolMap[symbolKey];
      if (!yahooSymbol) {
          return [];
      }

      const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m&includePrePost=false`
      );

      if (!response.ok) {
          throw new Error(`Intraday request failed for ${symbolKey}`);
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      const closes = result?.indicators?.adjclose?.[0]?.adjclose || quote?.close || [];
      const opens = quote?.open || [];
      const highs = quote?.high || [];
      const lows = quote?.low || [];
      const volumes = quote?.volume || [];

      const candles: IntradayCandle[] = [];
      for (let i = 0; i < closes.length; i += 1) {
          const close = closes[i];
          const open = opens[i];
          const high = highs[i];
          const low = lows[i];
          const volume = volumes[i];

          if (
              this.isFiniteNumber(close) &&
              this.isFiniteNumber(open) &&
              this.isFiniteNumber(high) &&
              this.isFiniteNumber(low) &&
              this.isFiniteNumber(volume)
          ) {
              candles.push({
                  open,
                  high,
                  low,
                  close,
                  volume: Math.max(volume, 1),
              });
          }
      }

      return candles.slice(-180);
  }

  private buildQuantSignal(symbol: string, candles: IntradayCandle[]): QuantSignal | null {
      if (candles.length < 60) {
          return null;
      }

      const closes = candles.map((candle) => candle.close);
      const ema9Series = this.calculateEMA(closes, 9);
      const ema21Series = this.calculateEMA(closes, 21);
      const ema50Series = this.calculateEMA(closes, 50);
      const rsiSeries = this.calculateRSI(closes, 14);
      const macdSeries = this.calculateMACD(closes);
      const vwapSeries = this.calculateVWAP(candles);

      const lastIndex = closes.length - 1;
      const price = closes[lastIndex];
      const ema9 = ema9Series[lastIndex];
      const ema21 = ema21Series[lastIndex];
      const ema50 = ema50Series[lastIndex];
      const rsi = rsiSeries[lastIndex];
      const macd = macdSeries.macd[lastIndex];
      const macdSignal = macdSeries.signal[lastIndex];
      const macdHistogram = macdSeries.histogram[lastIndex];
      const vwap = vwapSeries[lastIndex];
      const recentCandles = candles.slice(-20);
      const recentLow = Math.min(...recentCandles.map((candle) => candle.low));
      const recentHigh = Math.max(...recentCandles.map((candle) => candle.high));

      let bullishScore = 0;
      let bearishScore = 0;
      const reasons: string[] = [];

      if (ema9 > ema21 && ema21 > ema50) {
          bullishScore += 28;
          reasons.push('EMA 9 is above EMA 21 and EMA 50, confirming bullish trend alignment.');
      } else if (ema9 < ema21 && ema21 < ema50) {
          bearishScore += 28;
          reasons.push('EMA 9 is below EMA 21 and EMA 50, confirming bearish trend alignment.');
      } else {
          reasons.push('EMA alignment is mixed, so trend conviction is moderate.');
      }

      if (price > vwap) {
          bullishScore += 18;
          reasons.push('Price is holding above VWAP, showing intraday buying control.');
      } else if (price < vwap) {
          bearishScore += 18;
          reasons.push('Price is trading below VWAP, showing intraday selling pressure.');
      }

      if (rsi >= 58 && rsi <= 72) {
          bullishScore += 16;
          reasons.push(`RSI at ${this.round(rsi)} supports bullish momentum without being overstretched.`);
      } else if (rsi <= 42 && rsi >= 28) {
          bearishScore += 16;
          reasons.push(`RSI at ${this.round(rsi)} reflects weak momentum and downside pressure.`);
      } else if (rsi > 72) {
          bearishScore += 8;
          reasons.push(`RSI at ${this.round(rsi)} is elevated, which increases pullback risk.`);
      } else if (rsi < 28) {
          bullishScore += 8;
          reasons.push(`RSI at ${this.round(rsi)} is deeply oversold, which can support a rebound.`);
      }

      if (macd > macdSignal && macdHistogram > 0) {
          bullishScore += 24;
          reasons.push('MACD remains above the signal line with positive histogram momentum.');
      } else if (macd < macdSignal && macdHistogram < 0) {
          bearishScore += 24;
          reasons.push('MACD remains below the signal line with negative histogram momentum.');
      }

      if (price > ema9) {
          bullishScore += 14;
          reasons.push('Price is still above EMA 9, preserving short-term upside momentum.');
      } else if (price < ema9) {
          bearishScore += 14;
          reasons.push('Price is below EMA 9, indicating near-term momentum loss.');
      }

      const scoreDifference = bullishScore - bearishScore;
      let action: SignalAction = 'HOLD';

      if (bullishScore >= 58 && scoreDifference >= 20) {
          action = 'BUY';
      } else if (bearishScore >= 58 && scoreDifference <= -20) {
          action = 'SELL';
      }

      const dominantScore = Math.max(bullishScore, bearishScore);
      const confidence = action === 'HOLD'
          ? Math.min(78, Math.max(52, Math.round(52 + Math.abs(scoreDifference) * 0.45)))
          : Math.min(95, Math.max(60, Math.round(60 + dominantScore * 0.22 + Math.abs(scoreDifference) * 0.2)));

      let stopLoss = 0;
      let target1 = 0;
      let target2 = 0;
      let target3 = 0;

      if (action === 'BUY') {
          const supports = [ema21, ema50, vwap, recentLow].filter((value) => value < price);
          const support = supports.length > 0 ? Math.max(...supports) : price * 0.992;
          stopLoss = support * 0.998;
          if (stopLoss >= price) {
              stopLoss = price * 0.992;
          }

          const risk = Math.max(price - stopLoss, price * 0.003);
          target1 = price + risk * 1.2;
          target2 = price + risk * 2;
          target3 = price + risk * 3;
      } else if (action === 'SELL') {
          const resistances = [ema21, ema50, vwap, recentHigh].filter((value) => value > price);
          const resistance = resistances.length > 0 ? Math.min(...resistances) : price * 1.008;
          stopLoss = resistance * 1.002;
          if (stopLoss <= price) {
              stopLoss = price * 1.008;
          }

          const risk = Math.max(stopLoss - price, price * 0.003);
          target1 = price - risk * 1.2;
          target2 = price - risk * 2;
          target3 = price - risk * 3;
      }

      const explanation = action === 'BUY'
          ? `${symbol} prints a BUY setup on the 1-minute quant engine because trend, momentum, and VWAP participation are aligned to the upside.`
          : action === 'SELL'
              ? `${symbol} prints a SELL setup on the 1-minute quant engine because trend, momentum, and VWAP positioning are aligned to the downside.`
              : `${symbol} remains on HOLD because the indicator stack is mixed and the engine does not see enough edge for a directional trade.`;

      return {
          symbol,
          action,
          confidence,
          entry: this.round(price),
          stopLoss: this.round(stopLoss),
          target1: this.round(target1),
          target2: this.round(target2),
          target3: this.round(target3),
          explanation,
          reason: reasons.slice(0, 4),
          timestamp: formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
          timeframe: '1m',
          indicators: {
              ema9: this.round(ema9),
              ema21: this.round(ema21),
              ema50: this.round(ema50),
              rsi: this.round(rsi),
              macd: this.round(macd),
              macdSignal: this.round(macdSignal),
              vwap: this.round(vwap),
          },
      };
  }

  private async refreshSignals(signalMinuteKey: string) {
      const signals: QuantSignal[] = [];

      for (const symbol of this.signalSymbols) {
          try {
              const candles = await this.fetchIntradayCandles(symbol);
              const signal = this.buildQuantSignal(symbol, candles);
              if (signal) {
                  signals.push(signal);
              }
          } catch (error: any) {
              console.error(`Failed to build quant signal for ${symbol}:`, error.message || error);
          }
      }

      this.latestSignals = signals.sort((left, right) => right.confidence - left.confidence);
      this.signalUpdatedAt = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
      this.lastSignalMinuteKey = signalMinuteKey;
  }

  private getOptionConfig(symbol: string): { symbol: SupportedOptionSymbol; strikeStep: number; defaultSpot: number; baseOi: number; baseIv: number } {
      const normalized = symbol.trim().toUpperCase();

      switch (normalized) {
          case 'NIFTY':
              return { symbol: 'NIFTY', strikeStep: 50, defaultSpot: 24500, baseOi: 125000, baseIv: 14.5 };
          case 'BANKNIFTY':
              return { symbol: 'BANKNIFTY', strikeStep: 100, defaultSpot: 54000, baseOi: 98000, baseIv: 17.8 };
          default:
              throw new Error('Options analytics are currently supported for NIFTY and BANKNIFTY only.');
      }
  }

  private deterministicNoise(symbol: string, strike: number, seedOffset = 0) {
      const base = [...symbol].reduce((acc, char) => acc + char.charCodeAt(0), 0) + strike + seedOffset;
      return ((Math.sin(base) + 1) / 2);
  }

  private calculateMaxPain(rows: OptionsAnalyticsRow[]) {
      let bestStrike = rows[0]?.strike || 0;
      let bestPain = Number.POSITIVE_INFINITY;

      for (const candidate of rows) {
          const pain = rows.reduce((total, row) => {
              const callPain = Math.max(0, candidate.strike - row.strike) * row.ceOi;
              const putPain = Math.max(0, row.strike - candidate.strike) * row.peOi;
              return total + callPain + putPain;
          }, 0);

          if (pain < bestPain) {
              bestPain = pain;
              bestStrike = candidate.strike;
          }
      }

      return bestStrike;
  }

  async get_options_data(symbol: string): Promise<OptionsAnalytics> {
      const config = this.getOptionConfig(symbol);
      const marketSnapshot = this.latestData[config.symbol];
      const spot = marketSnapshot?.ltp || config.defaultSpot;
      const strikeStep = config.strikeStep;
      const atmStrike = Math.round(spot / strikeStep) * strikeStep;
      const rows: OptionsAnalyticsRow[] = [];

      for (let i = -6; i <= 6; i += 1) {
          const strike = atmStrike + i * strikeStep;
          const distance = Math.abs(i);
          const callBias = Math.max(0, i);
          const putBias = Math.max(0, -i);
          const callWallBoost = strike === atmStrike + strikeStep * 2 ? 1.35 : strike === atmStrike + strikeStep * 3 ? 1.18 : 1;
          const putWallBoost = strike === atmStrike - strikeStep * 2 ? 1.4 : strike === atmStrike - strikeStep * 3 ? 1.2 : 1;
          const baseNoise = this.deterministicNoise(config.symbol, strike);
          const callNoise = this.deterministicNoise(config.symbol, strike, 13);
          const putNoise = this.deterministicNoise(config.symbol, strike, 29);

          const ceOi = Math.round(
              (config.baseOi * (1.05 - distance * 0.03) + callBias * config.baseOi * 0.24 + baseNoise * 12000) * callWallBoost
          );
          const peOi = Math.round(
              (config.baseOi * (1.04 - distance * 0.03) + putBias * config.baseOi * 0.24 + putNoise * 12000) * putWallBoost
          );

          const ceOiChange = Math.round((ceOi * (0.018 + callNoise * 0.09)) * (i >= 0 ? 1 : 0.7));
          const peOiChange = Math.round((peOi * (0.018 + putNoise * 0.09)) * (i <= 0 ? 1 : 0.7));
          const ceVolume = Math.round(ceOi * (0.28 + callNoise * 0.22));
          const peVolume = Math.round(peOi * (0.28 + putNoise * 0.22));
          const callIntrinsic = Math.max(0, spot - strike);
          const putIntrinsic = Math.max(0, strike - spot);
          const callTimeValue = Math.max(strikeStep * 0.35, (6 - distance) * strikeStep * 0.22 + callNoise * strikeStep * 0.18);
          const putTimeValue = Math.max(strikeStep * 0.35, (6 - distance) * strikeStep * 0.22 + putNoise * strikeStep * 0.18);
          const ceLtp = parseFloat((callIntrinsic + callTimeValue).toFixed(2));
          const peLtp = parseFloat((putIntrinsic + putTimeValue).toFixed(2));
          const ceIv = parseFloat((config.baseIv + distance * 0.42 + callNoise * 1.6).toFixed(2));
          const peIv = parseFloat((config.baseIv + distance * 0.45 + putNoise * 1.6).toFixed(2));
          const pcr = parseFloat((peOi / Math.max(ceOi, 1)).toFixed(2));
          const totalOi = ceOi + peOi;

          rows.push({
              strike,
              ceOi,
              peOi,
              ceOiChange,
              peOiChange,
              ceVolume,
              peVolume,
              ceLtp,
              peLtp,
              ceIv,
              peIv,
              pcr,
              totalOi,
              heat: 0,
          });
      }

      const highestTotalOi = Math.max(...rows.map((row) => row.totalOi), 1);
      rows.forEach((row) => {
          row.heat = parseFloat((row.totalOi / highestTotalOi).toFixed(2));
      });

      const totalCeOi = rows.reduce((sum, row) => sum + row.ceOi, 0);
      const totalPeOi = rows.reduce((sum, row) => sum + row.peOi, 0);
      const pcr = parseFloat((totalPeOi / Math.max(totalCeOi, 1)).toFixed(2));
      const highestCallOiStrikes = [...rows]
          .sort((a, b) => b.ceOi - a.ceOi)
          .slice(0, 3)
          .map((row) => ({ strike: row.strike, oi: row.ceOi }));
      const highestPutOiStrikes = [...rows]
          .sort((a, b) => b.peOi - a.peOi)
          .slice(0, 3)
          .map((row) => ({ strike: row.strike, oi: row.peOi }));
      const maxPain = this.calculateMaxPain(rows);

      return {
          symbol: config.symbol,
          spot: parseFloat(spot.toFixed(2)),
          atmStrike,
          strikeStep,
          updatedAt: formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
          refreshIntervalSeconds: 60,
          pcr,
          maxPain,
          totalCeOi,
          totalPeOi,
          highestCallOiStrikes,
          highestPutOiStrikes,
          dataSource: {
              provider: 'TradeMind Synthetic Options Analytics',
              mode: 'mock',
              supportsLiveIndianIndexOptions: false,
              banner: 'Development data: Yahoo Finance spot prices are live, but Indian index option-chain rows are synthetic mock analytics derived from spot and deterministic market structure heuristics.',
          },
          rows,
      };
  }

  async stream_market_data() {
      const status = this.get_market_status();
      const payload: any = {
          type: "MARKET_UPDATE",
          status: status.status,
          serverTime: status.serverTime,
          signalUpdatedAt: this.signalUpdatedAt,
          signalRefreshIntervalSeconds: 60,
          signals: this.latestSignals,
          news: this.latestNews,
          error: this.healthStatus.errorMessage,
          health: this.healthStatus
      };

      try {
          let dataObj = this.latestData;
          if (Object.keys(dataObj).length === 0) {
              const cached = await this.redis.get('yahoo_latest_market_data');
              if (cached) dataObj = JSON.parse(cached);
          }

          payload.nifty = dataObj['NIFTY'] || null;
          payload.banknifty = dataObj['BANKNIFTY'] || null;
          payload.sensex = dataObj['SENSEX'] || null;
          payload.vix = dataObj['INDIA VIX'] || null;
          
          payload.stocks = [];
          for (const sym of ['RELIANCE', 'HDFCBANK', 'TCS']) {
              if (dataObj[sym]) {
                  payload.stocks.push(dataObj[sym]);
              }
          }
      } catch (err: any) {
          payload.error = err.message || "Failed to fetch market data.";
      }
      
      return payload;
  }
}
