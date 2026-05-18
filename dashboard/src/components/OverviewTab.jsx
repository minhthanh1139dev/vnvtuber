import React from 'react';
import { Users, Tv, Link, Clock, TrendingUp, Radio, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewTab({ stats, activeStreams, recentHistory }) {
  const chartData = [
    { name: '11:40', viewers: 1800 },
    { name: '11:45', viewers: 2300 },
    { name: '11:50', viewers: 3100 },
    { name: '11:55', viewers: 2900 },
    { name: '12:00', viewers: 4200 },
    { name: '12:05', viewers: 4800 },
    { name: '12:10', viewers: 5120 },
    { name: '12:15', viewers: 4950 },
    { name: '12:20', viewers: 5500 },
    { name: '12:25', viewers: 6200 },
    { name: '12:30', viewers: 5900 },
    { name: '12:35', viewers: 6450 }
  ];

  return (
    <div className="space-y-8">
      {/* Stats overview cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/10 blur-xl -z-10 rounded-full group-hover:bg-neon-purple/15 transition-all duration-300" />
          <Users className="w-5 h-5 text-neon-purple mb-3" />
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tổng VTubers</span>
          <h3 className="text-3xl font-extrabold text-white mt-1.5">{stats.totalChannels}</h3>
        </div>

        <div className="glass p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-neon-red/10 blur-xl -z-10 rounded-full group-hover:bg-neon-red/15 transition-all duration-300" />
          <Tv className="w-5 h-5 text-neon-red mb-3 animate-pulse" />
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Đang Live 🔴</span>
          <h3 className="text-3xl font-extrabold text-white mt-1.5">
            {activeStreams.filter(s => s.status === 'live').length}
          </h3>
        </div>

        <div className="glass p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-neon-cyan/10 blur-xl -z-10 rounded-full group-hover:bg-neon-cyan/15 transition-all duration-300" />
          <Link className="w-5 h-5 text-neon-cyan mb-3" />
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Đăng Ký Đã Duyệt</span>
          <h3 className="text-3xl font-extrabold text-white mt-1.5">
            {stats.subscriptionBreakdown?.subscribed || 0}
          </h3>
        </div>

        <div className="glass p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-neon-pink/10 blur-xl -z-10 rounded-full group-hover:bg-neon-pink/15 transition-all duration-300" />
          <Clock className="w-5 h-5 text-neon-pink mb-3" />
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Lượt Quét Sắp Tới</span>
          <h3 className="text-3xl font-extrabold text-white mt-1.5">
            {stats.subscriptionBreakdown?.pending || 0}
          </h3>
        </div>
      </div>

      {/* Top Stream Snapshot Viewer Chart & Active Streams Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytic Snapshot Chart */}
        <div className="glass p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-neon-pink" />
              Độ Lớn Livestream & Snapshot Khán Giả
            </h4>
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Quét snapshot liên tục</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#231a44" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#140f28', borderColor: '#332766', color: '#fff', fontSize: '12px' }} />
                <Area type="monotone" dataKey="viewers" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorViewers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Active stream tracker sidebar */}
        <div className="glass p-6 rounded-3xl space-y-4 flex flex-col">
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-neon-red animate-pulse" />
            Stream Đang Phát Trực Tiếp
          </h4>

          <div className="space-y-3 flex-grow overflow-y-auto max-h-[260px] pr-1">
            {activeStreams.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">Không có stream nào đang phát sóng.</div>
            ) : (
              activeStreams.map(s => (
                <div key={s.videoId} className="p-3 bg-[#130d24] border border-brand-border rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-col gap-0.5 truncate">
                    <span className="font-bold text-zinc-200 truncate">{s.title}</span>
                    <span className="text-[10px] text-zinc-500 font-semibold">{s.channelId}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-neon-red/10 text-neon-red border border-neon-red/20 text-[9px] font-extrabold flex-shrink-0 uppercase">
                    LIVE
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Ended Stream Ingestion Logs */}
      <div className="glass p-6 rounded-3xl space-y-4">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <FileText className="w-4.5 h-4.5 text-neon-cyan" />
          Lịch Sử Lưu Trữ Stream Ingestion (MongoDB Consolidated Logs)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#291e4a] text-zinc-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Video ID</th>
                <th className="py-3 px-4">Kênh ID</th>
                <th className="py-3 px-4">Tiêu đề stream</th>
                <th className="py-3 px-4">Thời gian bắt đầu</th>
                <th className="py-3 px-4 text-right">Tổng thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e153a]/40">
              {recentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-500">Chưa có lịch sử lưu trữ hoạt động.</td>
                </tr>
              ) : (
                recentHistory.map(h => (
                  <tr key={h.videoId} className="hover:bg-[#1a1134]/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[10px] text-neon-pink">{h.videoId}</td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-400">{h.channelId}</td>
                    <td className="py-3.5 px-4 font-bold text-zinc-200">{h.title}</td>
                    <td className="py-3.5 px-4 text-zinc-400">{new Date(h.startedAt).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-neon-green">
                      {Math.floor(h.durationSeconds / 60)} phút
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
