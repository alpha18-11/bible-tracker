import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { readingPlan, getCurrentDayNumber } from "@/data/readingPlan";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  LogOut,
  Shield,
  Check,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import bethesdaLogo from "@/assets/bethesda-logo.png";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, isAdmin, isPending, signOut } = useAuth();

  const {
    progress,
    markComplete,
    markIncomplete,
    completedCount,
    progressPercentage,
    missedDays,
    isLoading,
  } = useReadingProgress();

  const currentDayNumber = getCurrentDayNumber();
  const missedRefMap = useRef<Record<number, HTMLDivElement | null>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [showOnlyMissed, setShowOnlyMissed] = useState(false);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const monthAbbrev = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const monthPlan = readingPlan.filter(d => {
    const m = d.date.split("-")[1];
    return monthAbbrev.indexOf(m) === currentMonth;
  });

  // 🔥 CRITICAL: missed must come from FULL PLAN
  const filteredPlan = showOnlyMissed
    ? readingPlan.filter(d => missedDays.includes(d.dayNumber))
    : monthPlan;

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full p-6 text-center">
          <Clock className="mx-auto mb-4 text-yellow-500" size={40} />
          <h2 className="text-xl font-semibold">Awaiting Approval</h2>
          <p className="text-muted-foreground mt-2">
            Hi {profile?.full_name}, your account is pending admin approval.
          </p>
          <Button className="mt-4 w-full" onClick={signOut}>
            <LogOut className="mr-2" size={16} /> Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={bethesdaLogo} className="w-9 h-9" />
            <div>
              <h1 className="text-lg font-medium">
                Bethesda <span className="italic text-primary">Bible Tracker</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Welcome, {profile?.full_name}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Shield size={16} className="mr-2" /> Admin
              </Button>
            )}
            <Button variant="ghost" onClick={signOut}>
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">

        {/* PROGRESS + MISSED */}
        <div className="flex items-center gap-3 mb-4">
          <Card className="flex-1 p-4">
            <p className="text-sm text-muted-foreground">
              {completedCount} of 365 days completed
            </p>
            <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-right mt-1">
              {progressPercentage.toFixed(1)}%
            </p>
          </Card>

          {missedDays.length > 0 && (
            <Card
              className="cursor-pointer px-4 py-3 border-yellow-500/40 hover:bg-yellow-500/10"
              onClick={() => setShowOnlyMissed(true)}
            >
              <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium">
                <AlertCircle size={16} /> Missed
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {missedDays.length} day{missedDays.length > 1 && "s"}
              </p>
            </Card>
          )}
        </div>

        {/* MONTH NAV */}
        <div className="flex justify-between items-center mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowOnlyMissed(false);
              setCurrentMonth(m => (m === 0 ? 11 : m - 1));
            }}
          >
            <ChevronLeft size={16} /> Prev
          </Button>

          <h2 className="text-lg font-semibold">
            {showOnlyMissed ? "Missed Readings" : months[currentMonth]}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowOnlyMissed(false);
              setCurrentMonth(m => (m === 11 ? 0 : m + 1));
            }}
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>

        {/* DAILY PLAN */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Reading Plan</CardTitle>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[75vh] pr-3">
              <div className="space-y-2">
                {filteredPlan.map(day => {
                  const completed = progress.has(day.dayNumber);
                  const past = day.dayNumber < currentDayNumber;

                  return (
                    <div
                      key={day.dayNumber}
                      ref={el => {
                        if (!completed && past) {
                          missedRefMap.current[day.dayNumber] = el;
                        }
                      }}
                      className={`flex gap-3 p-3 rounded-lg border
                        ${completed
                          ? "bg-green-900/20 border-green-700/30"
                          : past
                          ? "bg-secondary/40 border-border/40"
                          : "bg-secondary/60 border-border/60"}
                      `}
                    >
                      <Checkbox
                        checked={completed}
                        disabled={isLoading}
                        onCheckedChange={(checked) => {
                          if (isLoading) return;
                          checked
                            ? markComplete(day.dayNumber)
                            : markIncomplete(day.dayNumber);
                        }}
                        className="mt-1 cursor-pointer"
                      />

                      <div className="flex-1 space-y-1.5">
                        <div className={`text-sm font-semibold ${completed && "line-through text-muted-foreground"}`}>
                          Day {day.dayNumber} ({day.date})
                        </div>
                        <p className="text-sm">{day.english}</p>
                        <p className="text-xs text-muted-foreground">{day.telugu}</p>
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