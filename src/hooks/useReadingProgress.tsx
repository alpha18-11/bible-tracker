import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export const useReadingProgress = () => {
  const { user, isApproved } = useAuth();

  const [progress, setProgress] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

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
      toast({ title: "Failed to load progress", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const map = new Map<number, boolean>();
    data?.forEach((d) => map.set(d.day, true));

    setProgress(map);
    setIsLoading(false);
  }, [user, isApproved]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const markComplete = async (day: number) => {
    if (!user || progress.has(day)) return;

    setProgress((p) => new Map(p).set(day, true));

    const { error } = await supabase.from("reading_progress").insert({
      user_id: user.id,
      day,
      read_at: new Date().toISOString(),
    });

    if (error) {
      setProgress((p) => {
        const m = new Map(p);
        m.delete(day);
        return m;
      });
      toast({ title: "Failed to mark complete", variant: "destructive" });
    }
  };

  const markIncomplete = async (day: number) => {
    if (!user || !progress.has(day)) return;

    setProgress((p) => {
      const m = new Map(p);
      m.delete(day);
      return m;
    });

    const { error } = await supabase
      .from("reading_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("day", day);

    if (error) {
      setProgress((p) => new Map(p).set(day, true));
      toast({ title: "Failed to undo", variant: "destructive" });
    }
  };

  const completedCount = progress.size;
  const progressPercentage = (completedCount / 365) * 100;

  const getMissedDays = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    const todayDay =
      Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;

    const missed: number[] = [];
    for (let i = 1; i < todayDay; i++) {
      if (!progress.has(i)) missed.push(i);
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
  };
};
