import React from 'react';
import { Sparkles, LayoutDashboard, Users, UserPlus, LogOut } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, adminProfile, onLogout }) {
  return (
    <aside className="w-64 flex-shrink-0 bg-[#0c081a]/95 border-r border-brand-border flex flex-col justify-between z-30">
      <div>
        {/* Logo Brand */}
        <div className="p-6 border-b border-brand-border flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-neon-pink animate-pulse" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            VN<span className="bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">Vtuber</span> Admin
          </span>
        </div>

        {/* Nav Items */}
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'overview' 
                ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-pink/30 text-white shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#150f28]/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-neon-purple" />
            Tổng Quan Hệ Thống
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'channels' 
                ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-pink/30 text-white shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#150f28]/50'
            }`}
          >
            <Users className="w-4 h-4 text-neon-cyan" />
            Danh Sách VTuber
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'register' 
                ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-pink/30 text-white shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#150f28]/50'
            }`}
          >
            <UserPlus className="w-4 h-4 text-neon-pink" />
            Thêm & Import
          </button>
        </nav>
      </div>

      {/* Admin profile & logout */}
      <div className="p-4 border-t border-brand-border flex items-center justify-between gap-3 bg-[#0d091e]/50">
        <div className="flex items-center gap-2 truncate">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-xs font-bold text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            {adminProfile?.displayName?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-bold text-zinc-200 truncate">{adminProfile?.displayName || 'Admin'}</span>
            <span className="text-[9px] text-zinc-500 uppercase font-semibold">{adminProfile?.role || 'Administrator'}</span>
          </div>
        </div>

        <button 
          onClick={onLogout}
          title="Đăng xuất"
          className="p-1.5 rounded-lg bg-zinc-800/40 hover:bg-neon-red/10 text-zinc-400 hover:text-neon-red border border-transparent hover:border-neon-red/20 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
