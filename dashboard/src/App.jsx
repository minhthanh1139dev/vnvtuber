import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';

// Services & Components
import api from './services/api';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import OverviewTab from './components/OverviewTab';
import ChannelsTab from './components/ChannelsTab';
import RegisterTab from './components/RegisterTab';

export default function App() {
  // Token State & Profiles
  const [token, setToken] = useState(api.getToken());
  const [adminProfile, setAdminProfile] = useState(api.getProfile());

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState('overview');
  const [channels, setChannels] = useState([]);
  const [stats, setStats] = useState({
    totalChannels: 0,
    subscriptionBreakdown: {}
  });
  const [activeStreams, setActiveStreams] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  
  // Interface Operations State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [formStatus, setFormStatus] = useState(null);

  // Helper alerts
  const showNotice = (type, message) => {
    setFormStatus({ type, message });
    setTimeout(() => setFormStatus(null), 5000);
  };

  // Auth Callbacks
  const handleLoginSuccess = (newToken, profile) => {
    setToken(newToken);
    setAdminProfile(profile);
  };

  const handleLogout = () => {
    api.logout();
    setToken('');
    setAdminProfile(null);
  };

  // Bind API unauthorized trigger to clear session in UI
  useEffect(() => {
    api.registerOnUnauthorized(() => {
      setToken('');
      setAdminProfile(null);
    });
  }, []);

  // Fetch Administration Data State
  const fetchStatusData = async () => {
    if (!token) return;
    try {
      const data = await api.getStatus();
      setStats(data.stats || { totalChannels: 0, subscriptionBreakdown: {} });
      setActiveStreams(data.activeStreams || []);
      setRecentHistory(data.recentHistory || []);
    } catch (err) {
      console.error("Failed to fetch dashboard stats status:", err);
    }
  };

  const fetchChannelsData = async () => {
    if (!token) return;
    try {
      const data = await api.getChannels();
      setChannels(data || []);
    } catch (err) {
      console.error("Failed to fetch VTubers list directory:", err);
    }
  };

  const fetchAllDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    await Promise.all([fetchStatusData(), fetchChannelsData()]);
    setLoading(false);
  };

  // Periodic Polling and Initial Ingest Trigger
  useEffect(() => {
    if (token) {
      fetchAllDashboardData();
      const interval = setInterval(fetchStatusData, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Synchronize Google WebSub Renewals
  const handleSyncWebSub = async () => {
    setSyncing(true);
    try {
      const res = await api.syncWebSub();
      if (res.ok) {
        showNotice('success', 'Đã kích hoạt tiến trình quét và gia hạn WebSub thành công!');
        await fetchStatusData();
      } else {
        showNotice('error', 'Yêu cầu đồng bộ thất bại. Vui lòng kiểm tra log server.');
      }
    } catch (err) {
      showNotice('error', 'Có lỗi kết nối mạng xảy ra.');
    } finally {
      setSyncing(false);
    }
  };

  // ==========================================
  // RENDER SECURITY SCREEN
  // ==========================================
  if (!token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} showNotice={showNotice} />;
  }

  // ==========================================
  // RENDER MODULAR LAYOUT
  // ==========================================
  return (
    <div className="flex h-screen overflow-hidden text-zinc-100 font-body">
      {/* 1. Sleek Navigation Sidebar Component */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        adminProfile={adminProfile} 
        onLogout={handleLogout} 
      />

      {/* 2. Main Content Frame */}
      <main className="flex-grow flex flex-col overflow-hidden">
        {/* Top Header navbar bar */}
        <header className="h-16 border-b border-brand-border bg-[#0d091e]/85 backdrop-blur-md flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-2">
            <Radio className="w-4.5 h-4.5 text-neon-red animate-pulse" />
            <span className="text-sm font-bold text-zinc-200">Trạng Thái Hệ Thống:</span>
            <span className="px-2 py-0.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/20 text-[10px] font-extrabold uppercase">
              Đang hoạt động (Online)
            </span>
          </div>

          <button
            onClick={handleSyncWebSub}
            disabled={syncing}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-neon-purple/10 border border-neon-purple/20 hover:bg-neon-purple hover:border-transparent text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-all duration-300 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Đồng Bộ WebSub 🔄
          </button>
        </header>

        {/* Dynamic Views Viewport scrollable */}
        <div className="flex-grow overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <OverviewTab 
                  stats={stats} 
                  activeStreams={activeStreams} 
                  recentHistory={recentHistory} 
                />
              </motion.div>
            )}

            {activeTab === 'channels' && (
              <motion.div
                key="channels"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <ChannelsTab channels={channels} />
              </motion.div>
            )}

            {activeTab === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <RegisterTab 
                  onSingleRegisterSuccess={fetchAllDashboardData} 
                  onBulkImportSuccess={fetchAllDashboardData} 
                  formStatus={formStatus} 
                  setFormStatus={setFormStatus} 
                  showNotice={showNotice} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
