import React, { useState } from "react";
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
  const [showOnlyMissed, setShowOnlyMissed] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const monthAbbrev = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthPlan = readingPlan.filter(d =>
    monthAbbrev.indexOf(d.date.split("-")[1]) === currentMonth
  );

  const displayPlan = showOnlyMissed
    ? readingPlan.filter(d => missedDays.includes(d.dayNumber))
    : monthPlan;

  if (isPending) return null;

  return (
    <div className="min-h-screen gradient-bg">
      {/* HEADER */}
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
        <div className="flex gap-4 mb-5">
          <Card className="flex-1 p-4">
            <p className="text-sm text-muted-foreground">
              {completedCount} of 365 days completed
            </p>
            <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-right mt-1">
              {progressPercentage.toFixed(1)}%
            </p>
          </Card>

          <Card
            className={`w-36 p-4 cursor-pointer border-yellow-500/40 ${
              missedDays.length ? "hover:bg-yellow-500/10" : ""
            }`}
            onClick={() => missedDays.length && setShowOnlyMissed(true)}
          >
            <div className="flex items-center gap-2 text-yellow-500 font-medium">
              <AlertCircle size={16} /> Missed
            </div>
            <p className="text-2xl text-center mt-2">
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
            <p className="text-xs text-muted-foreground">
              Click checkbox to mark complete / undo
            </p>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[75vh] pr-3">
              <div className="space-y-2">
                {displayPlan.map(day => {
                  const completed = progress.has(day.dayNumber);
                  const past = day.dayNumber < currentDayNumber;

                  return (
                    <div
                      key={day.dayNumber}
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
                        onCheckedChange={(checked) =>
                          checked
                            ? markComplete(day.dayNumber)
                            : markIncomplete(day.dayNumber)
                        }
                      />

                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${completed && "line-through text-muted-foreground"}`}>
                          Day {day.dayNumber} ({day.date})
                        </div>
                        <p className="font-medium">{day.english}</p>
                        <p className="text-sm text-muted-foreground">{day.telugu}</p>
                      </div>

                      {completed && <Check className="text-green-500" size={18} />}
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