import React from 'react';
import { useStore } from '../store';
import { Activity, Database, HeartPulse, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export function HealthCheck() {
    const { marketData } = useStore();
    const health = marketData.health;

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-6">
                <HeartPulse className="w-5 h-5 text-blue-500" />
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">System Health</h1>
                    <p className="text-slate-500 text-xs">Real-time infrastructure monitoring</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatusCard 
                    title="Yahoo Finance API"
                    value={health?.apiConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    status={health?.apiConnected ? 'ok' : 'error'}
                    icon={<Activity className="w-4 h-4" />}
                />
                <StatusCard 
                    title="WebSocket Feed"
                    value={health?.wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    status={health?.wsConnected ? 'ok' : 'error'}
                    icon={health?.wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                />
                <StatusCard 
                    title="Redis Cache"
                    value={health?.redisConnected ? 'CONNECTED' : 'FAILING'}
                    status={health?.redisConnected ? 'ok' : 'error'}
                    icon={<Database className="w-4 h-4" />}
                />
                <StatusCard 
                    title="Last Tick Received"
                    value={health?.lastTickTime || 'Never'}
                    status={health?.lastTickTime ? 'ok' : 'warn'}
                    icon={<Activity className="w-4 h-4" />}
                />
            </div>

            <div className="bg-[#111114] border border-[#27272a] rounded-xl p-6 flex-1">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">System Logs & Diagnostics</h3>
                
                {health?.errorMessage ? (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded text-sm flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-4 h-4 mt-0.5" />
                        <div>
                            <span className="font-bold">API Connection Error</span>
                            <p className="mt-1 opacity-80">{health.errorMessage}</p>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-3 font-mono text-[11px]">
                    <div className="flex items-center gap-4 py-2 border-b border-[#27272a]">
                        <span className="text-slate-500 w-32">Market Status</span>
                        <span className={cn("font-bold", marketData.status === 'OPEN' ? 'text-emerald-400' : 'text-slate-400')}>{marketData.status || 'UNKNOWN'}</span>
                    </div>
                    <div className="flex items-center gap-4 py-2 border-b border-[#27272a]">
                        <span className="text-slate-500 w-32">Server Time</span>
                        <span className="text-white">{marketData.serverTime || '---'}</span>
                    </div>
                    <div className="flex items-center gap-4 py-2 border-b border-[#27272a]">
                        <span className="text-slate-500 w-32">Live Symbols Tracked</span>
                        <span className="text-white">{marketData.stocks.length + (marketData.nifty ? 1 : 0) + (marketData.banknifty ? 1 : 0)}</span>
                    </div>
                </div>

                {!health?.apiConnected && (
                    <div className="mt-8 bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded text-sm">
                        <h4 className="font-bold mb-2">Setup Required</h4>
                        <p className="opacity-80">To receive live Yahoo Finance data, verify outbound network access to Yahoo Finance and confirm the server market-data process is running normally.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatusCard({ title, value, status, icon }: { title: string, value: string, status: 'ok'|'warn'|'error', icon: React.ReactNode }) {
    return (
        <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{title}</span>
                <span className="text-slate-500">{icon}</span>
            </div>
            <div className={cn(
                "text-lg font-bold font-mono tracking-tight",
                status === 'ok' ? 'text-emerald-400' : status === 'warn' ? 'text-amber-400' : 'text-rose-400'
            )}>
                {value}
            </div>
        </div>
    )
}
