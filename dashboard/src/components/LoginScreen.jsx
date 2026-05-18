import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, Lock, RotateCw, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function LoginScreen({ onLoginSuccess, showNotice }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) return;

    setLoginError('');
    setIsLoggingIn(true);
    try {
      const { ok, data } = await api.login(usernameInput.trim(), passwordInput.trim());
      if (ok) {
        onLoginSuccess(data.token, data.user);
        setUsernameInput('');
        setPasswordInput('');
      } else {
        setLoginError(data.error || 'Đăng nhập không thành công.');
      }
    } catch (err) {
      setLoginError('Không thể kết nối tới máy chủ xác thực.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSetupAdmin = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) return;

    setLoginError('');
    setIsLoggingIn(true);
    try {
      const { ok, data } = await api.setupAdmin(usernameInput.trim(), passwordInput.trim());
      if (ok) {
        showNotice('success', 'Đã cài đặt tài khoản Super Admin ban đầu thành công! Vui lòng đăng nhập.');
        setShowSetup(false);
      } else {
        setLoginError(data.error || 'Cài đặt tài khoản thất bại.');
      }
    } catch (err) {
      setLoginError('Có lỗi xảy ra khi kết nối máy chủ.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-height-screen w-screen flex items-center justify-center relative p-4 bg-[#07050c] overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Floating gradient glow elements */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-neon-purple/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-pink/15 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass p-8 rounded-3xl relative z-10 border border-brand-border flex flex-col items-center"
      >
        {/* Glowing Crown Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-pink/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(236,72,153,0.15)]">
          <Sparkles className="w-8 h-8 text-neon-pink animate-pulse" />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white text-center tracking-tight">
          VN<span className="bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">Vtuber</span> Admin Panel
        </h2>
        <p className="text-zinc-400 text-xs mt-1 text-center font-medium">
          {showSetup ? 'Cài đặt tài khoản quản trị tối cao ban đầu' : 'Đăng nhập bằng tài khoản quản trị hệ thống'}
        </p>

        <form onSubmit={showSetup ? handleSetupAdmin : handleLogin} className="w-full mt-8 space-y-4">
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-zinc-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="admin"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#0d091e]/90 border border-brand-border rounded-xl py-3 pl-11 pr-4 text-xs outline-none text-zinc-100 focus:border-neon-purple/75 transition-all duration-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Mật Khẩu</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#0d091e]/90 border border-brand-border rounded-xl py-3 pl-11 pr-4 text-xs outline-none text-zinc-100 focus:border-neon-purple/75 transition-all duration-300"
              />
            </div>
          </div>

          {loginError && (
            <div className="flex gap-2 p-3 rounded-lg bg-neon-red/10 border border-neon-red/20 text-neon-red text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-pink hover:to-neon-purple text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all duration-300 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                {showSetup ? 'Khởi Tạo Tài Khoản 🚀' : 'Xác Thực Đăng Nhập 🔓'}
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => {
            setShowSetup(!showSetup);
            setLoginError('');
          }}
          className="text-[10px] text-zinc-500 hover:text-neon-pink transition-colors font-semibold mt-6 uppercase tracking-wider underline cursor-pointer"
        >
          {showSetup ? 'Quay lại đăng nhập' : 'Cài đặt ban đầu (Setup)'}
        </button>
      </motion.div>
    </div>
  );
}
