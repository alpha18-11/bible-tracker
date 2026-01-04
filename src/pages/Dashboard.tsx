import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { readingPlan } from "@/data/readingPlan";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  LogOut,
  Shield,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, isAdmin, signOut, isPending, isApproved } = useAuth();

  const {
    progress,
    markComplete,
    markIncomplete,
    completedCount,
    progressPercentage,
    missedDays,
    isLoading,
  } = useReadingProgress();

  const [showMissedOnly, setShowMissedOnly] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const monthAbbrev = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthPlan = readingPlan.filter(d => {
    const m = d.date.split("-")[1];
    return monthAbbrev.indexOf(m) === currentMonth;
  });

  const filteredPlan = showMissedOnly
    ? readingPlan.filter(d => missedDays.includes(d.dayNumber))
    : monthPlan;

  // Show pending state
  if (isPending) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <Card className="max-w-md w-full p-8 text-center glass animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Account Pending Approval</h2>
          <p className="text-muted-foreground mb-6">
            Your account is awaiting admin approval. You'll be able to access the Bible tracker once approved.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-medium">
                Bethesda <span className="italic gradient-text">Bible Tracker</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Welcome, {profile?.full_name}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Shield size={16} className="mr-2" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 relative z-10">
        {/* PROGRESS + MISSED */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="col-span-2 p-4 glass border-border/50">
            <p className="text-sm text-muted-foreground">
              {completedCount} of 365 days completed
            </p>
            <div className="h-3 bg-secondary rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-right mt-1 text-muted-foreground">
              {progressPercentage.toFixed(1)}%
            </p>
          </Card>

          <Card
            className={`p-4 cursor-pointer border-yellow-500/40 glass transition-all duration-300 ${
              missedDays.length > 0 ? "hover:bg-yellow-500/10 hover:border-yellow-500/60" : "opacity-50"
            }`}
            onClick={() => missedDays.length && setShowMissedOnly(true)}
          >
            <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium">
              <AlertCircle size={16} /> Missed
            </div>
            <p className="text-2xl font-semibold text-center mt-1">
              {missedDays.length}
            </p>
          </Card>
        </div>

        {/* MONTH NAV */}
        <div className="flex justify-between items-center mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowMissedOnly(false);
              setCurrentMonth(m => (m === 0 ? 11 : m - 1));
            }}
          >
            <ChevronLeft size={16} /> Prev
          </Button>

          <h2 className="text-lg font-semibold">
            {showMissedOnly ? "Missed Readings" : months[currentMonth]}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowMissedOnly(false);
              setCurrentMonth(m => (m === 11 ? 0 : m + 1));
            }}
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>

        {/* DAILY PLAN */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Daily Reading Plan</CardTitle>
            <p className="text-xs text-muted-foreground">
              Click checkbox to mark complete / undo
            </p>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[60vh] pr-3">
              <div className="space-y-2">
                {filteredPlan.map(day => {
                  const completed = progress.has(day.dayNumber);

                  return (
                    <div
                      key={day.dayNumber}
                      className={`flex gap-3 p-3 rounded-lg border transition-all duration-300 ${
                        completed
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                      }`}
                    >
                      <Checkbox
                        checked={completed}
                        disabled={isLoading}
                        onCheckedChange={(checked) =>
                          checked
                            ? markComplete(day.dayNumber)
                            : markIncomplete(day.dayNumber)
                        }
                        className="mt-1"
                      />

                      <div className="flex-1 space-y-1.5">
                        <div className={`text-sm font-semibold ${completed && "line-through text-muted-foreground"}`}>
                          <span className="text-primary">Day {day.dayNumber}</span>
                          <span className="text-muted-foreground ml-2">
                            ({day.date})
                          </span>
                        </div>
                        <p className="text-[15px] font-medium">{day.english}</p>
                        <p className="text-[14px] text-muted-foreground">{day.telugu}</p>
                      </div>

                      {completed && <Check className="text-green-500 mt-1" size={18} />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
