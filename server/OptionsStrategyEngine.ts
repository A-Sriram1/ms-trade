/**
 * OptionsStrategyEngine
 * ──────────────────────────────────────────────────────────────────────────────
 * Derives options trade recommendations from:
 *   • Underlying signal  (direction, entry, SL, targets, indicators, ATR)
 *   • Options chain data (spot, ATM, PCR, maxPain, OI, IV, premium)
 *   • India VIX          (overall market volatility level)
 *
 * Data-quality transparency contract
 * ─────────────────────────────────────
 *  - isLiveNseData is always false until a broker / NSE API is wired.
 *  - If spot price is unavailable → canGenerate = false, reason stated.
 *  - If chain data is unavailable → canGenerate = false, reason stated.
 *  - No synthetic / hallucinated values are produced for premium or OI.
 *  - IV comes from the chain row at the recommended strike (model-estimated).
 */

import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

// ─── Shared types (mirrors src/types.ts — kept local to avoid circular deps) ─

export type OptionType        = 'CE' | 'PE';
export type StrikeSelection   = 'ATM' | 'ITM-1' | 'ITM-2' | 'OTM-1' | 'OTM-2';
export type OptionsRiskLevel  = 'Low' | 'Medium' | 'High';
export type ExpirySuggestion  = 'Current Weekly' | 'Next Weekly' | 'Current Monthly' | 'Next Monthly';

export type OptionsStrategyDataQuality = {
  spotAvailable: boolean;
  chainAvailable: boolean;
  ivAvailable: boolean;
  oiAvailable: boolean;
  signalAvailable: boolean;
  isLiveNseData: boolean;
  dataQualityNote: string;
};

export type OptionsStrategyRecommendation = {
  symbol: string;
  optionType: OptionType;
  recommendedStrike: number;
  strikeSelection: StrikeSelection;
  expiry: ExpirySuggestion;
  entryPremium: number;
  stopLossPremium: number;
  stopLossPercent: number;
  target1Premium: number;
  target2Premium: number;
  target3Premium: number;
  expectedPremiumMove: number;
  confidence: number;
  riskLevel: OptionsRiskLevel;
  holdingTime: string;
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPain: number;
  impliedVolatility: number;
  oiAtStrike: number;
  oiChangeAtStrike: number;
  volumeAtStrike: number;
  technicalReason: string;
  optionChainReason: string;
  riskWarning: string;
  dataQuality: OptionsStrategyDataQuality;
  timestamp: string;
  canGenerate: boolean;
  cannotGenerateReason?: string;
};

// ─── Inputs ───────────────────────────────────────────────────────────────────

export type SignalInput = {
  symbol: string;
  action: string;   // 'STRONG BUY' | 'BUY' | 'WAIT' | 'SELL' | 'STRONG SELL' | 'EXIT'
  confidence: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  tradeDuration: string;
  indicators: {
    ema9: number; ema21: number; ema50: number;
    rsi: number; macd: number; macdSignal: number;
    vwap: number; atr: number; adx: number; volumeRatio: number;
  };
};

export type ChainRow = {
  strike: number;
  ceOi: number;  peOi: number;
  ceOiChange: number; peOiChange: number;
  ceVolume: number; peVolume: number;
  ceLtp: number; peLtp: number;
  ceIv: number;  peIv: number;
  pcr: number;
};

export type ChainInput = {
  symbol: string;
  spot: number;
  atmStrike: number;
  strikeStep: number;
  pcr: number;
  maxPain: number;
  totalCeOi: number;
  totalPeOi: number;
  rows: ChainRow[];
};

// ─── Helper: round to 2dp ─────────────────────────────────────────────────────

function r2(v: number) { return parseFloat(v.toFixed(2)); }

// ─── Helper: find the chain row closest to a strike ──────────────────────────

function rowAtStrike(rows: ChainRow[], strike: number): ChainRow | null {
  if (!rows.length) return null;
  return rows.reduce((best, row) =>
    Math.abs(row.strike - strike) < Math.abs(best.strike - strike) ? row : best
  );
}

// ─── Helper: choose strike offset based on signal strength & IV ──────────────
//
//  STRONG BUY/SELL  → ATM (maximum delta, best premium tracking)
//  BUY/SELL         → ATM or OTM-1 depending on IV
//  High IV env      → prefer ATM (OTM premium erodes fast)
//  Low  IV env      → OTM-1 acceptable (cheaper, wider R:R)

function chooseStrikeOffset(
  action: string,
  iv: number,         // ATM IV %
  confidence: number
): { strikeSelection: StrikeSelection; strikeDelta: number } {
  const highIv = iv > 18;
  if (action === 'STRONG BUY' || action === 'STRONG SELL') {
    return { strikeSelection: 'ATM', strikeDelta: 0 };
  }
  if (confidence >= 80) {
    return { strikeSelection: 'ATM', strikeDelta: 0 };
  }
  if (highIv) {
    // In high IV, prefer slightly ITM for better delta & less IV risk
    return { strikeSelection: 'ITM-1', strikeDelta: -1 };  // caller interprets sign per direction
  }
  return { strikeSelection: 'OTM-1', strikeDelta: 1 };
}

// ─── Helper: option premium targets using delta approximation ─────────────────
//
//  We use a simplified delta-based model:
//    delta(ATM)  ≈ 0.50
//    delta(OTM1) ≈ 0.35
//    delta(ITM1) ≈ 0.65
//
//  Premium move = delta × (underlying move in points)
//  We do NOT use Black-Scholes (requires risk-free rate, exact DTE).
//  This is clearly marked in dataQualityNote.

function estimatePremiumMove(
  strikeSelection: StrikeSelection,
  underlyingMove: number   // points
): number {
  const deltaMap: Record<StrikeSelection, number> = {
    'ATM':    0.50,
    'OTM-1':  0.35,
    'OTM-2':  0.22,
    'ITM-1':  0.65,
    'ITM-2':  0.78,
  };
  return r2(Math.abs(underlyingMove) * deltaMap[strikeSelection]);
}

// ─── Helper: expiry suggestion ───────────────────────────────────────────────
//
//  Intraday signals: current weekly
//  Scalp signals:    current weekly
//  Swing signals:    current monthly or next weekly

function suggestExpiry(tradeDuration: string, adx: number): ExpirySuggestion {
  const isSwing = /swing|day|overnight/i.test(tradeDuration);
  if (isSwing && adx > 30) return 'Current Monthly';
  if (isSwing) return 'Next Weekly';
  return 'Current Weekly';
}

// ─── Helper: PCR-based options chain confirmation ────────────────────────────
//
//  PCR > 1.2  → Put heavy → markets expect support → bullish lean
//  PCR < 0.8  → Call heavy → resistance building → bearish lean
//  maxPain interpretation:
//    Spot > maxPain → bullish, expects gravity pull up
//    Spot < maxPain → bearish, expect upside to maxPain

function chainConfirmsBullish(chain: ChainInput): { confirms: boolean; reason: string } {
  const reasons: string[] = [];
  let bullishPoints = 0;

  if (chain.pcr >= 1.2) { bullishPoints++; reasons.push(`PCR ${chain.pcr.toFixed(2)} (put heavy — support building)`); }
  else if (chain.pcr <= 0.8) { bullishPoints--; reasons.push(`PCR ${chain.pcr.toFixed(2)} (call heavy — resistance building)`); }
  else { reasons.push(`PCR ${chain.pcr.toFixed(2)} (balanced)`); }

  const distFromMaxPain = chain.spot - chain.maxPain;
  if (distFromMaxPain > 0) { bullishPoints++; reasons.push(`Spot above Max Pain (${chain.maxPain}) — bullish gravity`); }
  else { bullishPoints--; reasons.push(`Spot below Max Pain (${chain.maxPain}) — gravitational pull upward`); }

  // Highest CE OI acts as resistance, highest PE OI as support
  const topCE = [...chain.rows].sort((a, b) => b.ceOi - a.ceOi)[0];
  const topPE = [...chain.rows].sort((a, b) => b.peOi - a.peOi)[0];
  if (topCE && topPE) {
    if (chain.spot < topCE.strike) { reasons.push(`CE wall at ${topCE.strike} — watch resistance`); }
    if (chain.spot > topPE.strike) { reasons.push(`PE support at ${topPE.strike} — floor established`); bullishPoints++; }
  }

  return { confirms: bullishPoints > 0, reason: reasons.join('; ') };
}

function chainConfirmsBearish(chain: ChainInput): { confirms: boolean; reason: string } {
  const { confirms, reason } = chainConfirmsBullish(chain);
  return { confirms: !confirms, reason };
}

// ─── Helper: risk level ───────────────────────────────────────────────────────

function calcRiskLevel(iv: number, adx: number, confidence: number): OptionsRiskLevel {
  if (iv > 22 || adx < 15 || confidence < 65) return 'High';
  if (iv > 16 || adx < 22 || confidence < 78) return 'Medium';
  return 'Low';
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function buildOptionsStrategy(
  signal: SignalInput,
  chain: ChainInput | null,
  vixLtp: number | null
): OptionsStrategyRecommendation {

  const timestamp = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  const action = signal.action;

  // ── Data quality assessment ─────────────────────────────────────────────────
  const dq: OptionsStrategyDataQuality = {
    spotAvailable:   chain != null && chain.spot > 0,
    chainAvailable:  chain != null && chain.rows.length > 0,
    ivAvailable:     chain != null && chain.rows.some(r => r.ceIv > 0 || r.peIv > 0),
    oiAvailable:     chain != null && chain.rows.some(r => r.ceOi > 0 || r.peOi > 0),
    signalAvailable: signal.entry > 0 && signal.confidence > 0,
    isLiveNseData:   false,   // model-generated chain — honest declaration
    dataQualityNote: [
      'Options chain is model-generated from spot price and volatility curves.',
      'OI data is NOT live NSE data. For live OI, connect a broker API.',
      'Premium targets use delta-approximation, not Black-Scholes.',
      'IV derived from chain model at recommended strike.',
    ].join(' '),
  };

  // ── Guard: insufficient data ────────────────────────────────────────────────
  if (!dq.signalAvailable) {
    return { ...emptyRec(signal.symbol, timestamp, dq), canGenerate: false, cannotGenerateReason: 'Underlying signal data is not available. Recommendation cannot be generated.' };
  }
  if (!dq.spotAvailable || !dq.chainAvailable) {
    return { ...emptyRec(signal.symbol, timestamp, dq), canGenerate: false, cannotGenerateReason: `Options chain data is unavailable for ${signal.symbol}. Only NIFTY and BANKNIFTY are supported. Recommendation cannot be generated.` };
  }
  if (action === 'WAIT' || action === 'EXIT') {
    return { ...emptyRec(signal.symbol, timestamp, dq), canGenerate: false, cannotGenerateReason: `Underlying signal is ${action}. No directional options trade recommended until a clear BUY or SELL signal is generated.` };
  }

  const c = chain!;
  const isBullish = action === 'STRONG BUY' || action === 'BUY';
  const optionType: OptionType = isBullish ? 'CE' : 'PE';

  // ── ATM IV (use ATM row) ─────────────────────────────────────────────────────
  const atmRow = rowAtStrike(c.rows, c.atmStrike);
  const atmIv = atmRow ? (isBullish ? atmRow.ceIv : atmRow.peIv) : 15;

  // ── Choose strike ────────────────────────────────────────────────────────────
  const { strikeSelection, strikeDelta } = chooseStrikeOffset(action, atmIv, signal.confidence);

  // For CE: OTM = higher strike, ITM = lower strike
  // For PE: OTM = lower strike, ITM = higher strike
  const strikeDirection = isBullish ? 1 : -1;
  const strikeMult = strikeDelta * strikeDirection;
  const recommendedStrike = c.atmStrike + strikeMult * c.strikeStep;
  const chainRow = rowAtStrike(c.rows, recommendedStrike);

  if (!chainRow) {
    return { ...emptyRec(signal.symbol, timestamp, dq), canGenerate: false, cannotGenerateReason: 'No chain row found near the recommended strike. Cannot generate premium-based levels.' };
  }

  // ── Entry premium from chain row ─────────────────────────────────────────────
  const entryPremium = isBullish ? chainRow.ceLtp : chainRow.peLtp;
  if (entryPremium <= 0) {
    return { ...emptyRec(signal.symbol, timestamp, dq), canGenerate: false, cannotGenerateReason: 'Premium at the recommended strike is zero or unavailable. Cannot generate options recommendation.' };
  }

  // ── Premium-based SL & targets ───────────────────────────────────────────────
  // SL: 30–40% of entry premium (standard intraday options SL)
  // We don't use a fixed-point SL because options premium decay is non-linear.
  const slPct = action === 'STRONG BUY' || action === 'STRONG SELL' ? 35 : 40;
  const stopLossPremium  = r2(entryPremium * (1 - slPct / 100));

  // Premium move at T1/T2/T3 = delta × underlying point move
  const underlyingMoveT1 = Math.abs(signal.target1 - signal.entry);
  const underlyingMoveT2 = Math.abs(signal.target2 - signal.entry);
  const underlyingMoveT3 = Math.abs(signal.target3 - signal.entry);

  const premMoveT1 = estimatePremiumMove(strikeSelection, underlyingMoveT1);
  const premMoveT2 = estimatePremiumMove(strikeSelection, underlyingMoveT2);
  const premMoveT3 = estimatePremiumMove(strikeSelection, underlyingMoveT3);

  const target1Premium = r2(entryPremium + premMoveT1);
  const target2Premium = r2(entryPremium + premMoveT2);
  const target3Premium = r2(entryPremium + premMoveT3);

  // ── Expiry suggestion ────────────────────────────────────────────────────────
  const expiry = suggestExpiry(signal.tradeDuration, signal.indicators.adx);

  // ── Chain confirmation ────────────────────────────────────────────────────────
  const chainConf = isBullish
    ? chainConfirmsBullish(c)
    : chainConfirmsBearish(c);

  // ── Confidence (base signal confidence, penalise if chain doesn't confirm) ───
  let confidence = signal.confidence;
  if (!chainConf.confirms) confidence = Math.max(40, confidence - 15);
  if (atmIv > 25) confidence = Math.max(40, confidence - 8);   // high IV = uncertain
  confidence = Math.round(confidence);

  // ── Risk level ────────────────────────────────────────────────────────────────
  const riskLevel = calcRiskLevel(atmIv, signal.indicators.adx, confidence);

  // ── Technical reason string ──────────────────────────────────────────────────
  const techReason = [
    `${action} signal on ${signal.symbol}.`,
    `EMA ${signal.indicators.ema9 > signal.indicators.ema21 ? '9 > 21 (bullish stack)' : '9 < 21 (bearish stack)'}.`,
    `RSI ${signal.indicators.rsi.toFixed(1)} — ${signal.indicators.rsi > 60 ? 'momentum zone' : signal.indicators.rsi < 40 ? 'bearish zone' : 'neutral'}.`,
    `ADX ${signal.indicators.adx.toFixed(1)} — ${signal.indicators.adx > 25 ? 'strong trend' : 'weak trend'}.`,
    `VWAP ${signal.entry > signal.indicators.vwap ? 'above' : 'below'} — ${signal.entry > signal.indicators.vwap ? 'bullish' : 'bearish'} bias.`,
    `ATR ${signal.indicators.atr.toFixed(2)} used for underlying SL/target sizing.`,
  ].join(' ');

  // ── Risk warning ──────────────────────────────────────────────────────────────
  const warnings: string[] = ['Options carry significant risk due to time decay (theta) and leverage.'];
  if (atmIv > 20) warnings.push(`High IV (${atmIv.toFixed(1)}%) — premiums are elevated; consider smaller positions.`);
  if (expiry === 'Current Weekly') warnings.push('Weekly expiry increases gamma and theta risk near expiry date.');
  if (!chainConf.confirms) warnings.push('Options chain does not fully confirm the directional signal — reduce position size.');
  if (!dq.isLiveNseData) warnings.push('OI data is model-generated, not live NSE data.');
  const riskWarning = warnings.join(' ');

  return {
    symbol:              signal.symbol,
    optionType,
    recommendedStrike,
    strikeSelection,
    expiry,
    entryPremium,
    stopLossPremium,
    stopLossPercent:     slPct,
    target1Premium,
    target2Premium,
    target3Premium,
    expectedPremiumMove: premMoveT1,
    confidence,
    riskLevel,
    holdingTime:         signal.tradeDuration,
    spotPrice:           c.spot,
    atmStrike:           c.atmStrike,
    pcr:                 c.pcr,
    maxPain:             c.maxPain,
    impliedVolatility:   isBullish ? chainRow.ceIv : chainRow.peIv,
    oiAtStrike:          isBullish ? chainRow.ceOi : chainRow.peOi,
    oiChangeAtStrike:    isBullish ? chainRow.ceOiChange : chainRow.peOiChange,
    volumeAtStrike:      isBullish ? chainRow.ceVolume : chainRow.peVolume,
    technicalReason:     techReason,
    optionChainReason:   chainConf.reason,
    riskWarning,
    dataQuality:         dq,
    timestamp,
    canGenerate:         true,
  };
}

// ─── Empty recommendation shell ───────────────────────────────────────────────

function emptyRec(
  symbol: string,
  timestamp: string,
  dq: OptionsStrategyDataQuality
): OptionsStrategyRecommendation {
  return {
    symbol, optionType: 'CE', recommendedStrike: 0, strikeSelection: 'ATM',
    expiry: 'Current Weekly', entryPremium: 0, stopLossPremium: 0,
    stopLossPercent: 0, target1Premium: 0, target2Premium: 0, target3Premium: 0,
    expectedPremiumMove: 0, confidence: 0, riskLevel: 'High', holdingTime: '—',
    spotPrice: 0, atmStrike: 0, pcr: 0, maxPain: 0, impliedVolatility: 0,
    oiAtStrike: 0, oiChangeAtStrike: 0, volumeAtStrike: 0,
    technicalReason: '', optionChainReason: '', riskWarning: '',
    dataQuality: dq, timestamp, canGenerate: false,
  };
}
