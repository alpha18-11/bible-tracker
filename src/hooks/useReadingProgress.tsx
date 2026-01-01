import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export const useReadingProgress = () => {
  const { user, isApproved } = useAuth();

  // Map<dayNumber, completed>
  const [progress, setProgress] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  /* ================= FETCH PROGRESS ================= */

  const fetchProgress = useCallback(async () => {
    if (!user || !isApproved) {
      setProgress(new Map());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reading_progress")
        .select("day")
        .eq("user_id", user.id);

      if (error) throw error;

      const map = new Map<number, boolean>();
      data?.forEach(row => {
        map.set(row.day, true);
      });

      setProgress(map);
    } catch (err) {
      console.error("Fetch progress error:", err);
      toast({
        title: "Error",
        description: "Failed to load reading progress",
        variant: "destructive",
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
    if (progress.get(day)) return;

    // Optimistic UI
    setProgress(prev => new Map(prev).set(day, true));

    const { error } = await supabase
      .from("reading_progress")
      .upsert(
        {
          user_id: user.id,
          day,
          read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,day" }
      );

    if (error) {
      console.error("Insert error:", error);

      // Rollback UI
      setProgress(prev => {
        const copy = new Map(prev);
        copy.delete(day);
        return copy;
      });

      toast({
        title: "Failed to mark complete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  /* ================= MARK INCOMPLETE ================= */

  const markIncomplete = async (day: number) => {
    if (!user || !isApproved) return;
    if (!progress.get(day)) return;

    // Optimistic UI
    setProgress(prev => {
      const copy = new Map(prev);
      copy.delete(day);
      return copy;
    });

    const { error } = await supabase
      .from("reading_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("day", day);

    if (error) {
      console.error("Delete error:", error);

      // Rollback UI
      setProgress(prev => new Map(prev).set(day, true));

      toast({
        title: "Failed to undo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  /* ================= STATS ================= */

  const completedCount = progress.size;
  const progressPercentage = (completedCount / 365) * 100;

  const getMissedDays = () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const dayOfYear =
      Math.floor((today.getTime() - startOfYear.getTime()) / 86400000) + 1;

    const missed: number[] = [];
    for (let d = 1; d < dayOfYear; d++) {
      if (!progress.get(d)) missed.push(d);
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
    missedDays: getMissedDays(),
    refreshProgress: fetchProgress,
  };
};
