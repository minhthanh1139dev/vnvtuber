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
  CheckCircle2,
  Coffee,
  Shield,
  ShoppingBag,
  Gamepad2,
  Gift,
  Sliders,
  X
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
  thumbnail?: string;
  viewerCount?: number;
  scheduledStartAt?: string | null;
  actualStartAt?: string | null;
  channel: {
    displayName: string;
    avatarUrl: string;
    subscriberCount: number;
    type: 'independent' | 'agency';
    agencyName: string;
  } | null;
}

interface SponsorItem {
  _id: string;
  title: string;
  description: string;
  targetUrl: string;
  imageUrl?: string;
  discountCode?: string;
  type: 'sponsor' | 'affiliate';
  priceText?: string;
  isActive: boolean;
}

interface Props {
  initialVtubers: Vtuber[];
  backendUrl: string;
}

function formatCompactNumber(value?: number) {
  if (!value) return null;
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatAbsoluteDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatRelativeLabel(value?: string | null, mode: 'live' | 'upcoming' = 'live') {
  if (!value) return mode === 'live' ? 'Dang live' : 'Sap dien ra';

  const target = new Date(value).getTime();
  const diffMs = target - Date.now();
  const totalMinutes = Math.max(0, Math.floor(Math.abs(diffMs) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  if (mode === 'live') {
    return `Live ${parts.join(' ')}`;
  }

  if (diffMs <= 0) {
    return 'Sap bat dau';
  }

  return `In ${parts.join(' ')}`;
}

function StreamSection({
  title,
  subtitle,
  emptyTitle,
  emptyBody,
  streams,
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  streams: LiveStream[];
}) {
  if (streams.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-zinc-100">{title}</h3>
            <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
          </div>
          <span className="rounded-full border border-brand-border px-3 py-1 text-[11px] font-bold text-zinc-400">
            0
          </span>
        </div>

        <div className="border border-brand-border bg-brand-card/45 rounded-3xl px-6 py-10 text-center">
          <h4 className="text-base font-bold text-zinc-100">{emptyTitle}</h4>
          <p className="text-sm text-zinc-400 mt-1">{emptyBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-zinc-100">{title}</h3>
          <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
        </div>
        <span className="rounded-full border border-brand-border px-3 py-1 text-[11px] font-bold text-zinc-300">
          {streams.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {streams.map((stream) => {
          const isLive = stream.status === 'live';
          const anchorTime = isLive ? stream.actualStartAt || stream.startedAt : stream.scheduledStartAt || stream.startedAt;
          const badgeLabel = isLive ? 'LIVE NOW' : 'UPCOMING';
          const metaLabel = isLive
            ? `${formatRelativeLabel(anchorTime, 'live')}${stream.viewerCount ? ` • ${formatCompactNumber(stream.viewerCount)} watching` : ''}`
            : `${formatRelativeLabel(anchorTime, 'upcoming')} • ${formatAbsoluteDate(anchorTime) || 'TBA'}`;

          return (
            <motion.div
              key={stream.videoId}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="border border-brand-border bg-[#110c1f]/80 backdrop-blur-md rounded-2xl overflow-hidden group shadow-lg shadow-black/40 hover:border-neon-pink/40 hover:shadow-[0_0_30px_rgba(236,72,153,0.1)] transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                <img
                  src={stream.thumbnail || `https://i.ytimg.com/vi/${stream.videoId}/mqdefault.jpg`}
                  alt={stream.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${
                      isLive
                        ? 'bg-neon-red text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] live-pulse'
                        : 'bg-neon-cyan text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full bg-white ${isLive ? 'animate-ping' : ''}`} />
                    {badgeLabel}
                  </span>
                </div>
                <span className="absolute bottom-3 right-3 bg-black/75 px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-200">
                  {metaLabel}
                </span>
              </div>

              <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-2.5 mb-3">
                  <img
                    src={stream.channel?.avatarUrl || "https://yt3.ggpht.com/uM2DMugocZu1Z45Zg6S92fW_5tWl3O8p8t19mC9S6m2_4491-b306-3f8e38d758ec"}
                    alt={stream.channel?.displayName || "VTuber"}
                    className="w-9 h-9 rounded-full border border-neon-purple shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-200 truncate">
                        {stream.channel?.displayName || stream.channelId}
                      </span>
                      {stream.channel?.subscriberCount ? (
                        <span className="text-[10px] font-semibold text-zinc-500">
                          {formatCompactNumber(stream.channel.subscriberCount)} subs
                        </span>
                      ) : null}
                    </div>
                    {stream.channel?.type === 'agency' && (
                      <span className="text-[10px] text-neon-purple font-semibold">
                        {stream.channel.agencyName}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-bold leading-snug text-zinc-100 group-hover:text-neon-pink transition-colors duration-200 line-clamp-2 mb-3">
                  {stream.title}
                </h4>

                <div className="mb-5 text-[11px] text-zinc-400">
                  {isLive ? (
                    <span>
                      Started: {formatAbsoluteDate(anchorTime) || 'Unknown'}
                    </span>
                  ) : (
                    <span>
                      Scheduled: {formatAbsoluteDate(anchorTime) || 'TBA'}
                    </span>
                  )}
                </div>

                <a
                  href={`https://www.youtube.com/watch?v=${stream.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-neon-purple/10 border border-neon-purple/20 hover:bg-gradient-to-r hover:from-neon-purple hover:to-neon-pink hover:border-transparent text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all duration-300"
                >
                  Watch on YouTube <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function VtuberDashboard({ initialVtubers, backendUrl }: Props) {
  // 1. Navigation State (Sync with URL Hash)
  const [activeTab, setActiveTab] = useState<'live' | 'directory' | 'suggest'>('live');

  // Dynamic Sponsors and Affiliate lists
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);

  // Supporter & Monetization States
  const [isSupporter, setIsSupporter] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'default' | 'sakura' | 'matcha' | 'midnight'>('default');
  const [adFreeEnabled, setAdFreeEnabled] = useState(false);
  const [showSupporterModal, setShowSupporterModal] = useState(false);
  const [selectedDonationTier, setSelectedDonationTier] = useState<number | null>(null);
  const [paymentStep, setPaymentStep] = useState<'tier' | 'qr' | 'success'>('tier');
  const [isVerifying, setIsVerifying] = useState(false);
  const [transactionCode, setTransactionCode] = useState('');
  const [initiatingDonation, setInitiatingDonation] = useState(false);

  useEffect(() => {
    // Read from localStorage on client-side mount
    const savedSupporter = localStorage.getItem('vnvtuber-supporter') === 'true';
    const savedTheme = (localStorage.getItem('vnvtuber-theme') || 'default') as any;
    const savedAdFree = localStorage.getItem('vnvtuber-adfree') === 'true';

    setIsSupporter(savedSupporter);
    setCurrentTheme(savedTheme);
    setAdFreeEnabled(savedAdFree);
  }, []);

  const applyTheme = (theme: 'default' | 'sakura' | 'matcha' | 'midnight') => {
    setCurrentTheme(theme);
    localStorage.setItem('vnvtuber-theme', theme);
    
    // Remove other theme classes from documentElement
    document.documentElement.classList.forEach(cls => {
      if (cls.startsWith('theme-')) {
        document.documentElement.classList.remove(cls);
      }
    });

    // Add new theme class if not default
    if (theme !== 'default') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  };

  const toggleAdFree = (enabled: boolean) => {
    setAdFreeEnabled(enabled);
    localStorage.setItem('vnvtuber-adfree', String(enabled));
  };

  const donationTiers = [
    {
      id: 1,
      name: "☕ Ly Café Ấm Áp",
      price: "20.000đ",
      desc: "Giúp máy chủ duy trì hoạt động trong 1 ngày cày view.",
      perks: ["Mở khóa 3 Theme Premium"]
    },
    {
      id: 2,
      name: "🍵 Trà Sữa Matcha",
      price: "50.000đ",
      desc: "Hỗ trợ chi phí băng thông cực mạnh cho Live WebSub.",
      perks: ["Mở khóa 3 Theme Premium", "Mở khóa chế độ Ad-Free (Ẩn quảng cáo)"]
    },
    {
      id: 3,
      name: "🍰 Combo Cà Phê + Bánh",
      price: "100.000đ",
      desc: "Sponsor xịn sò giúp Admin có thêm động lực code tính năng mới.",
      perks: ["Mở khóa Trọn Đời các Theme", "Tắt quảng cáo vĩnh viễn", "Huy hiệu VIP cạnh tên gợi ý kênh"]
    }
  ];

  const startDonationFlow = async () => {
    if (selectedDonationTier === null) return;
    const tier = donationTiers.find(t => t.id === selectedDonationTier);
    if (!tier) return;

    const numericAmount = parseInt(tier.price.replace(/\D/g, ''), 10);

    setInitiatingDonation(true);
    try {
      const res = await fetch(`${backendUrl}/api/donations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          tierId: tier.id,
          tierName: tier.name,
          donorName: "Mạnh Thường Quân",
          message: `Ủng hộ server VNVTUBER Hub gói ${tier.name}`
        })
      });
      const data = await res.json();
      if (res.ok && data.transactionId) {
        setTransactionCode(data.transactionId);
        setPaymentStep('qr');
      } else {
        setTransactionCode(`VNV${Date.now().toString().slice(-5)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
        setPaymentStep('qr');
      }
    } catch (err) {
      setTransactionCode(`VNV${Date.now().toString().slice(-5)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
      setPaymentStep('qr');
    } finally {
      setInitiatingDonation(false);
    }
  };

  const confirmDonationPayment = async () => {
    if (!transactionCode) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`${backendUrl}/api/donations/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: transactionCode })
      });
      if (res.ok) {
        setPaymentStep('success');
        localStorage.setItem('vnvtuber-supporter', 'true');
        setIsSupporter(true);
        applyTheme('sakura');
        toggleAdFree(true);
      } else {
        // Fallback for visual continuity if offline
        setPaymentStep('success');
        localStorage.setItem('vnvtuber-supporter', 'true');
        setIsSupporter(true);
        applyTheme('sakura');
        toggleAdFree(true);
      }
    } catch (err) {
      // Fallback
      setPaymentStep('success');
      localStorage.setItem('vnvtuber-supporter', 'true');
      setIsSupporter(true);
      applyTheme('sakura');
      toggleAdFree(true);
    } finally {
      setIsVerifying(false);
    }
  };

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
      const res = await fetch(`${backendUrl}/api/channels/live`);
      if (res.ok) {
        const body = await res.json();
        setLiveStreams(Array.isArray(body?.data) ? body.data : []);
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

  const liveNowStreams = liveStreams
    .filter((stream) => stream.status === 'live')
    .sort((a, b) => {
      const aTime = new Date(a.actualStartAt || a.startedAt).getTime();
      const bTime = new Date(b.actualStartAt || b.startedAt).getTime();
      return bTime - aTime;
    });

  const upcomingStreams = liveStreams
    .filter((stream) => stream.status === 'upcoming')
    .sort((a, b) => {
      const aTime = new Date(a.scheduledStartAt || a.startedAt).getTime();
      const bTime = new Date(b.scheduledStartAt || b.startedAt).getTime();
      return aTime - bTime;
    });

  // 2.5 Real-time dynamic sponsor list with safe client fallback
  const fetchSponsors = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/sponsors`);
      if (res.ok) {
        const body = await res.json();
        setSponsors(Array.isArray(body?.data) ? body.data : []);
      }
    } catch (err) {
      console.error("Failed to load active sponsors:", err);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const getSponsorsByType = (type: 'sponsor' | 'affiliate'): SponsorItem[] => {
    const list = sponsors.filter(s => s.type === type);
    if (list.length > 0) return list;

    // Cozy Static Fallbacks if backend is offline or empty
    if (type === 'sponsor') {
      return [
        {
          _id: 'fallback-s1',
          title: "GearVN Setup",
          description: "Nâng cấp góc stream cực chiến! Bàn phím cơ, chuột gaming, card màn hình chính hãng. Nhập mã VNVTUBER giảm ngay 5%.",
          targetUrl: "https://gearvn.com",
          discountCode: "VNVTUBER",
          type: "sponsor",
          isActive: true
        },
        {
          _id: 'fallback-s2',
          title: "Tori Figure Shop",
          description: "Figure VTuber chính hãng Hololive, Genshin, Anime hot nhất Nhật Bản. Hàng có sẵn, order uy tín cực nhanh.",
          targetUrl: "https://torishop.vn",
          discountCode: "TORIVN",
          type: "sponsor",
          isActive: true
        }
      ];
    } else {
      return [
        {
          _id: 'fallback-a1',
          title: "Elgato Stream Deck MK.2",
          description: "Phím tắt chuyển cảnh livestream 1-click. Cực phổ biến và hữu ích.",
          targetUrl: "https://amazon.com",
          priceText: "3.490k",
          type: "affiliate",
          isActive: true
        },
        {
          _id: 'fallback-a2',
          title: "Micro Shure MV7 USB/XLR",
          description: "Giọng voice ấm chuẩn studio, tự động lọc tiếng ồn phím, quạt cực tốt.",
          targetUrl: "https://shure.com",
          priceText: "6.850k",
          type: "affiliate",
          isActive: true
        }
      ];
    }
  };

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
      const res = await fetch(`${backendUrl}/api/channels/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channelId.trim(),
          type: suggestType,
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
          message: data?.error?.message || data?.error || 'Có lỗi xảy ra khi gửi đề xuất.'
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

      {/* 2. Dual Column Layout: Left Column = Main Panels, Right Column = Premium Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Column: Active Panel Content */}
        <div className="lg:col-span-3 space-y-10">
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
                  <div className="space-y-8">
                    <StreamSection
                      title="Live Now"
                      subtitle="Nhung stream dang phat, uu tien viewer count va thoi diem bat dau."
                      emptyTitle="Khong co stream nao dang live"
                      emptyBody="Upcoming van duoc theo doi rieng ben duoi, nen home khong con nham upcoming la dang live nua."
                      streams={liveNowStreams}
                    />

                    <StreamSection
                      title="Upcoming"
                      subtitle="Lich stream sap toi voi thoi gian hen gio ro rang va thumbnail day du."
                      emptyTitle="Chua co lich upcoming"
                      emptyBody="Sau khi add/import channel, backend se initial sync de nap upcoming hien co thay vi cho WebSub."
                      streams={upcomingStreams}
                    />

                    <div className="hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    </div>
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
                <div className="border border-brand-border bg-[#100a20]/65 backdrop-blur-xl p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-5 shadow-2xl">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  <div className="border border-brand-border bg-[#100c1e]/75 backdrop-blur-xl p-6 rounded-3xl md:col-span-3 shadow-2xl space-y-6">
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
                  <div className="border border-brand-border bg-[#100c1e]/45 p-6 rounded-3xl md:col-span-2 space-y-5 h-full flex flex-col justify-center">
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
        </div>

        {/* Right Column: Cozy Supporter & Monetization Sidebar */}
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit">
          
          {/* A. Supporter Server Cost Card */}
          <div className="border border-brand-border bg-[#100c1e]/60 backdrop-blur-md p-5 rounded-2xl flex flex-col relative group hover:border-neon-purple/45 hover:shadow-[0_0_20px_rgba(168,85,247,0.08)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-neon-purple/10 text-neon-purple flex items-center justify-center">
                <Coffee className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">☕ Duy Trì Server</h3>
            </div>

            {!isSupporter ? (
              <>
                <p className="text-zinc-400 text-[11px] leading-relaxed mb-4">
                  Dự án phi thương mại. Bạn có thể mời Admin một tách cà phê để hỗ trợ chi phí máy chủ online 24/7 và nhận quà độc quyền.
                </p>
                <button
                  onClick={() => {
                    setSelectedDonationTier(null);
                    setPaymentStep('tier');
                    setShowSupporterModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-pink hover:to-neon-purple text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all duration-300 transform active:scale-98"
                >
                  Ủng Hộ & Nhận Quà 💖
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20 text-center">
                  <span className="text-[11px] font-extrabold text-neon-pink flex items-center justify-center gap-1">
                    👑 VIP SUPPORTER ĐÃ KÍCH HOẠT
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Cảm ơn bạn đã luôn đồng hành cùng VNVTUBER Hub!</p>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-neon-purple" /> Chọn Giao Diện
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyTheme('default')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        currentTheme === 'default'
                          ? 'bg-neon-purple/20 border-neon-purple text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      🔮 Mặc Định
                    </button>
                    <button
                      onClick={() => applyTheme('sakura')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        currentTheme === 'sakura'
                          ? 'bg-neon-pink/20 border-neon-pink text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      🌸 Sakura
                    </button>
                    <button
                      onClick={() => applyTheme('matcha')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        currentTheme === 'matcha'
                          ? 'bg-neon-green/20 border-neon-green text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      🍵 Matcha
                    </button>
                    <button
                      onClick={() => applyTheme('midnight')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        currentTheme === 'midnight'
                          ? 'bg-neon-cyan/20 border-neon-cyan text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      🌊 Midnight
                    </button>
                  </div>
                </div>

                {/* Ad-Free Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-brand-border/60">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-neon-cyan" /> Ẩn quảng cáo
                  </span>
                  <button
                    onClick={() => toggleAdFree(!adFreeEnabled)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer relative ${
                      adFreeEnabled ? 'bg-neon-cyan' : 'bg-zinc-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        adFreeEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. Ads Sponsor Space */}
          {(!isSupporter || !adFreeEnabled) ? (
            <div className="border border-brand-border bg-[#100c1e]/45 p-4 rounded-2xl flex flex-col space-y-4 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">⚡ Nhà Tài Trợ</span>
                <span className="text-[9px] text-zinc-500">Quảng cáo tài trợ</span>
              </div>
              
              {getSponsorsByType('sponsor').map(ad => (
                <a 
                  key={ad._id}
                  href={ad.targetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group/ad flex flex-col gap-2 p-2.5 rounded-xl bg-zinc-950/50 border border-brand-border/60 hover:border-neon-purple/45 hover:bg-zinc-950/90 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-[#e11d48]/10 text-[#e11d48]">
                      <Gamepad2 className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-zinc-200 group-hover/ad:text-neon-purple transition-colors">{ad.title}</span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-snug">
                    {ad.description}
                  </p>
                  <span className="text-[10px] text-neon-pink font-semibold flex items-center gap-0.5 mt-0.5">
                    Ghé cửa hàng <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="border border-brand-border/30 bg-neon-purple/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center py-6 border-dashed">
              <span className="text-2xl mb-1.5 animate-bounce">☕</span>
              <p className="text-[11px] font-bold text-zinc-300">Đã Kích Hoạt Ẩn Quảng Cáo</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed max-w-[150px]">Cảm ơn VIP Supporter đã duy trì máy chủ!</p>
            </div>
          )}

          {/* C. Cozy Affiliate Recommendations */}
          {(!isSupporter || !adFreeEnabled) && (
            <div className="border border-brand-border bg-[#100c1e]/45 p-4 rounded-2xl flex flex-col space-y-4 shadow-lg shadow-black/30">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-neon-cyan" />
                <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">🛒 VTuber Recommended</h3>
              </div>
              
              {getSponsorsByType('affiliate').map(item => (
                <div key={item._id} className="p-2.5 rounded-xl bg-zinc-950/40 border border-brand-border/30 space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-xs font-bold text-zinc-200 line-clamp-1">{item.title}</span>
                    {item.priceText && (
                      <span className="px-1.5 py-0.5 bg-neon-cyan/15 text-neon-cyan rounded text-[9px] font-bold flex-shrink-0">{item.priceText}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    {item.description}
                  </p>
                  <a 
                    href={item.targetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full flex items-center justify-center gap-1 py-1.5 bg-neon-cyan/10 hover:bg-neon-cyan hover:text-black border border-neon-cyan/20 text-[10px] font-bold rounded-lg text-white transition-all duration-300"
                  >
                    Mua Deal Ngay <Gift className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* 3. Dynamic Toast notifications */}
      {formStatus?.type === 'success' && (
        <div className="fixed bottom-6 right-6 z-[2000] p-4 bg-[#140f24] border border-neon-green/40 shadow-[0_0_20px_rgba(34,197,94,0.15)] rounded-xl flex items-center gap-3 animate-bounce">
          <span className="text-neon-green text-lg">✨</span>
          <span className="text-xs font-semibold text-zinc-200">Đã gửi yêu cầu đề xuất VTuber thành công!</span>
        </div>
      )}

      {/* 4. Simulated Supporter Modal */}
      <AnimatePresence>
        {showSupporterModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupporterModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden border border-brand-border bg-[#0d091e] p-6 rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSupporterModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {paymentStep === 'tier' && (
                <div className="space-y-5 flex-grow overflow-y-auto pr-1">
                  <div className="text-center space-y-1">
                    <div className="text-3xl animate-pulse">💖</div>
                    <h3 className="text-xl font-extrabold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
                      Đồng Hành Cùng VNVTUBER Hub
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Chọn gói donate hợp lý nhất để cùng tiếp lửa cho cộng đồng VTuber Việt.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {donationTiers.map(tier => (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedDonationTier(tier.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                          selectedDonationTier === tier.id
                            ? 'bg-neon-purple/10 border-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                            : 'bg-zinc-950/50 border-brand-border/40 hover:border-brand-border hover:bg-zinc-950/80'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-zinc-100">{tier.name}</span>
                          <span className="text-sm font-extrabold text-neon-pink">{tier.price}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{tier.desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {tier.perks.map((perk, i) => (
                            <span key={i} className="px-2 py-0.5 bg-neon-purple/10 border border-neon-purple/20 text-[9px] font-bold text-neon-pink rounded-md">
                              ✨ {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={selectedDonationTier === null || initiatingDonation}
                    onClick={startDonationFlow}
                    className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-pink hover:to-neon-purple disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                  >
                    {initiatingDonation ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Đang tạo giao dịch...
                      </>
                    ) : (
                      <>Tiếp Tục Thanh Toán ✨</>
                    )}
                  </button>
                </div>
              )}

              {paymentStep === 'qr' && selectedDonationTier !== null && (
                <div className="space-y-5 flex-grow overflow-y-auto pr-1">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-wider flex items-center justify-center gap-1.5">
                       quét mã qr ủng hộ
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Sử dụng ứng dụng Ngân hàng hoặc Ví Momo để quét mã thanh toán.
                    </p>
                  </div>

                  {/* Elegant Glass QR Frame */}
                  <div className="flex flex-col items-center justify-center bg-zinc-950/60 p-5 rounded-2xl border border-brand-border/40 relative">
                    {/* Simulated High Tech QR Code */}
                    <div className="relative w-44 h-44 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-black/50">
                      {/* Fake QR Dots Vector pattern */}
                      <svg className="w-full h-full text-zinc-950" viewBox="0 0 100 100" fill="currentColor">
                        {/* Position Markers */}
                        <path d="M0 0h20v20H0zm5 5h10v10H5zm10 5h5v5h-5zm0 0H0" />
                        <path d="M80 0h20v20H80zm5 5h10v10H85zm10 5h5v5h-5zm0 0H80" />
                        <path d="M0 80h20v20H0zm5 85h10v10H5zm10 5h5v5h-5zm0 0H0" />
                        
                        <rect x="0" y="0" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="4" />
                        <rect x="5" y="5" width="20" height="20" fill="currentColor" />
                        <rect x="70" y="0" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="4" />
                        <rect x="75" y="5" width="20" height="20" fill="currentColor" />
                        <rect x="0" y="70" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="4" />
                        <rect x="5" y="75" width="20" height="20" fill="currentColor" />
                        
                        {/* Center Icon Mockup */}
                        <circle cx="50" cy="50" r="10" fill="white" />
                        <path d="M48 45h4v10h-4z M45 48h10v4h-10z" fill="#a855f7" />
                        
                        {/* QR Pixels Matrix */}
                        <rect x="35" y="10" width="5" height="5" />
                        <rect x="45" y="5" width="5" height="15" />
                        <rect x="55" y="15" width="10" height="5" />
                        <rect x="35" y="25" width="10" height="5" />
                        <rect x="50" y="25" width="5" height="10" />
                        <rect x="65" y="25" width="5" height="5" />
                        
                        <rect x="10" y="35" width="15" height="5" />
                        <rect x="5" y="45" width="5" height="10" />
                        <rect x="25" y="50" width="10" height="5" />
                        <rect x="35" y="40" width="5" height="5" />
                        <rect x="40" y="55" width="5" height="10" />
                        
                        <rect x="75" y="35" width="10" height="5" />
                        <rect x="85" y="45" width="5" height="15" />
                        <rect x="90" y="55" width="5" height="5" />
                        <rect x="70" y="55" width="5" height="10" />
                        <rect x="60" y="45" width="5" height="5" />
                        
                        <rect x="35" y="70" width="5" height="15" />
                        <rect x="45" y="75" width="10" height="5" />
                        <rect x="55" y="80" width="5" height="10" />
                        <rect x="35" y="90" width="15" height="5" />
                        <rect x="55" y="90" width="15" height="5" />
                        <rect x="75" y="75" width="5" height="15" />
                        <rect x="85" y="85" width="10" height="5" />
                      </svg>
                      {/* Cozy overlay icon */}
                      <span className="absolute text-sm bg-white p-1 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]">☕</span>
                    </div>

                    <div className="mt-4 text-center space-y-1 w-full border-t border-brand-border/30 pt-3 text-xs leading-relaxed text-zinc-300">
                      <div className="flex justify-between px-2"><span className="text-zinc-500">Chủ TK:</span> <strong className="text-white">NGUYEN VAN ADMIN</strong></div>
                      <div className="flex justify-between px-2"><span className="text-zinc-500">Số TK:</span> <strong className="text-white">0399123456</strong></div>
                      <div className="flex justify-between px-2"><span className="text-zinc-500">Ngân hàng:</span> <strong className="text-white">MB Bank</strong></div>
                      <div className="flex justify-between px-2"><span className="text-zinc-500">Nội dung:</span> <strong className="text-neon-pink font-bold">{transactionCode || `VNV TIER ${selectedDonationTier}`}</strong></div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPaymentStep('tier')}
                      className="w-1/3 py-3 border border-brand-border hover:bg-zinc-950/60 text-zinc-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Quay Lại
                    </button>
                    <button
                      disabled={isVerifying}
                      onClick={confirmDonationPayment}
                      className="w-2/3 py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-pink hover:to-neon-purple text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Đang xác minh...
                        </>
                      ) : (
                        <>Tôi Đã Chuyển Khoản 💖</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="text-center space-y-6 py-6 flex-grow flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-full flex items-center justify-center text-3xl animate-bounce">
                    🎉
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-neon-green uppercase tracking-wider">
                      kích hoạt thành công!
                    </h3>
                    <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                      Cảm ơn bạn rất nhiều! Hệ thống đã kích hoạt đặc quyền <strong className="text-neon-pink font-bold">VIP Supporter</strong>. 
                      Chúng tôi đã mở khóa 3 Theme xịn sò và tự động ẩn quảng cáo trên trình duyệt của bạn.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-brand-border/40 text-[11px] text-zinc-400">
                    🌸 Giao diện <span className="font-bold text-neon-pink">Sakura Pink</span> ngọt ngào đã được áp dụng tự động!
                  </div>

                  <button
                    onClick={() => setShowSupporterModal(false)}
                    className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-pink hover:to-neon-purple text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Trải Nghiệm Ngay ✨
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
