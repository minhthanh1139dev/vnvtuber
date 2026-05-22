import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ChannelsOverviewChart({ channels }) {
  const data = channels.slice(0, 8).map((ch) => ({
    name: (ch.displayName || ch.channelId || '').slice(0, 12),
    subs: Math.round((ch.subscriberCount || 0) / 1000),
    live: ch.subscriptionStatus === 'subscribed' ? 1 : 0,
  }));

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tổng quan kênh</CardTitle>
        <CardDescription>Subscribers (nghìn) — top {data.length} kênh</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.15)" />
            <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: '#0d091e',
                border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: 8,
              }}
            />
            <Bar dataKey="subs" fill="#a855f7" radius={[4, 4, 0, 0]} name="Sub (k)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
