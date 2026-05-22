import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Radio, RotateCw } from 'lucide-react';

import api from '@/services/api';
import LoginScreen from '@/components/LoginScreen';
import Sidebar from '@/components/Sidebar';
import ChannelsTab from '@/components/ChannelsTab';
import GoogleApiKeysTab from '@/components/GoogleApiKeysTab';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Bắt buộc'),
    newPassword: z.string().min(8, 'Tối thiểu 8 ký tự'),
    confirmPassword: z.string().min(1, 'Bắt buộc'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Xác nhận mật khẩu chưa khớp',
    path: ['confirmPassword'],
  });

export default function App() {
  const [token, setToken] = useState(api.getToken());
  const [adminProfile, setAdminProfile] = useState(api.getProfile());
  const [activeTab, setActiveTab] = useState('channels');
  const [syncing, setSyncing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { toast, showNotice } = useToast();

  const {
    data: channels = [],
    isLoading,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const data = await api.getChannels();
      return data || [];
    },
    enabled: Boolean(token),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    api.registerOnUnauthorized(() => {
      setToken('');
      setAdminProfile(null);
    });
  }, []);

  const handleLoginSuccess = (newToken, profile) => {
    setToken(newToken);
    setAdminProfile(profile);
  };

  const handleLogout = () => {
    api.logout();
    setToken('');
    setAdminProfile(null);
  };

  const handleSyncWebSub = async () => {
    setSyncing(true);
    try {
      const res = await api.syncWebSub();
      if (res.ok) {
        showNotice('success', 'Đã kích hoạt đồng bộ WebSub.');
        await refetchChannels();
      } else {
        showNotice('error', 'Đồng bộ WebSub thất bại.');
      }
    } catch {
      showNotice('error', 'Lỗi kết nối máy chủ.');
    } finally {
      setSyncing(false);
    }
  };

  const resetPasswordForm = () => {
    reset();
  };

  const onChangePassword = async (values) => {
    try {
      const { ok, error, message } = await api.changePassword(values.currentPassword, values.newPassword);
      if (!ok) {
        setError('root', { message: error || 'Không thể đổi mật khẩu.' });
        return;
      }

      showNotice('success', message || 'Đã cập nhật mật khẩu.');
      setShowPasswordModal(false);
      resetPasswordForm();
    } catch {
      setError('root', { message: 'Lỗi kết nối máy chủ.' });
    }
  };

  if (!token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminProfile={adminProfile}
        onLogout={handleLogout}
      />

      <main className="flex grow flex-col overflow-hidden">
        <header className="z-20 flex h-16 items-center justify-between border-b border-brand-border bg-[#0d091e]/85 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Radio className="size-4 animate-pulse text-neon-red" />
            <span className="text-sm font-bold">Hệ thống</span>
            <Badge variant="success">Online</Badge>
            {isLoading && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Đang tải</span>}
          </div>

          <div className="flex items-center gap-3">
            {toast && (
              <Badge variant={toast.type === 'success' ? 'success' : 'destructive'}>{toast.message}</Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetPasswordForm();
                setShowPasswordModal(true);
              }}
            >
              Đổi mật khẩu
            </Button>

            <Button variant="default" size="sm" onClick={handleSyncWebSub} disabled={syncing}>
              <RotateCw className={syncing ? 'animate-spin' : ''} />
              Đồng bộ WebSub
            </Button>
          </div>
        </header>

        <div className="grow overflow-y-auto p-8">
          {activeTab === 'channels' && (
            <ChannelsTab channels={channels} onRefresh={refetchChannels} showNotice={showNotice} />
          )}
          {activeTab === 'google-api-keys' && <GoogleApiKeysTab showNotice={showNotice} />}
        </div>
      </main>

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu admin</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <Input id="currentPassword" type="password" {...register('currentPassword')} />
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input id="newPassword" type="password" {...register('newPassword')} />
              {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  resetPasswordForm();
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <RotateCw className="animate-spin" />}
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
