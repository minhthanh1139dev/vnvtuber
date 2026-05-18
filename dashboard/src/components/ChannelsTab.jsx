import React from 'react';
import { Users } from 'lucide-react';

export default function ChannelsTab({ channels }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-neon-cyan" />
            Mạng Lưới Kênh VTuber Việt Nam
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Danh sách VTuber hiện đang được hệ thống giám sát và đăng ký WebSub với Google Hub.</p>
        </div>
      </div>

      {/* Database Table list */}
      <div className="glass rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#291e4a] text-zinc-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Talent Name</th>
                <th className="py-4 px-6">Channel ID</th>
                <th className="py-4 px-6">Lượt Sub</th>
                <th className="py-4 px-6">Số Video</th>
                <th className="py-4 px-6">Hình thức</th>
                <th className="py-4 px-6">WebSub Status</th>
                <th className="py-4 px-6 text-right">Lượt quét tiếp theo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e153a]/40">
              {channels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-zinc-500">Chưa có VTuber nào được đăng ký trong hệ thống.</td>
                </tr>
              ) : (
                channels.map(v => (
                  <tr key={v.channelId} className="hover:bg-[#1a1134]/30 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <img src={v.avatarUrl || "https://yt3.ggpht.com/uM2DMugocZu1Z45Zg6S92fW_5tWl3O8p8t19mC9S6m2_4491-b306-3f8e38d758ec"} alt={v.displayName} className="w-8 h-8 rounded-full border border-neon-purple" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-zinc-100">{v.displayName}</span>
                        <span className="text-[10px] text-zinc-500 font-semibold">{v.agencyName || 'Independent'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-[10px] text-zinc-400">{v.channelId}</td>
                    <td className="py-4 px-6 font-bold text-zinc-200">{v.subscriberCount ? `${(v.subscriberCount / 1000).toFixed(1)}k` : '0'}</td>
                    <td className="py-4 px-6 text-zinc-400">{v.videoCount || 0}</td>
                    <td className="py-4 px-6">
                      {v.type === 'agency' ? (
                        <span className="px-2 py-0.5 rounded bg-neon-purple/10 text-neon-purple border border-neon-purple/20 text-[9px] font-extrabold uppercase">AGENCY</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-neon-pink/10 text-neon-pink border border-neon-pink/20 text-[9px] font-extrabold uppercase">INDEPENDENT</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase flex items-center w-fit gap-1 ${
                        v.subscriptionStatus === 'subscribed'
                          ? 'bg-neon-green/10 text-neon-green border-neon-green/20'
                          : 'bg-neon-pink/10 text-neon-pink border-neon-pink/20'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${v.subscriptionStatus === 'subscribed' ? 'bg-neon-green' : 'bg-neon-pink'}`} />
                        {v.subscriptionStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-zinc-500 text-[10px]">
                      {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'Chưa thiết lập'}
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
