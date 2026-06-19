import React from 'react';
import { Activity, LayoutDashboard, Search, Settings, MessageSquare, LineChart, LogOut, Newspaper, Star } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

export function Sidebar() {
    const { activeTab, setActiveTab } = useStore();

    const items = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'explorer', label: 'Stock Explorer', icon: Search },
        { id: 'watchlists', label: 'Watchlists', icon: Star },
        { id: 'options', label: 'Options Chain', icon: Activity },
        { id: 'options-dashboard', label: 'Options Dashboard', icon: LineChart },
        { id: 'news-intelligence', label: 'News Intelligence', icon: Newspaper },
        { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
        { id: 'health', label: 'System Health', icon: Settings },
    ] as const;

    return (
        <div className="w-64 h-full border-r border-[#27272a] bg-[#09090b] flex flex-col py-6 text-slate-400">
            <div className="flex items-center gap-2 mb-10 text-white w-full px-6">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-xs text-white">TM</div>
                <span className="font-bold tracking-tight text-lg text-white">TRADEMIND<span className="text-blue-500">AI</span></span>
            </div>
            
            <nav className="flex-1 w-full space-y-2 px-4">
                {items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "flex items-center gap-3 w-full px-4 py-2.5 rounded text-sm font-medium transition-all duration-200",
                                isActive 
                                ? "bg-blue-500/10 text-blue-500" 
                                : "hover:bg-[#18181b] hover:text-white"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

            <div className="w-full px-4">
                <button className="flex items-center gap-3 w-full px-4 py-2.5 rounded text-sm font-medium hover:bg-[#18181b] hover:text-white transition-all duration-200">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
