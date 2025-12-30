import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Check, X, Trash2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/* ================= TYPES ================= */

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface UserProgress {
  user_id: string;
  full_name: string;
  email: string;
  completed_count: number;
  progress_percentage: number;
}

/* ================= COMPONENT ================= */

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading, session } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= ACCESS GUARD ================= */

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, navigate]);

  /* ================= LOAD ALL ================= */

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchProfiles(), fetchProgress()]);
    setLoading(false);
  };

  /* ================= FETCH PROFILES ================= */

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, approval_status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Failed to load profiles', variant: 'destructive' });
      return;
    }

    setProfiles(data || []);
  };

  /* ================= FETCH PROGRESS (MATCHES YOUR TABLE) ================= */

  const fetchProgress = async () => {
    // Approved users
    const { data: approved, error: approvedError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('approval_status', 'approved');

    if (approvedError || !approved) {
      setProgress([]);
      return;
    }

    // Each row = one completed day (NO completed column)
    const { data: rows, error: progressError } = await supabase
      .from('reading_progress')
      .select('user_id');

    if (progressError || !rows) {
      setProgress([]);
      return;
    }

    // Count rows per user
    const countMap = new Map<string, number>();
    rows.forEach(r => {
      countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1);
    });

    const result: UserProgress[] = approved.map(u => {
      const completed = countMap.get(u.user_id) || 0;
      return {
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        completed_count: completed,
        progress_percentage: Number(((completed / 365) * 100).toFixed(1)),
      };
    });

    setProgress(result.sort((a, b) => b.completed_count - a.completed_count));
  };

  /* ================= APPROVAL ================= */

  const updateApproval = async (
    userId: string,
    status: 'approved' | 'rejected'
  ) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: status })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Update failed', variant: 'destructive' });
      return;
    }

    toast({ title: `User ${status}` });
    loadAll();
  };

  /* ================= REMOVE USER (ALLOWED FOR ALL) ================= */

  const removeUser = async (userId: string) => {
    await supabase.from('reading_progress').delete().eq('user_id', userId);
    await supabase
      .from('profiles')
      .update({ approval_status: 'rejected' })
      .eq('user_id', userId);

    toast({ title: 'User removed' });
    loadAll();
  };

  /* ================= EXPORT (FIXED) ================= */

  const exportData = async () => {
    if (!session?.access_token) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `bethesda_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      toast({ title: 'Export successful' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  /* ================= LOADING ================= */

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const pending = profiles.filter(p => p.approval_status === 'pending');

  /* ================= UI ================= */

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Button onClick={exportData}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </header>

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="progress">User Progress</TabsTrigger>
          <TabsTrigger value="all">All Users</TabsTrigger>
        </TabsList>

        {/* PENDING */}
        <TabsContent value="pending">
          <ScrollArea className="h-[400px]">
            {pending.map(u => (
              <Card key={u.user_id} className="mb-3 p-4 flex justify-between">
                <div>
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => updateApproval(u.user_id, 'approved')}>
                    <Check />
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => updateApproval(u.user_id, 'rejected')}
                  >
                    <X />
                  </Button>
                </div>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>

        {/* PROGRESS */}
        <TabsContent value="progress">
          <ScrollArea className="h-[400px]">
            {progress.map(u => (
              <Card key={u.user_id} className="mb-3 p-4">
                <p className="font-medium">{u.full_name}</p>
                <p className="text-sm">{u.email}</p>
                <p className="mt-1">
                  {u.completed_count} / 365 ({u.progress_percentage}%)
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => removeUser(u.user_id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove User
                </Button>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>

        {/* ALL USERS */}
        <TabsContent value="all">
          <ScrollArea className="h-[400px]">
            {profiles.map(u => (
              <Card
                key={u.user_id}
                className="mb-3 p-4 flex justify-between"
              >
                <div>
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm">{u.email}</p>
                </div>
                <Badge>{u.approval_status}</Badge>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
