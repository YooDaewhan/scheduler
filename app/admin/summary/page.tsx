"use client";

import { useState, useEffect, useCallback } from "react";

interface PersonDay {
  user_id: number;
  display_name: string;
  date: string;
  man_day: number;
}

interface ProjectSummary {
  project_name: string;
  company_name: string;
  company_color: string;
  total_man_days: number;
}

export default function SummaryPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [personData, setPersonData] = useState<PersonDay[]>([]);
  const [projectData, setProjectData] = useState<ProjectSummary[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/summary?year=${year}&month=${month}`);
    const data = await res.json();
    setPersonData(data.personData);
    setProjectData(data.projectData);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Build person table
  const personMap: Record<number, { name: string; days: Record<number, number>; total: number }> = {};
  for (const pd of personData) {
    if (!personMap[pd.user_id]) {
      personMap[pd.user_id] = { name: pd.display_name, days: {}, total: 0 };
    }
    const day = parseInt(pd.date.split("-")[2]);
    personMap[pd.user_id].days[day] = (personMap[pd.user_id].days[day] || 0) + pd.man_day;
    personMap[pd.user_id].total += pd.man_day;
  }

  const getSunday = (d: number) => new Date(year, month - 1, d).getDay() === 0;
  const getSaturday = (d: number) => new Date(year, month - 1, d).getDay() === 6;

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">월간 집계</h1>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-bold text-slate-800">{year}년 {month}월</span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 개인별 출근 현황 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-8">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-700">개인별 출근 현황</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600 min-w-[80px] z-10">이름</th>
              {days.map((d) => (
                <th
                  key={d}
                  className={`px-1.5 py-2 text-center font-medium min-w-[32px] ${
                    getSunday(d) ? "text-red-500 bg-red-50" : getSaturday(d) ? "text-blue-500 bg-blue-50" : "text-slate-600"
                  }`}
                >
                  {d}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-bold text-slate-800 bg-yellow-50 min-w-[50px]">합계</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(personMap).map(([uid, data]) => (
              <tr key={uid} className="border-b border-slate-100">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800 z-10">{data.name}</td>
                {days.map((d) => (
                  <td
                    key={d}
                    className={`px-1.5 py-2 text-center ${
                      getSunday(d) ? "bg-red-50/50" : getSaturday(d) ? "bg-blue-50/50" : ""
                    } ${data.days[d] ? "text-slate-800 font-medium" : "text-slate-300"}`}
                  >
                    {data.days[d] || ""}
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-bold text-blue-600 bg-yellow-50/50">
                  {data.total.toFixed(1)}
                </td>
              </tr>
            ))}
            {/* 총합 */}
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-700 z-10">총합계</td>
              {days.map((d) => {
                const dayTotal = Object.values(personMap).reduce((s, p) => s + (p.days[d] || 0), 0);
                return (
                  <td key={d} className={`px-1.5 py-2 text-center text-slate-700 ${
                    getSunday(d) ? "bg-red-50" : getSaturday(d) ? "bg-blue-50" : ""
                  }`}>
                    {dayTotal || ""}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center text-blue-600 bg-yellow-100">
                {Object.values(personMap).reduce((s, p) => s + p.total, 0).toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 현장별 공수 집계 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-700">현장별 공수 집계</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 font-medium text-slate-600">공사명</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">업체</th>
              <th className="text-center px-5 py-3 font-medium text-slate-600">월간 총 공수</th>
            </tr>
          </thead>
          <tbody>
            {projectData.map((p, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-800">{p.project_name}</td>
                <td className="px-5 py-3">
                  <span
                    className="text-xs px-2 py-1 rounded text-white font-medium"
                    style={{ backgroundColor: p.company_color }}
                  >
                    {p.company_name}
                  </span>
                </td>
                <td className="px-5 py-3 text-center font-bold text-blue-600">{p.total_man_days.toFixed(1)}</td>
              </tr>
            ))}
            {projectData.length > 0 && (
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td className="px-5 py-3 text-slate-700" colSpan={2}>총합계</td>
                <td className="px-5 py-3 text-center text-blue-600">
                  {projectData.reduce((s, p) => s + p.total_man_days, 0).toFixed(1)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
