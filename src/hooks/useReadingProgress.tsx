import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export const useReadingProgress = () => {
  const { user, isApproved } = useAuth();

  // Map<dayNumber, true>
  const [progress, setProgress] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  /* ================= FETCH ================= */
  const fetchProgress = useCallback(async () => {
    if (!user || !isApproved) {
      setProgress(new Map());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('day')
        .eq('user_id', user.id);

      if (error) throw error;

      const map = new Map<number, boolean>();
      data?.forEach((row) => {
        map.set(row.day, true); // row exists = completed
      });

      setProgress(map);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to fetch reading progress',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isApproved]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  /* ================= MARK COMPLETE (INSERT) ================= */
  const markComplete = async (day: number) => {
    if (!user || !isApproved) return;
    if (progress.get(day)) return;

    // Optimistic UI
    setProgress((prev) => new Map(prev).set(day, true));

    try {
      const { error } = await supabase
        .from('reading_progress')
        .insert({
          user_id: user.id,
          day,
          read_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (err) {
      // rollback
      setProgress((prev) => {
        const copy = new Map(prev);
        copy.delete(day);
        return copy;
      });

      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to update reading progress',
        variant: 'destructive',
      });
    }
  };

  /* ================= MARK INCOMPLETE (DELETE) ================= */
  const markIncomplete = async (day: number) => {
    if (!user || !isApproved) return;
    if (!progress.get(day)) return;

    // Optimistic UI
    setProgress((prev) => {
      const copy = new Map(prev);
      copy.delete(day);
      return copy;
    });

    try {
      const { error } = await supabase
        .from('reading_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('day', day);

      if (error) throw error;
    } catch (err) {
      // rollback
      setProgress((prev) => new Map(prev).set(day, true));

      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to update reading progress',
        variant: 'destructive',
      });
    }
  };

  /* ================= STATS ================= */
  const completedCount = progress.size;
  const progressPercentage = (completedCount / 365) * 100;

  const getMissedDays = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    const missed: number[] = [];
    for (let i = 1; i < dayOfYear; i++) {
      if (!progress.get(i)) missed.push(i);
    }
    return missed;
  };

  return {
    progress,
    isLoading,
    markComplete,
    markIncomplete,
    completedCount,
    progressPercentage,
    refreshProgress: fetchProgress,
    missedDays: getMissedDays(),
  };
};
