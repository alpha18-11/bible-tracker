import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Download, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
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

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfiles(), loadProgress()]);
    setLoading(false);
  };

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

  /* ================= RPC-BASED PROGRESS (FINAL FIX) ================= */
  const loadProgress = async () => {
    const { data, error } = await supabase.rpc("admin_progress_summary");

    if (error) {
      console.error(error);
      toast({ title: "Failed to load progress", variant: "destructive" });
      return;
    }

    setProgress(data || []);
  };
  /* ================= END RPC FIX ================= */

  const updateApproval = async (
    userId: string,
    status: "approved" | "rejected"
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: status })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: `User ${status}` });
    loadAll();
  };

  const exportData = () => {
    if (!progress.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = [
      "Full Name",
      "Email",
      "Completed Days",
      "Progress %",
    ];

    const rows = progress.map(u => [
      `"${u.full_name}"`,
      `"${u.email}"`,
      u.completed,
      u.percent,
    ]);

    const csvContent =
      [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `bethesda_progress_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Export successful" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = profiles.filter(p => p.approval_status === "pending");

  return (
    <div className="min-h-screen gradient-bg px-4 py-6">
      <div className="relative z-10">
        <header className="flex justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2" /> Back
          </Button>

          <Button onClick={exportData}>
            <Download className="mr-2" /> Export
          </Button>
        </header>

        <h1 className="text-2xl font-semibold mb-6">Admin Panel</h1>

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="pending">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="all">All Users</TabsTrigger>
          </TabsList>

          <TabsContent value="progress">
            <ScrollArea className="h-[75vh] pr-4">
              {progress.map(u => (
                <Card key={u.user_id} className="p-4 mb-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{u.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <Badge>
                      {u.completed} / 365 ({u.percent}%)
                    </Badge>
                  </div>
                </Card>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending">
            <ScrollArea className="h-[75vh] pr-4">
              {pending.map(u => (
                <Card key={u.user_id} className="mb-3 p-4 flex justify-between">
                  <div>
                    <p className="font-semibold">{u.full_name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.phone && (
                      <p className="text-xs flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {u.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateApproval(u.user_id, "approved")}
                      className="bg-green-600"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateApproval(u.user_id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all">
            <ScrollArea className="h-[75vh] pr-4">
              {profiles.map(u => (
                <Card key={u.user_id} className="p-4 mb-3 flex justify-between">
                  <div>
                    <p>{u.full_name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge>{u.approval_status}</Badge>
                </Card>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}