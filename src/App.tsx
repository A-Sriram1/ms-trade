import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SignalsPage } from './components/SignalsPage';
import { StockExplorer } from './components/StockExplorer';
import { Watchlists } from './components/Watchlists';
import { OptionsDashboard } from './components/OptionsDashboard';
import { NewsIntelligence } from './components/NewsIntelligence';
import { AIAssistant } from './components/AIAssistant';
import { useStore } from './store';

function PlaceholderTab({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-lg font-bold text-white uppercase tracking-wider">{title}</h2>
      <p className="text-xs mt-2 text-slate-600">Coming soon</p>
    </div>
  );
}

export default function App() {
  const { activeTab, setMarketData } = useStore();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    let ws: WebSocket;
    let keepAlive: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to live market feed');
        keepAlive = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'MARKET_UPDATE') {
            setMarketData({
              nifty: data.nifty || null,
              banknifty: data.banknifty || null,
              sensex: data.sensex || null,
              finnifty: data.finnifty || null,
              vix: data.vix || null,
              stocks: data.stocks || [],
              signals: data.signals || [],
              signalUpdatedAt: data.signalUpdatedAt || null,
              signalRefreshIntervalSeconds: data.signalRefreshIntervalSeconds || 60,
              news: data.news || { market: [], company: [], sector: [], updatedAt: null, refreshIntervalSeconds: 60 },
              status: data.status || 'LOADING',
              serverTime: data.serverTime || null,
              marketContext: data.marketContext || null,
              error: data.error || null,
              globalMarkets: data.globalMarkets || null,
              health: data.health || null,
            });
          }
        } catch (e) { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        console.log('Disconnected, retrying in 2s...');
        clearInterval(keepAlive);
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      clearInterval(keepAlive);
      if (ws) ws.close();
    };
  }, [setMarketData]);

  return (
    <div className="flex bg-surface text-[#e4e4e7] h-screen font-sans selection:bg-blue-500/30 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 w-full h-full max-w-[1800px] mx-auto">
          {activeTab === 'dashboard'         && <Dashboard />}
          {activeTab === 'signals'           && <SignalsPage />}
          {activeTab === 'explorer'          && <StockExplorer />}
          {activeTab === 'options'           && <OptionsDashboard />}
          {activeTab === 'watchlist'         && <Watchlists />}
          {activeTab === 'news'              && <NewsIntelligence />}
          {activeTab === 'assistant'         && <AIAssistant />}
          {activeTab === 'settings'          && <PlaceholderTab title="Settings" icon="⚙️" />}
        </div>
      </main>
    </div>
  );
}
