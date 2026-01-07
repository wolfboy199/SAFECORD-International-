import React, { useEffect, useRef, useState } from 'react';

type LogLevel = 'info' | 'warn' | 'error' | 'system';
interface LogEntry { id: string; ts: number; level: LogLevel; message: string; }

export function DevConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [query, setQuery] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Expose a global hook for pushing logs from anywhere in the app
    (window as any).SafecordConsole = (window as any).SafecordConsole || {};
    (window as any).SafecordConsole.push = (level: LogLevel, message: string) => {
      const entry: LogEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, ts: Date.now(), level, message };
      setLogs((s) => { const next = [...s, entry]; return next.slice(-2000); });
    };

    return () => {
      // keep hook but don't clean it up to avoid breaking other dev tools
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, filter, query]);

  const filtered = logs.filter((l) => (filter === 'all' ? true : l.level === filter) && l.message.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed right-6 bottom-6 w-[720px] max-h-[60vh] bg-[#071018]/95 backdrop-blur-md border border-pink-500/10 rounded-xl shadow-2xl overflow-hidden z-[9999]">
      <div className="p-3 border-b border-pink-500/10 flex items-center gap-2">
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter==='all'? 'bg-pink-600/30 text-white':'text-gray-300'}`}>All</button>
          <button onClick={() => setFilter('info')} className={`px-3 py-1 rounded ${filter==='info'? 'bg-pink-600/30 text-white':'text-gray-300'}`}>Info</button>
          <button onClick={() => setFilter('warn')} className={`px-3 py-1 rounded ${filter==='warn'? 'bg-yellow-600/30 text-white':'text-gray-300'}`}>Warn</button>
          <button onClick={() => setFilter('error')} className={`px-3 py-1 rounded ${filter==='error'? 'bg-red-600/30 text-white':'text-gray-300'}`}>Error</button>
          <button onClick={() => setFilter('system')} className={`px-3 py-1 rounded ${filter==='system'? 'bg-cyan-600/30 text-white':'text-gray-300'}`}>System</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search logs..." className="px-3 py-1 rounded bg-transparent border border-pink-500/10 text-sm text-gray-200" />
          <button onClick={()=>setLogs([])} className="px-3 py-1 rounded bg-red-600/20 text-red-200">Clear</button>
        </div>
      </div>

      <div className="p-3 overflow-y-auto h-[40vh] scrollbar-custom">
        {filtered.map((l) => (
          <div key={l.id} className="mb-2">
            <div className="text-xs text-gray-400">{new Date(l.ts).toLocaleString()}</div>
            <div className={`text-sm ${l.level==='error' ? 'text-red-300' : l.level==='warn' ? 'text-yellow-300' : l.level==='system' ? 'text-cyan-200' : 'text-gray-200'}`}>{l.message}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
