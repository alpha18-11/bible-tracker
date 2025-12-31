import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export const useReadingProgress = () => {
  const { user, isApproved } = useAuth();

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
        .from("reading_progress")
        .select("day")
        .eq("user_id", user.id);

      if (error) throw error;

      const map = new Map<number, boolean>();
      data?.forEach(row => map.set(row.day, true));

      setProgress(map);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch reading progress",
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
    if (!user || !isApproved || progress.has(day)) return;

    setProgress(prev => new Map(prev).set(day, true));

    try {
      const { error } = await supabase.from("reading_progress").insert({
        user_id: user.id,
        day,
        read_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch {
      setProgress(prev => {
        const copy = new Map(prev);
        copy.delete(day);
        return copy;
      });
    }
  };

  /* ================= MARK INCOMPLETE ================= */
  const markIncomplete = async (day: number) => {
    if (!user || !isApproved || !progress.has(day)) return;

    setProgress(prev => {
      const copy = new Map(prev);
      copy.delete(day);
      return copy;
    });

    try {
      const { error } = await supabase
        .from("reading_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("day", day);
      if (error) throw error;
    } catch {
      setProgress(prev => new Map(prev).set(day, true));
    }
  };

  /* ================= CORRECT MISSED LOGIC ================= */
  const getMissedDays = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);

    const todayDay =
      Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;

    const missed: number[] = [];

    for (let day = 1; day < todayDay; day++) {
      if (!progress.has(day)) {
        missed.push(day);
      }
    }

    return missed;
  };

  const completedCount = progress.size;
  const progressPercentage = (completedCount / 365) * 100;

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
