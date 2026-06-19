import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const SUGGESTED_PROMPTS = [
    'Analyze Reliance',
    'Why is NIFTY falling?',
    'Best bullish stocks today?',
    'Explain BankNifty trend',
];

export function AIAssistant() {
    const [messages, setMessages] = useState<Array<{role: 'user'|'assistant', text: string}>>([
        { role: 'assistant', text: "Hello! I am TradeMind AI. Ask me about Reliance, NIFTY, BankNifty, or bullish setups. I use live Yahoo Finance data, technical indicators, the internal signal engine, and news sentiment to generate detailed analysis." }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting to the quant models. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#111114] border border-[#27272a] rounded-xl p-4 overflow-hidden">
            <header className="pb-3 border-b border-[#27272a] flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-white tracking-wider uppercase">TradeMind Quant AI</h1>
                    <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wide">Market-aware analysis with signals and sentiment</p>
                </div>
            </header>

            <div className="flex flex-wrap gap-2 pt-4">
                {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-300 transition-colors hover:border-blue-500/40 hover:text-white"
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={cn(
                        "flex gap-3 max-w-3xl",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded flex items-center justify-center shrink-0 border",
                            msg.role === 'user' ? "bg-[#18181b] text-blue-400 border-[#27272a]" : "bg-blue-600/10 text-blue-500 border-blue-500/20"
                        )}>
                            {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        </div>
                        <div className={cn(
                            "max-w-[80%] whitespace-pre-wrap rounded-lg border p-3 text-[11px] leading-relaxed",
                            msg.role === 'user' ? "bg-[#18181b] text-white border-[#27272a]" : "bg-blue-600/5 text-slate-300 border-blue-500/10"
                        )}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3 max-w-3xl">
                         <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 border bg-blue-600/10 text-blue-500 border-blue-500/20">
                            <Bot className="w-3 h-3" />
                        </div>
                        <div className="p-3 rounded-lg text-[11px] bg-blue-600/5 border border-blue-500/10 flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-bounce"></div>
                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-bounce delay-100"></div>
                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="relative mt-2">
                <input 
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask: Analyze Reliance, Why is NIFTY falling, or Best bullish stocks today..."
                    className="w-full bg-[#18181b] border border-[#27272a] text-[#e4e4e7] pl-3 pr-10 py-3 rounded text-[11px] focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500"
                />
                <button 
                    disabled={loading || !input.trim()}
                    type="submit" 
                    className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}
