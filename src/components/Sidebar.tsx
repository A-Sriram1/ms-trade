import React from 'react';
import {
  LayoutDashboard, Search, Settings, MessageSquare,
  LineChart, LogOut, Newspaper, Star, Zap,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 264;

export function Sidebar() {
  const { activeTab, setActiveTab, marketData } = useStore();
  const [collapsed, setCollapsed] = React.useState(false);

  const activeSignalCount = marketData.signals.filter(
    s => s.action === 'STRONG BUY' || s.action === 'BUY' || s.action === 'STRONG SELL' || s.action === 'SELL'
  ).length;

  const items = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'signals' as const, label: 'AI Signals', icon: Zap, badge: activeSignalCount > 0 ? activeSignalCount : null },
    { id: 'explorer' as const, label: 'Stock Explorer', icon: Search, badge: null },
    { id: 'options' as const, label: 'Options Dashboard', icon: LineChart, badge: null },
    { id: 'watchlist' as const, label: 'Watchlist', icon: Star, badge: null },
    { id: 'news' as const, label: 'News Intelligence', icon: Newspaper, badge: null },
    { id: 'assistant' as const, label: 'AI Assistant', icon: MessageSquare, badge: null },
    { id: 'settings' as const, label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <div
      className="h-full border-r border-white/5 bg-surface flex flex-col text-slate-400 transition-all duration-300 ease-out relative"
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-surface-raised border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Brand */}
      <div className={cn('flex items-center gap-2 py-6 text-white', collapsed ? 'justify-center px-2' : 'px-6')}>
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-lg shadow-blue-600/20">
          TM
        </div>
        {!collapsed && (
          <span className="font-bold tracking-tight text-lg text-white whitespace-nowrap">
            TRADE<span className="text-blue-500">MIND</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full space-y-0.5 px-2">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center w-full rounded-lg transition-all duration-200 border',
                collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5',
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'border-transparent hover:bg-white/[0.03] hover:text-white'
              )}
            >
              <div className={cn('flex items-center', collapsed ? '' : 'gap-3')}>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-[11px] font-medium">{item.label}</span>}
              </div>
              {!collapsed && item.badge != null && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge != null && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className={cn('w-full px-2 mb-4', collapsed && 'px-2')}>
        <button className={cn(
          'flex items-center gap-3 w-full rounded-lg text-sm font-medium hover:bg-white/[0.03] hover:text-white transition-all duration-200 border border-transparent',
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
        )}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-[11px]">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
