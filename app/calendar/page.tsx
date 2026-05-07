"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";

interface MyAssignment {
  id: number;
  date: string;
  man_day: number;
  note: string | null;
  project_name: string;
  company_name: string;
  company_color: string;
}

export default function MemberCalendarPage() {
  const { data: session } = useSession();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/my-calendar?year=${year}&month=${month}`);
    const data = await res.json();
    setAssignments(data.assignments || []);
    setMonthTotal(data.monthTotal || 0);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const byDate: Record<string, MyAssignment[]> = {};
  for (const a of assignments) {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  }

  const dateStr = (d: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const displayName = (session?.user as any)?.displayName || session?.user?.name || "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-800">{displayName}님의 출근현황</h1>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          로그아웃
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800">{year}년 {month}월</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {dayNames.map((d, i) => (
              <div key={d} className={`text-center py-2 text-sm font-medium ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-600"
              }`}>
                {d}
              </div>
            ))}
          </div>

          {weeks.map((w, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
              {w.map((d, di) => {
                if (d === null) return <div key={di} className="min-h-[90px] bg-slate-50/50" />;

                const ds = dateStr(d);
                const dayAssignments = byDate[ds];
                const isToday = ds === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                const isSunday = di === 0;
                const isSaturday = di === 6;

                return (
                  <div
                    key={di}
                    className={`min-h-[90px] p-1.5 border-r border-slate-100 last:border-r-0 ${
                      isSunday ? "bg-red-50/30" : isSaturday ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className={`text-xs font-bold mb-1 ${
                      isToday
                        ? "w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center"
                        : isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-slate-700"
                    }`}>
                      {d}
                    </div>
                    {dayAssignments?.map((a, ai) => (
                      <div key={ai} className="mb-1">
                        <div
                          className="text-[10px] font-bold px-1 py-0.5 rounded text-white truncate"
                          style={{ backgroundColor: a.company_color }}
                        >
                          {a.project_name}
                        </div>
                        <div className="text-[10px] text-slate-500 px-1">
                          {a.man_day}공수
                          {a.note && <span className="ml-1 text-slate-400">({a.note})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Monthly total */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">이번달 총 공수</span>
          <span className="text-2xl font-bold text-blue-500">{monthTotal.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
