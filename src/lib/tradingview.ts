export const TRADINGVIEW_SYMBOL_MAP = {
  RELIANCE: 'NSE:RELIANCE',
  TCS: 'NSE:TCS',
  INFY: 'NSE:INFY',
  HDFCBANK: 'NSE:HDFCBANK',
  ICICIBANK: 'NSE:ICICIBANK',
  SBIN: 'NSE:SBIN',
  NIFTY: 'NSE:NIFTY',
  BANKNIFTY: 'NSE:BANKNIFTY',
} as const;

const SYMBOL_ALIASES: Record<string, keyof typeof TRADINGVIEW_SYMBOL_MAP> = {
  'NIFTY 50': 'NIFTY',
  NIFTY50: 'NIFTY',
  'BANK NIFTY': 'BANKNIFTY',
};

export type SupportedTradingViewSymbol = keyof typeof TRADINGVIEW_SYMBOL_MAP;

export const SUPPORTED_TRADINGVIEW_SYMBOLS = Object.keys(
  TRADINGVIEW_SYMBOL_MAP
) as SupportedTradingViewSymbol[];

export function normalizeTradingViewLookupSymbol(rawSymbol: string) {
  const normalized = rawSymbol.trim().toUpperCase().replace(/\s+/g, ' ');

  if (!normalized) {
    return '';
  }

  const compact = normalized.replace(/\s+/g, '');

  return SYMBOL_ALIASES[normalized] || SYMBOL_ALIASES[compact] || compact;
}

export function resolveTradingViewSymbol(rawSymbol: string) {
  const requestedSymbol = rawSymbol.trim().toUpperCase() || 'RELIANCE';
  const normalizedSymbol = normalizeTradingViewLookupSymbol(requestedSymbol);
  const resolvedSymbol = TRADINGVIEW_SYMBOL_MAP[normalizedSymbol as SupportedTradingViewSymbol] || null;

  return {
    requestedSymbol,
    normalizedSymbol,
    resolvedSymbol,
    isSupported: Boolean(resolvedSymbol),
    errorMessage: resolvedSymbol
      ? null
      : `Chart unavailable for "${requestedSymbol}". Supported symbols: ${SUPPORTED_TRADINGVIEW_SYMBOLS.join(', ')}.`,
  };
}

export function toTradingViewSymbolUrl(symbol: string) {
  const [exchange, ticker] = symbol.split(':');
  return `https://www.tradingview.com/symbols/${exchange}-${ticker}/`;
}
