import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Trash2, Download, Phone } from "lucide-react";
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
  const { isAdmin, isLoading: authLoading, session } = useAuth();

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

  const loadProgress = async () => {
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("approval_status", "approved");

    const { data: rows } = await supabase
      .from("reading_progress")
      .select("user_id");

    const countMap = new Map<string, number>();
    rows?.forEach(r =>
      countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1)
    );

    const result: ProgressRow[] =
      users?.map(u => {
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

  const removeUser = async (userId: string) => {
    await supabase.from("reading_progress").delete().eq("user_id", userId);
    await supabase
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("user_id", userId);

    toast({ title: "User removed" });
    loadAll();
  };

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

      if (!res.ok) throw new Error();

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
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      
      <div className="relative z-10">
        <header className="flex justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2" /> Back
          </Button>

          <Button onClick={exportData} className="glow-primary">
            <Download className="mr-2" /> Export
          </Button>
        </header>

        <h1 className="text-2xl font-semibold mb-6 gradient-text">Admin Panel</h1>

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-3 mb-4 bg-secondary/50 border border-border/50">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Progress
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All Users
            </TabsTrigger>
          </TabsList>

          {/* PENDING USERS */}
          <TabsContent value="pending" className="animate-fade-in">
            <ScrollArea className="h-[75vh] pr-4">
              {pending.map(u => (
                <Card
                  key={u.user_id}
                  className="mb-3 p-4 flex justify-between items-center glass border-border/50"
                >
                  <div>
                    <p className="font-semibold">{u.full_name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {u.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateApproval(u.user_id, "approved")}
                      className="bg-green-600 hover:bg-green-700"
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

              {pending.length === 0 && (
                <p className="text-center text-muted-foreground mt-10">
                  No pending users
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          {/* PROGRESS */}
          <TabsContent value="progress" className="animate-fade-in">
            <ScrollArea className="h-[75vh] pr-4">
              {progress.map(u => (
                <Card key={u.user_id} className="p-4 mb-3 glass border-border/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{u.full_name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {u.completed} / 365 ({u.percent}%)
                    </Badge>
                  </div>
                  
                  <div className="h-2 bg-secondary rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                      style={{ width: `${u.percent}%` }}
                    />
                  </div>

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

          {/* ALL USERS */}
          <TabsContent value="all" className="animate-fade-in">
            <ScrollArea className="h-[75vh] pr-4">
              {profiles.map(u => (
                <Card key={u.user_id} className="p-4 mb-3 flex justify-between glass border-border/50">
                  <div>
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {u.phone}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant={u.approval_status === 'approved' ? 'default' : u.approval_status === 'pending' ? 'secondary' : 'destructive'}
                  >
                    {u.approval_status}
                  </Badge>
                </Card>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
