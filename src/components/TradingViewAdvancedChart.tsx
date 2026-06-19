import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { resolveTradingViewSymbol, toTradingViewSymbolUrl } from '../lib/tradingview';

type TradingViewAdvancedChartProps = {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1D' | '1W' | 'ALL';
};

const INTERVAL_MAP: Record<TradingViewAdvancedChartProps['interval'], string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1D': 'D',
  '1W': 'W',
  ALL: '1M',
};

type TradingViewLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export function TradingViewAdvancedChart({ symbol, interval }: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadStatus, setLoadStatus] = useState<TradingViewLoadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const symbolResolution = useMemo(() => resolveTradingViewSymbol(symbol), [symbol]);
  const tvInterval = INTERVAL_MAP[interval];

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const logStatus = (status: string) => {
      console.info('[TradingView Diagnostics]', {
        'Requested Symbol': symbolResolution.requestedSymbol,
        'Resolved Symbol': symbolResolution.resolvedSymbol ?? 'UNRESOLVED',
        'TradingView Load Status': status,
      });
    };

    container.innerHTML = '';
    setErrorMessage(null);

    if (!symbolResolution.isSupported || !symbolResolution.resolvedSymbol) {
      setLoadStatus('error');
      setErrorMessage(symbolResolution.errorMessage);
      logStatus('unsupported_symbol');
      return;
    }

    setLoadStatus('loading');
    logStatus('initializing');

    let isCleanedUp = false;
    let hasLoaded = false;

    const markLoaded = () => {
      if (isCleanedUp || hasLoaded) {
        return;
      }

      hasLoaded = true;
      setLoadStatus('loaded');
      setErrorMessage(null);
      logStatus('loaded');
    };

    const markError = (status: string, nextMessage: string | null) => {
      if (isCleanedUp || hasLoaded) {
        return;
      }

      setLoadStatus('error');
      setErrorMessage(nextMessage);
      console.error('[TradingView Diagnostics]', {
        'Requested Symbol': symbolResolution.requestedSymbol,
        'Resolved Symbol': symbolResolution.resolvedSymbol,
        'TradingView Load Status': status,
      });
    };

    const widgetRoot = document.createElement('div');
    widgetRoot.className = 'tradingview-widget-container h-full w-full';
    widgetRoot.style.height = '100%';
    widgetRoot.style.width = '100%';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = 'calc(100% - 32px)';
    widget.style.width = '100%';

    const copyright = document.createElement('div');
    copyright.className = 'tradingview-widget-copyright text-[10px] text-slate-500';
    copyright.innerHTML = `<a href="${toTradingViewSymbolUrl(symbolResolution.resolvedSymbol)}" rel="noopener nofollow" target="_blank" class="text-blue-400 hover:text-blue-300">${symbolResolution.resolvedSymbol.replace(':', ': ')}</a><span> chart by TradingView</span>`;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbolResolution.resolvedSymbol,
      interval: tvInterval,
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      hide_top_toolbar: true,
      hide_side_toolbar: true,
      hide_legend: true,
      allow_symbol_change: false,
      withdateranges: false,
      save_image: false,
      details: false,
      calendar: false,
      hotlist: false,
      backgroundColor: '#111114',
      gridColor: 'rgba(39, 39, 42, 0.45)',
      studies: ['STD;EMA', 'STD;RSI', 'STD;MACD', 'STD;VWAP'],
      support_host: 'https://www.tradingview.com',
    });

    script.onload = () => {
      logStatus('script_loaded');
    };

    script.onerror = () => {
      markError('script_error', 'TradingView script failed to load.');
    };

    const observer = new MutationObserver(() => {
      const iframe = container.querySelector('iframe');

      if (!iframe || iframe.dataset.tvLoadTracked === 'true') {
        return;
      }

      iframe.dataset.tvLoadTracked = 'true';
      logStatus('iframe_created');
      iframe.addEventListener('load', markLoaded, { once: true });
    });

    observer.observe(container, { childList: true, subtree: true });

    const timeoutId = window.setTimeout(() => {
      markError(
        'timeout',
        `TradingView could not load ${symbolResolution.normalizedSymbol}. Verify the symbol is supported on NSE.`
      );
    }, 12000);

    widgetRoot.appendChild(widget);
    widgetRoot.appendChild(copyright);
    widgetRoot.appendChild(script);
    container.appendChild(widgetRoot);

    return () => {
      isCleanedUp = true;
      window.clearTimeout(timeoutId);
      observer.disconnect();
      container.innerHTML = '';
    };
  }, [symbolResolution, tvInterval]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {loadStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#111114]/85">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            <span>Loading TradingView chart...</span>
          </div>
        </div>
      )}

      {loadStatus === 'error' && errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#111114] p-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-400" />
            <p className="text-sm font-semibold text-slate-100">Chart unavailable</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
