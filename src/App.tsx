import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StockExplorer } from './components/StockExplorer';
import { Watchlists } from './components/Watchlists';
import { OptionsChain } from './components/OptionsChain';
import { OptionsDashboard } from './components/OptionsDashboard';
import { NewsIntelligence } from './components/NewsIntelligence';
import { AIAssistant } from './components/AIAssistant';
import { HealthCheck } from './components/HealthCheck';
import { useStore } from './store';

export default function App() {
  const { activeTab, setMarketData } = useStore();

  useEffect(() => {
    // Determine the WS URL (handling local vs deployed)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    let ws: WebSocket;
    let keepAlive: NodeJS.Timeout;

    const connect = () => {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log("Connected to live market feed");
            // Ping to keep connection alive in cloud run
            keepAlive = setInterval(() => {
                if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
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
                        vix: data.vix || null,
                        stocks: data.stocks || [],
                        signals: data.signals || [],
                        signalUpdatedAt: data.signalUpdatedAt || null,
                        signalRefreshIntervalSeconds: data.signalRefreshIntervalSeconds || 60,
                        news: data.news || { market: [], company: [], sector: [], updatedAt: null, refreshIntervalSeconds: 60 },
                        status: data.status || 'LOADING',
                        serverTime: data.serverTime || null,
                        error: data.error || null,
                        health: data.health || null
                    });
                }
            } catch (e) {}
        };

        ws.onclose = () => {
            console.log("Disconnected, retrying...");
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
    <div className="flex bg-[#09090b] text-[#e4e4e7] h-screen font-sans selection:bg-blue-500/30 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 w-full h-full max-w-[1600px] mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'explorer' && <StockExplorer />}
            {activeTab === 'watchlists' && <Watchlists />}
            {activeTab === 'options' && <OptionsChain />}
            {activeTab === 'options-dashboard' && <OptionsDashboard />}
            {activeTab === 'news-intelligence' && <NewsIntelligence />}
            {activeTab === 'assistant' && <AIAssistant />}
            {activeTab === 'health' && <HealthCheck />}
        </div>
      </main>
    </div>
  );
}
