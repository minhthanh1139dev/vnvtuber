import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Key, Plus, Trash2, RotateCw } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';

const addKeySchema = z.object({
  key: z.string().min(1, 'API key bắt buộc'),
});

export default function GoogleApiKeysTab({ showNotice }) {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['google-api-keys'],
    queryFn: async () => {
      const { ok, list, meta, error } = await api.getGoogleApiKeys();
      if (!ok) throw new Error(error || 'Không tải được danh sách API key.');
      return { list: list || [], activeCount: meta?.activeCount ?? 0 };
    },
  });

  const keys = data?.list ?? [];
  const activeCount = data?.activeCount ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(addKeySchema),
    defaultValues: { key: '' },
  });

  const handleStatusChange = useCallback(
    async (id, status) => {
      setUpdatingId(id);
      try {
        const { ok, error } = await api.updateGoogleApiKey(id, { status });
        if (ok) {
          showNotice('success', 'Đã cập nhật trạng thái key.');
          await queryClient.invalidateQueries({ queryKey: ['google-api-keys'] });
        } else {
          showNotice('error', error || 'Cập nhật thất bại.');
        }
      } catch {
        showNotice('error', 'Lỗi kết nối máy chủ.');
      } finally {
        setUpdatingId(null);
      }
    },
    [queryClient, showNotice],
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm('Xóa API key này? Hành động không hoàn tác.')) return;

      setDeletingId(id);
      try {
        const { ok, error } = await api.deleteGoogleApiKey(id);
        if (ok) {
          showNotice('success', 'Đã xóa API key.');
          await queryClient.invalidateQueries({ queryKey: ['google-api-keys'] });
        } else {
          showNotice('error', error || 'Xóa thất bại.');
        }
      } catch {
        showNotice('error', 'Lỗi kết nối máy chủ.');
      } finally {
        setDeletingId(null);
      }
    },
    [queryClient, showNotice],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: 'keyMasked',
        header: 'Key (masked)',
        cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            disabled={updatingId === row.original.id}
            onValueChange={(status) => handleStatusChange(row.original.id, status)}
          >
            <SelectTrigger className="h-8 w-[120px] text-[10px] font-bold uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="exhausted">Exhausted</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'requestCount',
        header: 'Requests',
        cell: ({ getValue }) => <span className="font-bold">{getValue() ?? 0}</span>,
      },
      {
        accessorKey: 'lastUsedAt',
        header: 'Last used',
        cell: ({ getValue }) => (
          <span className="text-[10px] text-muted-foreground">
            {getValue() ? new Date(getValue()).toLocaleString() : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'lastError',
        header: 'Last error',
        cell: ({ getValue }) => (
          <span className="max-w-[200px] truncate text-[10px] text-destructive/80" title={getValue() || ''}>
            {getValue() || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={deletingId === row.original.id}
              onClick={() => handleDelete(row.original.id)}
            >
              {deletingId === row.original.id ? <RotateCw className="animate-spin" /> : <Trash2 />}
              Xóa
            </Button>
          </div>
        ),
      },
    ],
    [updatingId, deletingId, handleStatusChange, handleDelete],
  );

  const onSubmit = async ({ key }) => {
    try {
      const { ok, error } = await api.createGoogleApiKey(key.trim());
      if (ok) {
        showNotice('success', 'Đã thêm Google API key.');
        reset();
        await queryClient.invalidateQueries({ queryKey: ['google-api-keys'] });
      } else {
        showNotice('error', error || 'Thêm key thất bại.');
      }
    } catch {
      showNotice('error', 'Lỗi kết nối máy chủ.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Key className="size-6 text-neon-purple" />
            Google API Keys
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý pool key YouTube Data API v3 (xoay vòng theo requestCount).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active keys</span>
          <Badge variant="success" className="px-3 py-1 text-sm">
            {activeCount}
          </Badge>
          <Button type="button" variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} title="Tải lại">
            <RotateCw className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plus className="size-4 text-neon-pink" />
            Thêm key mới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row">
            <div className="grow space-y-2">
              <Label htmlFor="apiKey" className="sr-only">
                API Key
              </Label>
              <Input id="apiKey" type="password" autoComplete="off" placeholder="AIza..." className="font-mono" {...register('key')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <RotateCw className="animate-spin" />}
              Thêm key
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="p-6">
        {isLoading && keys.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">Đang tải...</p>
        ) : (
          <DataTable
            columns={columns}
            data={keys}
            searchKey="keyMasked"
            searchPlaceholder="Tìm key..."
            emptyMessage="Chưa có API key. Thêm key hoặc set YOUTUBE_API_KEYS khi boot lần đầu."
            pageSize={10}
          />
        )}
      </Card>
    </div>
  );
}
