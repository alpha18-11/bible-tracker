import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { readingPlan } from "@/data/readingPlan";
import { toast } from "@/hooks/use-toast";

export const useReadingProgress = () => {
  const { user, isApproved } = useAuth();

  const [progress, setProgress] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const inFlight = useRef<Set<number>>(new Set());

  /* ================= FETCH ================= */

  const fetchProgress = useCallback(async () => {
    if (!user || !isApproved) {
      setProgress(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("reading_progress")
      .select("day")
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error loading progress",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const map = new Map<number, boolean>();
    data?.forEach(row => map.set(row.day, true));
    setProgress(map);
    setIsLoading(false);
  }, [user, isApproved]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  /* ================= MARK COMPLETE ================= */

  const markComplete = async (day: number) => {
    if (!user || !isApproved) return;
    if (progress.has(day)) return;
    if (inFlight.current.has(day)) return;

    inFlight.current.add(day);

    setProgress(prev => new Map(prev).set(day, true));

    const { error } = await supabase
      .from("reading_progress")
      .upsert(
        { user_id: user.id, day },
        { onConflict: "user_id,day" }
      );

    inFlight.current.delete(day);

    if (error) {
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
      return;
    }

    fetchProgress();
  };

  /* ================= MARK INCOMPLETE ================= */

  const markIncomplete = async (day: number) => {
    if (!user || !isApproved) return;
    if (!progress.has(day)) return;
    if (inFlight.current.has(day)) return;

    inFlight.current.add(day);

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

    inFlight.current.delete(day);

    if (error) {
      setProgress(prev => new Map(prev).set(day, true));
      toast({
        title: "Failed to undo",
        variant: "destructive",
      });
      return;
    }

    fetchProgress();
  };

  /* ================= STATS ================= */

  const completedCount = progress.size;
  const progressPercentage = (completedCount / 365) * 100;

  /* 🔥 FINAL MISSED LOGIC (SEQUENCE-BASED) */
  const missedDays = (() => {
    if (progress.size === 0) return [];

    const maxCompletedDay = Math.max(...Array.from(progress.keys()));

    return readingPlan
      .filter(
        d => d.dayNumber < maxCompletedDay && !progress.has(d.dayNumber)
      )
      .map(d => d.dayNumber);
  })();

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