import React, { useState, useCallback, useRef, useMemo } from "react";
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

/* ================= CONSTANTS ================= */

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ================= COMPONENT ================= */

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, isAdmin, isPending, signOut } = useAuth();

  const {
    progress,
    markComplete,
    markIncomplete,
    completedCount,
    progressPercentage,
    isLoading,
    missedDays,
  } = useReadingProgress();

  const currentDayNumber = getCurrentDayNumber();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<"month" | "missed">("month");

  const missedRefMap = useRef<Record<number, HTMLDivElement | null>>({});

  /* ================= HANDLERS ================= */

  const handleClick = useCallback(
    (day: number, completed: boolean) => {
      if (!completed) markComplete(day);
    },
    [markComplete]
  );

  const handleDoubleClick = useCallback(
    (day: number, completed: boolean) => {
      if (completed) markIncomplete(day);
    },
    [markIncomplete]
  );

  /* ================= DATA DERIVATIONS ================= */

  const monthPlan = useMemo(
    () =>
      readingPlan.filter(d => {
        const m = d.date.split("-")[1];
        return MONTH_ABBR.indexOf(m) === currentMonth;
      }),
    [currentMonth]
  );

  const missedByMonth = useMemo(() => {
    const map: Record<number, typeof readingPlan> = {};
    missedDays.forEach(dayNum => {
      const item = readingPlan.find(d => d.dayNumber === dayNum);
      if (!item) return;
      const monthIndex = MONTH_ABBR.indexOf(item.date.split("-")[1]);
      if (!map[monthIndex]) map[monthIndex] = [];
      map[monthIndex].push(item);
    });
    return map;
  }, [missedDays]);

  /* ================= PENDING STATE ================= */

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

  /* ================= UI ================= */

  return (
    <div className="min-h-screen gradient-bg">

      {/* ================= HEADER ================= */}
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

      {/* ================= CONTENT ================= */}
      <main className="container mx-auto px-4 py-5">

        {/* ===== PROGRESS + MISSED (ONE LINE ALWAYS) ===== */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch mb-5">
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

          <Card
            className="cursor-pointer p-4 min-w-[220px] flex flex-col justify-center
                       border-yellow-500/40 hover:bg-yellow-500/10"
            onClick={() => setViewMode("missed")}
          >
            <div className="flex items-center gap-2 text-yellow-500 text-sm font-semibold">
              <AlertCircle size={18} /> Missed Readings
            </div>
            <p className="text-2xl font-bold mt-1">
              {missedDays.length}
            </p>
          </Card>
        </div>

        {/* ===== MONTH NAV ===== */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={viewMode === "missed"}
            onClick={() => {
              setViewMode("month");
              setCurrentMonth(m => (m === 0 ? 11 : m - 1));
            }}
          >
            <ChevronLeft size={16} /> Prev
          </Button>

          <h2 className="text-lg font-semibold">
            {viewMode === "missed"
              ? "Missed Readings (All Months)"
              : MONTHS[currentMonth]}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            disabled={viewMode === "missed"}
            onClick={() => {
              setViewMode("month");
              setCurrentMonth(m => (m === 11 ? 0 : m + 1));
            }}
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>

        {/* ===== DAILY PLAN ===== */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Reading Plan</CardTitle>
            <p className="text-xs text-muted-foreground">
              Click to complete • Double click to undo
            </p>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[75vh] pr-3">

              {/* ===== MISSED VIEW ===== */}
              {viewMode === "missed" ? (
                Object.keys(missedByMonth).length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">
                    🎉 No missed readings. Excellent discipline!
                  </p>
                ) : (
                  Object.entries(missedByMonth).map(([monthIndex, days]) => (
                    <div key={monthIndex} className="mb-6">
                      <h3 className="font-semibold mb-3 text-primary">
                        {MONTHS[Number(monthIndex)]}
                      </h3>

                      <div className="space-y-2">
                        {days.map(day => (
                          <div
                            key={day.dayNumber}
                            className="flex gap-3 p-3 rounded-lg border bg-secondary/40"
                          >
                            <Checkbox checked={false} disabled />
                            <div>
                              <p className="font-medium">
                                Day {day.dayNumber} ({day.date})
                              </p>
                              <p>{day.english}</p>
                              <p className="text-sm text-muted-foreground">
                                {day.telugu}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )
              ) : (

              /* ===== MONTH VIEW ===== */
              <div className="space-y-2">
                {monthPlan.map(day => {
                  const completed = progress.get(day.dayNumber) || false;
                  const past = day.dayNumber < currentDayNumber;

                  return (
                    <div
                      key={day.dayNumber}
                      ref={el => {
                        if (!completed && past) {
                          missedRefMap.current[day.dayNumber] = el;
                        }
                      }}
                      onClick={() => handleClick(day.dayNumber, completed)}
                      onDoubleClick={() => handleDoubleClick(day.dayNumber, completed)}
                      className={`flex gap-3 p-3 rounded-lg cursor-pointer border transition
                        ${completed
                          ? "bg-green-900/20 border-green-700/30"
                          : past
                          ? "bg-secondary/40 border-border/40"
                          : "bg-secondary/60 border-border/60"}
                      `}
                    >
                      <Checkbox checked={completed} disabled={isLoading} />

                      <div className="flex-1 space-y-1.5">
                        <div className={`text-sm font-semibold ${completed && "line-through text-muted-foreground"}`}>
                          <span className="text-primary">Day {day.dayNumber}</span>
                          <span className="text-muted-foreground ml-2">
                            ({day.date})
                          </span>
                        </div>

                        <p className="text-[15px] font-medium">
                          {day.english}
                        </p>

                        <p className="text-[14px] text-muted-foreground">
                          {day.telugu}
                        </p>
                      </div>

                      {completed && (
                        <Check className="text-green-500 mt-1" size={18} />
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
