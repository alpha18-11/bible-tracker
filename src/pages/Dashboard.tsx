import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { readingPlan, getCurrentDayNumber } from "@/data/readingPlan";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import bethesdaLogo from "@/assets/bethesda-logo.png";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, isAdmin, signOut } = useAuth();
  const {
    progress,
    markComplete,
    markIncomplete,
    completedCount,
    progressPercentage,
    missedDays,
    isLoading,
  } = useReadingProgress();

  const refs = useRef<Record<number, HTMLDivElement | null>>({});
  const [month, setMonth] = useState(new Date().getMonth());
  const [showMissed, setShowMissed] = useState(false);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const abbrev = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const planByMonth = readingPlan.filter(
    (d) => abbrev.indexOf(d.date.split("-")[1]) === month
  );

  const missedByMonth = readingPlan.filter((d) =>
    missedDays.includes(d.dayNumber)
  );

  return (
    <div className="min-h-screen gradient-bg">
      {/* HEADER */}
      <header className="sticky top-0 bg-background/80 backdrop-blur border-b z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <img src={bethesdaLogo} className="w-9 h-9" />
            <div>
              <h1 className="font-medium">
                Bethesda <span className="text-primary italic">Bible Tracker</span>
              </h1>
              <p className="text-xs text-muted-foreground">Welcome, {profile?.full_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && <Button onClick={() => navigate("/admin")}>Admin</Button>}
            <Button variant="ghost" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">
        {/* PROGRESS */}
        <div className="flex gap-3 mb-4">
          <Card className="flex-1 p-4">
            <p className="text-sm">{completedCount} of 365 completed</p>
            <div className="h-2 bg-secondary rounded mt-2 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progressPercentage}%` }} />
            </div>
            <p className="text-xs text-right mt-1">{progressPercentage.toFixed(1)}%</p>
          </Card>

          <Card
            className="cursor-pointer p-4 min-w-[140px] border-yellow-500"
            onClick={() => setShowMissed(true)}
          >
            <div className="flex gap-2 items-center text-yellow-500">
              <AlertCircle size={16} /> Missed
            </div>
            <p className="text-2xl text-center">{missedDays.length}</p>
          </Card>
        </div>

        {/* MONTH / MODE HEADER */}
        <div className="flex justify-between items-center mb-3">
          <Button
            variant="ghost"
            onClick={() => {
              setShowMissed(false);
              setMonth((m) => (m === 0 ? 11 : m - 1));
            }}
          >
            <ChevronLeft /> Prev
          </Button>

          <h2 className="text-lg font-semibold">
            {showMissed ? "Missed Readings" : months[month]}
          </h2>

          <Button
            variant="ghost"
            onClick={() => {
              setShowMissed(false);
              setMonth((m) => (m === 11 ? 0 : m + 1));
            }}
          >
            Next <ChevronRight />
          </Button>
        </div>

        {/* CONTENT */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Reading Plan</CardTitle>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[70vh] pr-3">
              {(showMissed ? missedByMonth : planByMonth).map((day) => {
                const completed = progress.has(day.dayNumber);
                return (
                  <div
                    key={day.dayNumber}
                    ref={(el) => (refs.current[day.dayNumber] = el)}
                    className={`flex gap-3 p-3 mb-2 rounded border cursor-pointer ${
                      completed ? "bg-green-900/20" : "bg-secondary/40"
                    }`}
                    onClick={() =>
                      completed
                        ? markIncomplete(day.dayNumber)
                        : markComplete(day.dayNumber)
                    }
                  >
                    <Checkbox checked={completed} />
                    <div className="flex-1">
                      <p className="font-semibold">
                        Day {day.dayNumber} ({day.date})
                      </p>
                      <p>{day.english}</p>
                      <p className="text-sm text-muted-foreground">{day.telugu}</p>
                    </div>
                    {completed && <Check className="text-green-500" />}
                  </div>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
