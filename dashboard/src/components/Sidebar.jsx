import { Sparkles, Users, Key, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function Sidebar({ activeTab, setActiveTab, adminProfile, onLogout }) {
  const navItem = (tab, icon, label) => (
    <Button
      key={tab}
      type="button"
      variant="ghost"
      onClick={() => setActiveTab(tab)}
      className={cn(
        'h-auto w-full justify-start gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider',
        activeTab === tab
          ? 'border border-neon-pink/30 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 text-white shadow-[0_0_15px_rgba(236,72,153,0.1)]'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </Button>
  );

  return (
    <aside className="z-30 flex w-64 shrink-0 flex-col justify-between border-r border-brand-border bg-[#0c081a]/95">
      <div>
        <div className="flex items-center gap-2 border-b border-brand-border p-6">
          <Sparkles className="size-5 animate-pulse text-neon-pink" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            VN<span className="bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">Vtuber</span>
          </span>
        </div>

        <nav className="space-y-2 p-4">
          {navItem('channels', <Users className="size-4 text-neon-cyan" />, 'Kênh')}
          {navItem('google-api-keys', <Key className="size-4 text-neon-purple" />, 'Google API Key')}
        </nav>
      </div>

      <div className="space-y-3 p-4">
        <Separator className="bg-brand-border" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-neon-purple to-neon-pink text-xs font-bold text-white">
              {adminProfile?.displayName?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{adminProfile?.displayName || 'Admin'}</p>
              <p className="text-[9px] font-semibold uppercase text-muted-foreground">{adminProfile?.role || 'admin'}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onLogout} title="Đăng xuất">
            <LogOut className="size-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
