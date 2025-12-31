import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ================= TYPES ================= */

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface ProgressRow {
  user_id: string;
  full_name: string;
  email: string;
  completed: number;
  percent: number;
}

/* ================= COMPONENT ================= */

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading, session } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= ACCESS GUARD ================= */

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [authLoading, isAdmin, navigate]);

  /* ================= LOAD ALL ================= */

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfiles(), loadProgress()]);
    setLoading(false);
  };

  /* ================= LOAD PROFILES ================= */

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load users", variant: "destructive" });
      return;
    }

    setProfiles(data || []);
  };

  /* ================= LOAD PROGRESS ================= */
  // reading_progress table: each row = one completed day

  const loadProgress = async () => {
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("approval_status", "approved");

    const { data: rows } = await supabase
      .from("reading_progress")
      .select("user_id");

    const countMap = new Map<string, number>();
    rows?.forEach((r) =>
      countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1)
    );

    const result: ProgressRow[] =
      users?.map((u) => {
        const completed = countMap.get(u.user_id) || 0;
        return {
          user_id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          completed,
          percent: Number(((completed / 365) * 100).toFixed(1)),
        };
      }) || [];

    setProgress(result.sort((a, b) => b.completed - a.completed));
  };

  /* ================= REMOVE USER ================= */

  const removeUser = async (userId: string) => {
    await supabase.from("reading_progress").delete().eq("user_id", userId);
    await supabase
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("user_id", userId);

    toast({ title: "User removed" });
    loadAll();
  };

  /* ================= EXPORT ================= */

  const exportData = async () => {
    if (!session?.access_token) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error(err);
        throw new Error("Export failed");
      }

      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bethesda_export_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Export successful" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
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

  const pending = profiles.filter((p) => p.approval_status === "pending");

  /* ================= UI ================= */

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="flex justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2" /> Back
        </Button>

        <Button onClick={exportData}>
          <Download className="mr-2" /> Export
        </Button>
      </header>

      <Tabs defaultValue="progress">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="all">All Users</TabsTrigger>
        </TabsList>

        {/* ================= PROGRESS ================= */}
        <TabsContent value="progress">
          <ScrollArea className="h-[90vh] pr-3">
            {progress.map((u) => (
              <Card key={u.user_id} className="p-4 mb-3">
                <p className="font-semibold">{u.full_name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
                <p className="mt-1">
                  {u.completed} / 365 ({u.percent}%)
                </p>

                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-3"
                  onClick={() => removeUser(u.user_id)}
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Remove User
                </Button>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>

        {/* ================= ALL USERS ================= */}
        <TabsContent value="all">
          <ScrollArea className="h-[90vh] pr-3">
            {profiles.map((u) => (
              <Card
                key={u.user_id}
                className="p-4 mb-3 flex justify-between"
              >
                <div>
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <Badge>{u.approval_status}</Badge>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>

        {/* ================= PENDING ================= */}
        <TabsContent value="pending">
          <ScrollArea className="h-[90vh] pr-3">
            {pending.map((u) => (
              <Card key={u.user_id} className="p-4 mb-3">
                <p className="font-medium">{u.full_name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
