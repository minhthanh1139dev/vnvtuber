import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, UserPlus, Sparkles, Layers, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import ChannelsOverviewChart from '@/components/ChannelsOverviewChart';

const addChannelSchema = z.object({
  channelId: z.string().min(1, 'Channel ID bắt buộc').refine((v) => v.startsWith('UC'), 'Phải bắt đầu bằng UC'),
  displayName: z.string().optional(),
  type: z.enum(['independent', 'agency']),
  agencyName: z.string().optional(),
});

export default function ChannelsTab({ channels, onRefresh, showNotice }) {
  const [bulkData, setBulkData] = useState('');
  const [formStatus, setFormStatus] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addChannelSchema),
    defaultValues: { channelId: '', displayName: '', type: 'independent', agencyName: '' },
  });

  const regType = watch('type');

  const columns = useMemo(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Tên',
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div className="flex items-center gap-3">
              <img
                src={
                  v.avatarUrl ||
                  'https://yt3.ggpht.com/uM2DMugocZu1Z45Zg6S92fW_5tWl3O8p8t19mC9S6m2_4491-b306-3f8e38d758ec'
                }
                alt=""
                className="size-8 rounded-full border border-neon-purple"
              />
              <div>
                <span className="block font-bold">{v.displayName}</span>
                <span className="text-[10px] text-muted-foreground">{v.agencyName || 'Independent'}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'channelId',
        header: 'Channel ID',
        cell: ({ getValue }) => <span className="font-mono text-[10px] text-muted-foreground">{getValue()}</span>,
      },
      {
        accessorKey: 'subscriberCount',
        header: 'Sub',
        cell: ({ getValue }) => {
          const n = getValue();
          return <span className="font-bold">{n ? `${(n / 1000).toFixed(1)}k` : '0'}</span>;
        },
      },
      {
        accessorKey: 'type',
        header: 'Loại',
        cell: ({ getValue }) => (
          <Badge variant={getValue() === 'agency' ? 'default' : 'warning'}>{getValue() || 'independent'}</Badge>
        ),
      },
      {
        accessorKey: 'subscriptionStatus',
        header: 'WebSub',
        cell: ({ getValue }) => (
          <Badge variant={getValue() === 'subscribed' ? 'success' : 'warning'}>{getValue()}</Badge>
        ),
      },
      {
        accessorKey: 'expiresAt',
        header: () => <span className="block text-right">Hết hạn sub</span>,
        cell: ({ getValue }) => (
          <span className="block text-right font-mono text-[10px] text-muted-foreground">
            {getValue() ? new Date(getValue()).toLocaleDateString() : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const onSubmit = async (values) => {
    setFormStatus({ type: 'loading', message: 'Đang đăng ký kênh...' });
    try {
      const { ok, error } = await api.addChannel(
        values.channelId.trim(),
        (values.displayName || '').trim(),
        values.type,
        values.type === 'agency' ? (values.agencyName || '').trim() : '',
      );

      if (ok) {
        showNotice('success', `Đã đăng ký kênh: ${values.channelId.trim()}`);
        reset();
        setFormStatus(null);
        onRefresh();
      } else {
        setFormStatus({ type: 'error', message: error || 'Đăng ký thất bại.' });
      }
    } catch {
      setFormStatus({ type: 'error', message: 'Lỗi kết nối máy chủ.' });
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkData.trim()) return;

    setFormStatus({ type: 'loading', message: 'Đang import...' });
    try {
      let channelsList = [];
      const trimmed = bulkData.trim();

      if (trimmed.startsWith('[')) {
        try {
          channelsList = JSON.parse(trimmed);
        } catch {
          setFormStatus({ type: 'error', message: 'JSON không hợp lệ.' });
          return;
        }
      } else {
        channelsList = trimmed
          .split('\n')
          .map((line) => {
            const parts = line.split(',');
            return {
              channelId: parts[0]?.trim(),
              displayName: parts[1]?.trim() || '',
              type: parts[2]?.trim() || 'independent',
              agencyName: parts[3]?.trim() || '',
            };
          })
          .filter((c) => c.channelId?.startsWith('UC'));
      }

      if (channelsList.length === 0) {
        setFormStatus({ type: 'error', message: 'Không có Channel ID hợp lệ (UC...).' });
        return;
      }

      const { ok, message, error } = await api.importChannels(channelsList);

      if (ok) {
        showNotice('success', message || `Import ${channelsList.length} kênh thành công.`);
        setBulkData('');
        setFormStatus(null);
        onRefresh();
      } else {
        setFormStatus({ type: 'error', message: error || 'Import thất bại.' });
      }
    } catch {
      setFormStatus({ type: 'error', message: 'Lỗi kết nối máy chủ.' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="size-6 text-neon-cyan" />
          Kênh VTuber
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Danh sách kênh, đăng ký WebSub và thêm kênh mới.</p>
      </div>

      <ChannelsOverviewChart channels={channels} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-neon-purple" />
              Thêm một kênh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="channelId">Channel ID</Label>
                <Input id="channelId" placeholder="UC..." {...register('channelId')} />
                {errors.channelId && <p className="text-xs text-destructive">{errors.channelId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Tên hiển thị</Label>
                <Input id="displayName" placeholder="Tùy chọn" {...register('displayName')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Loại</Label>
                  <Select value={regType} onValueChange={(v) => setValue('type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">Independent</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {regType === 'agency' && (
                  <div className="space-y-2">
                    <Label htmlFor="agencyName">Agency</Label>
                    <Input id="agencyName" {...register('agencyName')} />
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <UserPlus />
                Đăng ký kênh
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="size-4 text-neon-cyan" />
              Import hàng loạt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkImport} className="space-y-3">
              <Textarea
                rows={5}
                placeholder={'UCxxx, Tên, independent\nHoặc JSON: [{"channelId":"UC..."}]'}
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                className="font-mono"
              />
              <Button type="submit" variant="secondary" className="w-full bg-gradient-to-r from-neon-cyan/80 to-neon-purple/80 text-white">
                Import
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {formStatus && (
        <Alert variant={formStatus.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="size-4" />
          <AlertDescription>{formStatus.message}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <DataTable
          columns={columns}
          data={channels}
          searchKey="displayName"
          searchPlaceholder="Tìm kênh..."
          emptyMessage="Chưa có kênh nào."
          pageSize={10}
        />
      </Card>
    </div>
  );
}
