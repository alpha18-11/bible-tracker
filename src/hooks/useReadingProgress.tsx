import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { getCurrentDayNumber } from '@/data/readingPlan';

export const useReadingProgress = () => {
  const { user, isApproved } = useAuth();

  // Map<dayNumber, true>
  const [progress, setProgress] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  /* ================= FETCH PROGRESS ================= */
  const fetchProgress = useCallback(async () => {
    if (!user || !isApproved) {
      setProgress(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('day')
        .eq('user_id', user.id);

      if (error) throw error;

      const map = new Map<number, boolean>();
      data?.forEach(row => {
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

  /* ================= MARK COMPLETE ================= */
  const markComplete = async (day: number) => {
    if (!user || !isApproved) return;
    if (progress.has(day)) return;

    // Optimistic UI
    setProgress(prev => new Map(prev).set(day, true));

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
      setProgress(prev => {
        const copy = new Map(prev);
        copy.delete(day);
        return copy;
      });

      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to mark reading complete',
        variant: 'destructive',
      });
    }
  };

  /* ================= MARK INCOMPLETE ================= */
  const markIncomplete = async (day: number) => {
    if (!user || !isApproved) return;
    if (!progress.has(day)) return;

    // Optimistic UI
    setProgress(prev => {
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
      setProgress(prev => new Map(prev).set(day, true));

      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to undo reading progress',
        variant: 'destructive',
      });
    }
  };

  /* ================= STATS ================= */
  const completedCount = progress.size;
  const progressPercentage = (completedCount / 365) * 100;

  /* ================= MISSED DAYS (CORRECT & STABLE) ================= */
  const missedDays = useMemo(() => {
    const today = getCurrentDayNumber(); // 🔥 single source of truth
    const missed: number[] = [];

    for (let day = 1; day < today; day++) {
      if (!progress.has(day)) missed.push(day);
    }

    return missed;
  }, [progress]);

  /* ================= RETURN ================= */
  return {
    progress,
    isLoading,
    markComplete,
    markIncomplete,
    completedCount,
    progressPercentage,
    missedDays,
    refreshProgress: fetchProgress,
  };
};
