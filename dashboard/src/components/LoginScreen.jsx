import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, User, Lock, RotateCw, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  username: z.string().min(1, 'Nhập username'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});

export default function LoginScreen({ onLoginSuccess }) {
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async ({ username, password }) => {
    setLoginError('');
    try {
      const { ok, data, error } = await api.login(username.trim(), password.trim());
      if (ok && data?.token) {
        onLoginSuccess(data.token, data.user);
        reset();
      } else {
        setLoginError(error || 'Đăng nhập không thành công.');
      }
    } catch {
      setLoginError('Không thể kết nối tới máy chủ xác thực.');
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute top-1/4 left-1/4 size-80 rounded-full bg-neon-purple/20 blur-[100px]" />
      <div className="absolute right-1/4 bottom-1/4 size-80 rounded-full bg-neon-pink/15 blur-[120px]" />

      <Card className="relative z-10 w-full max-w-md border-brand-border">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-16 items-center justify-center rounded-2xl border border-neon-pink/30 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20">
            <Sparkles className="size-8 animate-pulse text-neon-pink" />
          </div>
          <CardTitle className="text-2xl">
            VN<span className="bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">Vtuber</span>{' '}
            Admin
          </CardTitle>
          <CardDescription>Đăng nhập bằng tài khoản quản trị hệ thống</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input id="username" placeholder="admin" className="pl-9" {...register('username')} />
              </div>
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9" {...register('password')} />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <RotateCw className="animate-spin" />
              ) : (
                <>
                  <ShieldCheck />
                  Xác thực đăng nhập
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[10px] text-muted-foreground">
            Chưa có admin? Chạy <code className="text-foreground/80">scripts/seed-admin.mongosh.js</code> trên MongoDB.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
