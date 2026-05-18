import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Sparkles, Layers, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';
import api from '../services/api';

export default function RegisterTab({ onSingleRegisterSuccess, onBulkImportSuccess, formStatus, setFormStatus, showNotice }) {
  // Single registration form state
  const [regId, setRegId] = useState('');
  const [regName, setRegName] = useState('');
  const [regType, setRegType] = useState('independent');
  const [regAgency, setRegAgency] = useState('');

  // Bulk import form state
  const [bulkData, setBulkData] = useState('');

  const handleSingleRegister = async (e) => {
    e.preventDefault();
    if (!regId.trim()) return;

    setFormStatus({ type: 'loading', message: 'Đang gửi đăng ký...' });
    try {
      const { ok, data } = await api.addChannel(
        regId.trim(),
        regName.trim(),
        regType,
        regType === 'agency' ? regAgency.trim() : ''
      );

      if (ok) {
        showNotice('success', `Đã đăng ký thành công kênh: ${regId}`);
        setRegId('');
        setRegName('');
        setRegAgency('');
        onSingleRegisterSuccess();
      } else {
        showNotice('error', data.error || 'Đăng ký thất bại.');
      }
    } catch (err) {
      showNotice('error', 'Có lỗi kết nối máy chủ.');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkData.trim()) return;

    setFormStatus({ type: 'loading', message: 'Đang xử lý nhập số lượng lớn...' });
    try {
      let channelsList = [];
      const trimmed = bulkData.trim();
      
      if (trimmed.startsWith('[')) {
        try {
          channelsList = JSON.parse(trimmed);
        } catch (err) {
          showNotice('error', 'Định dạng JSON không hợp lệ.');
          return;
        }
      } else {
        const lines = trimmed.split('\n');
        channelsList = lines.map(line => {
          const parts = line.split(',');
          return {
            channelId: parts[0]?.trim(),
            displayName: parts[1]?.trim() || '',
            type: parts[2]?.trim() || 'independent',
            agencyName: parts[3]?.trim() || ''
          };
        }).filter(c => c.channelId && c.channelId.startsWith('UC'));
      }

      if (channelsList.length === 0) {
        showNotice('error', 'Không tìm thấy danh sách YouTube Channel ID hợp lệ.');
        return;
      }

      const { ok, data } = await api.importChannels(channelsList);

      if (ok) {
        showNotice('success', data.message || 'Nhập danh sách thành công!');
        setBulkData('');
        onBulkImportSuccess();
      } else {
        showNotice('error', data.error || 'Xử lý import thất bại.');
      }
    } catch (err) {
      showNotice('error', 'Có lỗi kết nối máy chủ.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-neon-pink" />
          Đăng Ký & Nhập Kênh Số Lượng Lớn
        </h2>
        <p className="text-zinc-400 text-sm mt-1">Đăng ký mới hoặc import hàng loạt VTuber vào hệ thống cơ sở dữ liệu MongoDB Aggregation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Single register */}
        <div className="glass p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-neon-purple" />
            Đăng ký Kênh Đơn Lẻ
          </h3>
          <form onSubmit={handleSingleRegister} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-id" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">YouTube Channel ID <span className="text-neon-red">*</span></label>
              <input
                id="reg-id"
                type="text"
                required
                placeholder="Ví dụ: UC_x5XG1OV2P6uZZ5FSM9Ttw"
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
                className="bg-[#080512]/90 border border-brand-border rounded-xl py-3 px-4 text-xs outline-none text-zinc-100 focus:border-neon-purple/75 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-name" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tên hiển thị (Tùy chọn)</label>
              <input
                id="reg-name"
                type="text"
                placeholder="Hệ thống tự nạp từ YouTube nếu bỏ trống"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="bg-[#080512]/90 border border-brand-border rounded-xl py-3 px-4 text-xs outline-none text-zinc-100 focus:border-neon-purple/75 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Loại hình</label>
                <select
                  value={regType}
                  onChange={(e) => setRegType(e.target.value)}
                  className="bg-[#080512]/90 border border-brand-border rounded-xl py-3 px-4 text-xs outline-none text-zinc-100 focus:border-neon-purple/75 cursor-pointer appearance-none"
                >
                  <option value="independent">Tự do (Independent)</option>
                  <option value="agency">Tổ chức (Agency)</option>
                </select>
              </div>

              {regType === 'agency' && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="reg-agency" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tên Agency</label>
                  <input
                    id="reg-agency"
                    type="text"
                    required
                    placeholder="Hololive, Nijisanji,..."
                    value={regAgency}
                    onChange={(e) => setRegAgency(e.target.value)}
                    className="bg-[#080512]/90 border border-brand-border rounded-xl py-3 px-4 text-xs outline-none text-zinc-100 focus:border-neon-purple/75 transition-colors"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-pink hover:to-neon-purple text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all duration-300"
            >
              Đăng Ký VTuber ✨
            </button>
          </form>
        </div>

        {/* Bulk import */}
        <div className="glass p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 mb-5">
            <Layers className="w-4 h-4 text-neon-cyan" />
            Import Danh Sách Hàng Loạt
          </h3>
          <form onSubmit={handleBulkImport} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="bulk" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Dữ liệu Import</label>
              <textarea
                id="bulk"
                rows={6}
                placeholder="Mỗi dòng một kênh kiểu: UCxxxx, Tên, independent&#10;Hoặc dán mảng JSON: [{&quot;channelId&quot;:&quot;UCxxx&quot;,&quot;type&quot;:&quot;independent&quot;}]"
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                className="bg-[#080512]/90 border border-brand-border rounded-xl py-3 px-4 text-xs outline-none text-zinc-100 focus:border-neon-cyan/75 transition-colors font-mono resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-neon-cyan to-neon-purple hover:from-neon-purple hover:to-neon-cyan text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all duration-300"
            >
              Kích hoạt Import Hàng Loạt 📦
            </button>
          </form>
        </div>
      </div>

      {/* Form operation Status alert notification */}
      <AnimatePresence>
        {formStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`flex gap-3 p-4 rounded-xl border ${
              formStatus.type === 'success' 
                ? 'bg-neon-green/5 border-neon-green/30 text-neon-green' 
                : formStatus.type === 'loading'
                ? 'bg-neon-purple/5 border-neon-purple/30 text-neon-purple'
                : 'bg-neon-red/5 border-neon-red/30 text-neon-red'
            }`}
          >
            {formStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : formStatus.type === 'loading' ? (
              <RotateCw className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                {formStatus.type === 'success' ? 'Thao tác thành công' : formStatus.type === 'loading' ? 'Đang thực thi' : 'Có lỗi phát sinh'}
              </span>
              <span className="text-xs text-zinc-300 leading-relaxed">{formStatus.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
