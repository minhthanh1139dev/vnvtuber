import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  HeartHandshake, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ExternalLink,
  Info,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface Vtuber {
  channelId: string;
  displayName: string;
  avatarUrl: string;
  description: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  type: 'independent' | 'agency';
  agencyName: string;
  parentChannelId?: string;
  streamFrequencyRank: number;
  lastActiveAt?: string;
  createdAt: string;
}

interface LiveStream {
  videoId: string;
  channelId: string;
  title: string;
  status: 'live' | 'upcoming';
  startedAt: string;
  channel: {
    displayName: string;
    avatarUrl: string;
    subscriberCount: number;
    type: 'independent' | 'agency';
    agencyName: string;
  } | null;
}

interface Props {
  initialVtubers: Vtuber[];
  backendUrl: string;
}

export default function VtuberDashboard({ initialVtubers, backendUrl }: Props) {
  // 1. Navigation State (Sync with URL Hash)
  const [activeTab, setActiveTab] = useState<'live' | 'directory' | 'suggest'>('live');

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'directory' || hash === 'suggest' || hash === 'live') {
        setActiveTab(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const changeTab = (tab: 'live' | 'directory' | 'suggest') => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // 2. Real-time Live Streams State
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);

  const fetchLiveStreams = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/vtubers/live`);
      if (res.ok) {
        const data = await res.json();
        setLiveStreams(data);
      }
    } catch (err) {
      console.error("Failed to load active streams:", err);
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    fetchLiveStreams();
    const interval = setInterval(fetchLiveStreams, 45000); // Poll every 45s
    return () => clearInterval(interval);
  }, []);

  // 3. Directory Search, Filter, Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'independent' | 'agency'>('all');
  const [sortOrder, setSortOrder] = useState<'random' | 'popular' | 'new' | 'frequency'>('random');
  const [directoryList, setDirectoryList] = useState<Vtuber[]>(initialVtubers);

  // Custom daily seeded shuffle
  const dailyShuffle = (array: Vtuber[]) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const shuffled = [...array];
    
    // Hash function to seed LCG
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const random = () => {
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    let list = [...initialVtubers];

    // Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(v => v.displayName.toLowerCase().includes(query));
    }
    if (typeFilter !== 'all') {
      list = list.filter(v => v.type === typeFilter);
    }

    // Sort
    if (sortOrder === 'popular') {
      list.sort((a, b) => b.subscriberCount - a.subscriberCount);
    } else if (sortOrder === 'new') {
      // Prioritize videoCount < 100 (New channels) then sort ascendingly
      list.sort((a, b) => {
        const isNewA = a.videoCount < 100 ? 1 : 0;
        const isNewB = b.videoCount < 100 ? 1 : 0;
        if (isNewA !== isNewB) return isNewB - isNewA;
        return a.videoCount - b.videoCount;
      });
    } else if (sortOrder === 'frequency') {
      list.sort((a, b) => b.streamFrequencyRank - a.streamFrequencyRank);
    } else {
      // Default: daily seed shuffle
      list = dailyShuffle(list);
    }

    setDirectoryList(list);
  }, [searchQuery, typeFilter, sortOrder, initialVtubers]);

  // 4. Suggestion Form State
  const [channelId, setChannelId] = useState('');
  const [suggestType, setSuggestType] = useState<'independent' | 'agency'>('independent');
  const [agencyName, setAgencyName] = useState('');
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId.trim()) return;

    setSubmitting(true);
    setFormStatus(null);

    try {
      const res = await fetch(`${backendUrl}/api/vtubers/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channelId.trim(),
          type: suggestType,
          agencyName: suggestType === 'agency' ? agencyName.trim() : ''
        })
      });
      const data = await res.json();

      if (res.ok) {
        setFormStatus({
          type: 'success',
          message: 'Đề xuất thành công! Ban quản trị sẽ rà soát và kiểm duyệt kênh sớm.'
        });
        setChannelId('');
        setAgencyName('');
      } else {
        setFormStatus({
          type: 'error',
          message: data.error || 'Có lỗi xảy ra khi gửi đề xuất.'
        });
      }
    } catch (err) {
      setFormStatus({
        type: 'error',
        message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-1.5 border border-brand-border bg-[#0d0a1c]/80 backdrop-blur-xl rounded-2xl max-w-2xl mx-auto shadow-2xl">
        <button
          onClick={() => changeTab('live')}
          className={`relative w-full sm:w-1/3 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
            activeTab === 'live' ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {activeTab === 'live' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-pink/35 rounded-xl -z-10 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`w-2 h-2 rounded-full ${liveStreams.length > 0 ? 'bg-neon-red animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-zinc-600'}`} />
          🔴 Live Streams
        </button>

        <button
          onClick={() => changeTab('directory')}
          className={`relative w-full sm:w-1/3 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
            activeTab === 'directory' ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {activeTab === 'directory' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-pink/35 rounded-xl -z-10 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Users className="w-4 h-4" />
          Danh Sách VTuber
        </button>

        <button
          onClick={() => changeTab('suggest')}
          className={`relative w-full sm:w-1/3 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
            activeTab === 'suggest' ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {activeTab === 'suggest' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-pink/35 rounded-xl -z-10 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <HeartHandshake className="w-4 h-4" />
          Gợi Ý Kênh
        </button>
      </div>

      {/* 2. Main Dashboard Content Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold flex items-center justify-center sm:justify-start gap-2.5">
                <span className="w-3 h-3 rounded-full bg-neon-red animate-ping" />
                Đang Phát Sóng Trực Tiếp
              </h2>
              <p className="text-zinc-400 text-sm mt-1">Danh sách luồng phát sóng của VTuber Việt Nam cập nhật tức thời qua Google WebSub.</p>
            </div>

            {loadingLive ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-brand-border bg-[#100c1c]/50 rounded-2xl overflow-hidden skeleton-shimmer min-h-[300px]" />
                ))}
              </div>
            ) : liveStreams.length === 0 ? (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 px-6 border border-brand-border bg-brand-card/45 rounded-3xl max-w-lg mx-auto text-center"
              >
                <div className="text-5xl mb-4">📺</div>
                <h3 className="text-lg font-bold text-zinc-100">Hiện tại không có ai online</h3>
                <p className="text-zinc-400 text-sm mt-1.5 max-w-sm">Tất cả VTuber trong mạng lưới hiện đang offline. Hãy theo dõi các thông báo hoặc quay lại sau!</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {liveStreams.map((stream) => {
                  const isLive = stream.status === 'live';
                  return (
                    <motion.div
                      key={stream.videoId}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      className="border border-brand-border bg-[#110c1f]/80 backdrop-blur-md rounded-2xl overflow-hidden group shadow-lg shadow-black/40 hover:border-neon-pink/40 hover:shadow-[0_0_30px_rgba(236,72,153,0.1)] transition-all duration-300 flex flex-col"
                    >
                      {/* Video Thumbnail */}
                      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                        <img 
                          src={`https://i.ytimg.com/vi/${stream.videoId}/mqdefault.jpg`}
                          alt={stream.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Status tag */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${
                            isLive 
                              ? 'bg-neon-red text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] live-pulse' 
                              : 'bg-neon-cyan text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full bg-white ${isLive ? 'animate-ping' : ''}`} />
                            {isLive ? '🔴 LIVE' : '📅 UPCOMING'}
                          </span>
                        </div>
                        {/* Time indicator */}
                        <span className="absolute bottom-3 right-3 bg-black/75 px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-300">
                          {isLive ? 'Đang phát sóng' : 'Luồng sắp phát'}
                        </span>
                      </div>

                      {/* Content Card Body */}
                      <div className="p-5 flex flex-col flex-grow">
                        {/* Profile Info */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <img 
                            src={stream.channel?.avatarUrl || "https://yt3.ggpht.com/uM2DMugocZu1Z45Zg6S92fW_5tWl3O8p8t19mC9S6m2_4491-b306-3f8e38d758ec"}
                            alt={stream.channel?.displayName || "VTuber"}
                            className="w-8 h-8 rounded-full border border-neon-purple shadow-sm"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-200">{stream.channel?.displayName}</span>
                            {stream.channel?.type === 'agency' && (
                              <span className="text-[10px] text-neon-purple font-semibold">{stream.channel?.agencyName}</span>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold leading-snug text-zinc-100 group-hover:text-neon-pink transition-colors duration-200 line-clamp-2 mb-5 flex-grow">
                          {stream.title}
                        </h4>

                        {/* Action link */}
                        <a
                          href={`https://www.youtube.com/watch?v=${stream.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-neon-purple/10 border border-neon-purple/20 hover:bg-gradient-to-r hover:from-neon-purple hover:to-neon-pink hover:border-transparent text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all duration-300"
                        >
                          Xem Ngay Trực Tiếp <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'directory' && (
          <motion.div
            key="directory"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Page Header */}
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold flex items-center justify-center sm:justify-start gap-2.5">
                <Users className="w-6 h-6 text-neon-purple" />
                Danh Sách VTuber Việt Nam
              </h2>
              <p className="text-zinc-400 text-sm mt-1">Khám phá và kết nối với những tài năng VTuber độc lập hoặc từ các tổ chức chuyên nghiệp.</p>
            </div>

            {/* Premium Filter Panel */}
            <div className="border border-brand-border bg-[#100a20]/65 backdrop-blur-xl p-5 sm:p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-5 shadow-2xl">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Tìm kiếm
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nhập tên VTuber..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#080512]/90 border border-brand-border rounded-xl py-3 pl-4 pr-10 text-sm outline-none text-zinc-200 focus:border-neon-purple/75 transition-colors duration-200"
                  />
                  <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Loại hình
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full bg-[#080512]/90 border border-brand-border rounded-xl py-3 px-4 text-sm outline-none text-zinc-200 focus:border-neon-purple/75 cursor-pointer transition-colors duration-200 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                >
                  <option value="all">Tất cả loại hình</option>
                  <option value="independent">Tự do (Independent)</option>
                  <option value="agency">Tổ chức (Agency)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Sắp xếp theo
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full bg-[#080512]/90 border border-brand-border rounded-xl py-3 px-4 text-sm outline-none text-zinc-200 focus:border-neon-purple/75 cursor-pointer transition-colors duration-200 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                >
                  <option value="random">Lọc ngẫu nhiên hôm nay 🎲</option>
                  <option value="popular">Nổi tiếng nhất ⭐</option>
                  <option value="new">Kênh mới 🌱 (video &lt; 100)</option>
                  <option value="frequency">Chăm chỉ livestream 🔥</option>
                </select>
              </div>
            </div>

            {/* Cards Grid */}
            {directoryList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 border border-brand-border bg-brand-card/45 rounded-3xl max-w-lg mx-auto text-center">
                <Search className="w-12 h-12 text-zinc-500 mb-4" />
                <h3 className="text-lg font-bold text-zinc-100">Không tìm thấy VTuber</h3>
                <p className="text-zinc-400 text-sm mt-1.5">Thử thay đổi từ khóa hoặc điều chỉnh bộ lọc để có kết quả nhé.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {directoryList.map((vtuber) => (
                  <motion.div
                    key={vtuber.channelId}
                    layout
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="border border-brand-border bg-[#100c1e]/60 backdrop-blur-sm p-5 rounded-2xl flex flex-col justify-between relative group hover:border-neon-purple/45 hover:shadow-[0_0_25px_rgba(168,85,247,0.1)] transition-all duration-300"
                  >
                    {/* Header Badges */}
                    <div className="absolute top-4 right-4 flex gap-1.5">
                      {vtuber.type === 'agency' ? (
                        <span className="px-2 py-0.5 rounded bg-neon-purple/15 text-neon-purple border border-neon-purple/20 text-[9px] font-extrabold uppercase">
                          🏷️ {vtuber.agencyName || 'Agency'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-neon-pink/15 text-neon-pink border border-neon-pink/20 text-[9px] font-extrabold uppercase">
                          ⭐ Tự Do
                        </span>
                      )}
                      {vtuber.videoCount < 100 && (
                        <span className="px-2 py-0.5 rounded bg-neon-green/15 text-neon-green border border-neon-green/20 text-[9px] font-extrabold uppercase">
                          🌱 Mới
                        </span>
                      )}
                    </div>

                    {/* Talent Meta Profile */}
                    <div className="flex flex-col items-center mt-6 text-center">
                      <img
                        src={vtuber.avatarUrl || "https://yt3.ggpht.com/uM2DMugocZu1Z45Zg6S92fW_5tWl3O8p8t19mC9S6m2_4491-b306-3f8e38d758ec"}
                        alt={vtuber.displayName}
                        className="w-16 h-16 rounded-full border-2 border-neon-purple shadow-lg shadow-black/40 group-hover:scale-105 transition-transform duration-300"
                      />
                      <h3 className="text-base font-bold text-zinc-100 mt-3 group-hover:text-neon-pink transition-colors duration-200 line-clamp-1">{vtuber.displayName}</h3>
                    </div>

                    {/* Description Snippet */}
                    <p className="text-zinc-400 text-xs leading-relaxed text-center mt-3 mb-5 line-clamp-3 min-h-[54px]">
                      {vtuber.description || "Chưa cập nhật phần tự giới thiệu chi tiết cho kênh VTuber Việt Nam này."}
                    </p>

                    {/* Stats metrics */}
                    <div className="border-t border-brand-border pt-4 grid grid-cols-3 gap-1 mb-4 text-center">
                      <div className="flex flex-col">
                        <span className="text-zinc-100 text-xs font-bold">
                          {vtuber.subscriberCount >= 1000 
                            ? `${(vtuber.subscriberCount / 1000).toFixed(1)}k`
                            : vtuber.subscriberCount}
                        </span>
                        <span className="text-zinc-500 text-[9px] font-bold uppercase mt-0.5">Subs</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-100 text-xs font-bold">{vtuber.videoCount}</span>
                        <span className="text-zinc-500 text-[9px] font-bold uppercase mt-0.5">Videos</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-100 text-xs font-bold">
                          {vtuber.viewCount >= 1000000 
                            ? `${(vtuber.viewCount / 1000000).toFixed(1)}M`
                            : `${(vtuber.viewCount / 1000).toFixed(1)}k`}
                        </span>
                        <span className="text-zinc-500 text-[9px] font-bold uppercase mt-0.5">Views</span>
                      </div>
                    </div>

                    {/* Direct YouTube channel CTA */}
                    <a
                      href={`https://www.youtube.com/channel/${vtuber.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-zinc-900 border border-brand-border hover:bg-gradient-to-r hover:from-neon-purple hover:to-neon-pink hover:border-transparent text-white font-bold text-xs rounded-xl cursor-pointer transition-all duration-300"
                    >
                      Ghé Kênh YouTube <ExternalLink className="w-3 h-3" />
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'suggest' && (
          <motion.div
            key="suggest"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <HeartHandshake className="w-6 h-6 text-neon-pink" />
                Đóng Góp Xây Dựng Cộng Đồng
              </h2>
              <p className="text-zinc-400 text-sm mt-1 max-w-xl mx-auto">Giúp cộng đồng tổng hợp và mở rộng mạng lưới VTuber Việt Nam đầy đủ và chính xác nhất.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start mt-6">
              {/* Form Card */}
              <div className="border border-brand-border bg-[#100c1e]/75 backdrop-blur-xl p-6 sm:p-8 rounded-3xl md:col-span-3 shadow-2xl space-y-6">
                <form onSubmit={handleSuggest} className="space-y-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="ch-id" className="text-sm font-bold text-zinc-300 flex items-center gap-1">
                      YouTube Channel ID <span className="text-neon-red">*</span>
                    </label>
                    <input
                      id="ch-id"
                      type="text"
                      required
                      placeholder="Ví dụ: UC_x5XG1OV2P6uZZ5FSM9Ttw"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      className="bg-[#07050e]/95 border border-brand-border rounded-xl py-3.5 px-4 text-sm outline-none text-zinc-100 focus:border-neon-pink/75 transition-colors duration-200"
                    />
                    <span className="text-zinc-500 text-[10px] leading-relaxed">
                      Để lấy ID: Vào kênh YouTube → Giới thiệu (About) → Chia sẻ → Sao chép ID Kênh (ID bắt đầu bằng chữ "UC").
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="ch-type" className="text-sm font-bold text-zinc-300">Loại hình</label>
                      <select
                        id="ch-type"
                        value={suggestType}
                        onChange={(e) => setSuggestType(e.target.value as any)}
                        className="bg-[#07050e]/95 border border-brand-border rounded-xl py-3.5 px-4 text-sm outline-none text-zinc-100 focus:border-neon-pink/75 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                      >
                        <option value="independent">Tự do (Independent)</option>
                        <option value="agency">Tổ chức/Dự án (Agency)</option>
                      </select>
                    </div>

                    <AnimatePresence>
                      {suggestType === 'agency' && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex flex-col gap-2"
                        >
                          <label htmlFor="ch-agency" className="text-sm font-bold text-zinc-300">Tên tổ chức/Agency</label>
                          <input
                            id="ch-agency"
                            type="text"
                            required={suggestType === 'agency'}
                            placeholder="Ví dụ: Hololive, Nijisanji..."
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            className="bg-[#07050e]/95 border border-brand-border rounded-xl py-3.5 px-4 text-sm outline-none text-zinc-100 focus:border-neon-pink/75 transition-colors duration-200"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-pink hover:to-neon-purple disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-neon-pink/15 transition-all duration-300 transform active:scale-98"
                  >
                    {submitting ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <>Gửi Đóng Góp Kênh ✨</>
                    )}
                  </button>
                </form>

                {/* Submit alerts */}
                <AnimatePresence>
                  {formStatus && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={`flex gap-3 p-4 rounded-xl border ${
                        formStatus.type === 'success' 
                          ? 'bg-neon-green/5 border-neon-green/30 text-neon-green' 
                          : 'bg-neon-red/5 border-neon-red/30 text-neon-red'
                      }`}
                    >
                      {formStatus.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider">{formStatus.type === 'success' ? 'Đề xuất thành công' : 'Đề xuất thất bại'}</span>
                        <span className="text-xs text-zinc-300 leading-relaxed">{formStatus.message}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Informative Side Card */}
              <div className="border border-brand-border bg-[#100c1e]/45 p-6 sm:p-7 rounded-3xl md:col-span-2 space-y-5 h-full flex flex-col justify-center">
                <h3 className="text-base font-bold flex items-center gap-2 text-zinc-100">
                  <Info className="w-4.5 h-4.5 text-neon-purple" />
                  Quy Trình Phê Duyệt
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-xs leading-relaxed text-zinc-400">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neon-purple/10 text-neon-purple flex items-center justify-center font-bold text-[10px]">1</span>
                    <div>
                      <strong className="text-zinc-200">Gửi thông tin:</strong>
                      <p className="mt-0.5">Cộng đồng đề xuất kênh bằng ID kênh YouTube hợp lệ.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 text-xs leading-relaxed text-zinc-400">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neon-purple/10 text-neon-purple flex items-center justify-center font-bold text-[10px]">2</span>
                    <div>
                      <strong className="text-zinc-200">Backend tự động hóa:</strong>
                      <p className="mt-0.5">Hệ thống gọi API của YouTube nạp avatar, tổng view, video, sub và mô tả chi tiết.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 text-xs leading-relaxed text-zinc-400">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neon-purple/10 text-neon-purple flex items-center justify-center font-bold text-[10px]">3</span>
                    <div>
                      <strong className="text-zinc-200">Duyệt và Đồng bộ:</strong>
                      <p className="mt-0.5">Ban quản trị phê duyệt thủ công nhằm tránh trùng lặp và bắt đầu quá trình theo dõi webhook livestream tự động.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Dynamic Toast notifications */}
      {formStatus?.type === 'success' && (
        <div className="fixed bottom-6 right-6 z-[2000] p-4 bg-[#140f24] border border-neon-green/40 shadow-[0_0_20px_rgba(34,197,94,0.15)] rounded-xl flex items-center gap-3 animate-bounce">
          <span className="text-neon-green text-lg">✨</span>
          <span className="text-xs font-semibold text-zinc-200">Đã gửi yêu cầu đề xuất VTuber thành công!</span>
        </div>
      )}
    </div>
  );
}
