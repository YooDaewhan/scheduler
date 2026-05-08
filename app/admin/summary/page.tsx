"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface PersonDay { user_id: number; display_name: string; date: string; man_day: number; }
interface PersonTotal { user_id: number; display_name: string; total_man_days: number; work_days: number; }
interface ProjectSummary { project_name: string; work_type: string; company_name: string; company_color: string; total_man_days: number; }
interface CompanyTotal { company_name: string; company_color: string; total_man_days: number; }
interface ProjectMerged { project_name: string; total_man_days: number; }

export default function SummaryPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [personData, setPersonData] = useState<PersonDay[]>([]);
  const [personTotals, setPersonTotals] = useState<PersonTotal[]>([]);
  const [projectData, setProjectData] = useState<ProjectSummary[]>([]);
  const [companyTotals, setCompanyTotals] = useState<CompanyTotal[]>([]);
  const [projectMerged, setProjectMerged] = useState<ProjectMerged[]>([]);
  const [activeTab, setActiveTab] = useState("전체");

  const load = useCallback(async () => {
    const res = await fetch(`/api/summary?year=${year}&month=${month}`);
    const data = await res.json();
    setPersonData(data.personData); setPersonTotals(data.personTotals);
    setProjectData(data.projectData); setCompanyTotals(data.companyTotals);
    setProjectMerged(data.projectMerged); setActiveTab("전체");
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const filePrefix = `${year}년${String(month).padStart(2, "0")}월`;

  const personMap: Record<number, { name: string; days: Record<number, number>; total: number }> = {};
  for (const pd of personData) {
    if (!personMap[pd.user_id]) personMap[pd.user_id] = { name: pd.display_name, days: {}, total: 0 };
    const day = parseInt(pd.date.split("-")[2]);
    personMap[pd.user_id].days[day] = (personMap[pd.user_id].days[day] || 0) + pd.man_day;
    personMap[pd.user_id].total += pd.man_day;
  }

  const companyTabList = useMemo(() => {
    const companies = new Set(projectData.map((p) => p.company_name));
    return ["전체", ...Array.from(companies)];
  }, [projectData]);

  const companyColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projectData) map[p.company_name] = p.company_color;
    for (const c of companyTotals) map[c.company_name] = c.company_color;
    return map;
  }, [projectData, companyTotals]);

  const filteredProjects = useMemo(() => {
    if (activeTab === "전체") return projectData;
    return projectData.filter((p) => p.company_name === activeTab);
  }, [projectData, activeTab]);

  // ④ work_type 기반으로 업체별 공사/일당 합산
  const companyByWorkType = useMemo(() => {
    const map: Record<string, { company_name: string; company_color: string; contract: number; daily: number }> = {};
    for (const p of projectData) {
      if (!map[p.company_name]) map[p.company_name] = { company_name: p.company_name, company_color: p.company_color, contract: 0, daily: 0 };
      if (p.work_type === "daily") map[p.company_name].daily += p.total_man_days;
      else map[p.company_name].contract += p.total_man_days;
    }
    return Object.values(map);
  }, [projectData]);

  const contractTotal = useMemo(() => companyByWorkType.reduce((s, c) => s + c.contract, 0), [companyByWorkType]);
  const dailyTotal = useMemo(() => companyByWorkType.reduce((s, c) => s + c.daily, 0), [companyByWorkType]);
  const companiesWithContract = useMemo(() => companyByWorkType.filter((c) => c.contract > 0), [companyByWorkType]);
  const companiesWithDaily = useMemo(() => companyByWorkType.filter((c) => c.daily > 0), [companyByWorkType]);

  const getSunday = (d: number) => new Date(year, month - 1, d).getDay() === 0;
  const getSaturday = (d: number) => new Date(year, month - 1, d).getDay() === 6;
  const prevMonth = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); };

  const getXLSX = async () => await import("xlsx");

  const downloadSheet = async (data: any[][], name: string, file: string, cols: { wch: number }[]) => {
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = cols;
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, file);
  };

  const downloadSection3 = async () => {
    const s: any[][] = [["업체", "현장(공사)", "구분", "총 공수"]];
    for (const p of projectData) s.push([p.company_name, p.project_name, p.work_type === "daily" ? "일당" : "공사", p.total_man_days]);
    s.push(["합계", "", "", projectData.reduce((sum, p) => sum + p.total_man_days, 0)]);
    await downloadSheet(s, "업체별 현장별 공수", `업체별_현장별_공수_${filePrefix}.xlsx`, [{ wch: 15 }, { wch: 20 }, { wch: 6 }, { wch: 10 }]);
  };

  const downloadSection4 = async () => {
    const s: any[][] = [["구분", "업체", "총 공수"]];
    for (const c of companiesWithContract) s.push(["공사", c.company_name, c.contract]);
    if (companiesWithContract.length > 0) s.push(["공사 소계", "", contractTotal]);
    s.push([]);
    for (const c of companiesWithDaily) s.push(["일당", c.company_name, c.daily]);
    if (companiesWithDaily.length > 0) s.push(["일당 소계", "", dailyTotal]);
    s.push([]);
    s.push(["총합계", "", contractTotal + dailyTotal]);
    await downloadSheet(s, "일당_업체별 공수", `일당_업체별_공수_${filePrefix}.xlsx`, [{ wch: 10 }, { wch: 15 }, { wch: 10 }]);
  };

  const downloadSection5 = async () => {
    const s: any[][] = [["공사명", "총 공수 (업체통합)"]];
    for (const p of projectMerged) s.push([p.project_name, p.total_man_days]);
    s.push(["합계", projectMerged.reduce((sum, p) => sum + p.total_man_days, 0)]);
    await downloadSheet(s, "공사별 통합공수", `공사별_통합공수_${filePrefix}.xlsx`, [{ wch: 20 }, { wch: 18 }]);
  };

  const downloadAll = async () => {
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();

    const s1: any[][] = [["이름", ...days.map((d) => `${d}일`), "합계"]];
    for (const [, data] of Object.entries(personMap)) s1.push([data.name, ...days.map((d) => data.days[d] || ""), data.total]);
    s1.push(["총합계", ...days.map((d) => { const t = Object.values(personMap).reduce((s, p) => s + (p.days[d] || 0), 0); return t || ""; }), Object.values(personMap).reduce((s, p) => s + p.total, 0)]);
    const ws1 = XLSX.utils.aoa_to_sheet(s1); ws1["!cols"] = [{ wch: 10 }, ...days.map(() => ({ wch: 5 })), { wch: 8 }];

    const s2: any[][] = [["이름", "출근일수", "총 공수"]];
    for (const pt of personTotals) s2.push([pt.display_name, pt.work_days, pt.total_man_days]);
    s2.push(["합계", personTotals.reduce((s, p) => s + p.work_days, 0), personTotals.reduce((s, p) => s + p.total_man_days, 0)]);
    const ws2 = XLSX.utils.aoa_to_sheet(s2); ws2["!cols"] = [{ wch: 10 }, { wch: 10 }, { wch: 10 }];

    const s3: any[][] = [["업체", "현장(공사)", "구분", "총 공수"]];
    for (const p of projectData) s3.push([p.company_name, p.project_name, p.work_type === "daily" ? "일당" : "공사", p.total_man_days]);
    s3.push(["합계", "", "", projectData.reduce((s, p) => s + p.total_man_days, 0)]);
    const ws3 = XLSX.utils.aoa_to_sheet(s3); ws3["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 6 }, { wch: 10 }];

    const s4: any[][] = [["구분", "업체", "총 공수"]];
    for (const c of companiesWithContract) s4.push(["공사", c.company_name, c.contract]);
    if (companiesWithContract.length > 0) s4.push(["공사 소계", "", contractTotal]);
    s4.push([]);
    for (const c of companiesWithDaily) s4.push(["일당", c.company_name, c.daily]);
    if (companiesWithDaily.length > 0) s4.push(["일당 소계", "", dailyTotal]);
    s4.push([]); s4.push(["총합계", "", contractTotal + dailyTotal]);
    const ws4 = XLSX.utils.aoa_to_sheet(s4); ws4["!cols"] = [{ wch: 10 }, { wch: 15 }, { wch: 10 }];

    const s5: any[][] = [["공사명", "총 공수 (업체통합)"]];
    for (const p of projectMerged) s5.push([p.project_name, p.total_man_days]);
    s5.push(["합계", projectMerged.reduce((s, p) => s + p.total_man_days, 0)]);
    const ws5 = XLSX.utils.aoa_to_sheet(s5); ws5["!cols"] = [{ wch: 20 }, { wch: 18 }];

    XLSX.utils.book_append_sheet(wb, ws1, "개인별 출근현황");
    XLSX.utils.book_append_sheet(wb, ws2, "개인별 총공수");
    XLSX.utils.book_append_sheet(wb, ws3, "업체별 현장별 공수");
    XLSX.utils.book_append_sheet(wb, ws4, "일당_업체별 공수");
    XLSX.utils.book_append_sheet(wb, ws5, "공사별 통합공수");
    XLSX.writeFile(wb, `공수집계_전체_${filePrefix}.xlsx`);
  };

  const ExcelBtn = ({ onClick, label }: { onClick: () => void; label?: string }) => (
    <button onClick={onClick} className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium rounded-md transition cursor-pointer flex items-center gap-1">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      {label || "엑셀"}
    </button>
  );

  const SectionHeader = ({ title, onDownload }: { title: string; onDownload?: () => void }) => (
    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
      <h2 className="font-bold text-slate-700">{title}</h2>
      {onDownload && <ExcelBtn onClick={onDownload} />}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">월간 집계</h1>
        <div className="flex items-center gap-3">
          <button onClick={downloadAll} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            전체 엑셀
          </button>
          <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-lg font-bold text-slate-800">{year}년 {month}월</span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* ① 개인별 출근 현황 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-6">
        <SectionHeader title="① 개인별 출근 현황" />
        <table className="w-full text-xs"><thead><tr className="border-b border-slate-200 bg-slate-50">
          <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600 min-w-[80px] z-10">이름</th>
          {days.map((d) => (<th key={d} className={`px-1.5 py-2 text-center font-medium min-w-[32px] ${getSunday(d) ? "text-red-500 bg-red-50" : getSaturday(d) ? "text-blue-500 bg-blue-50" : "text-slate-600"}`}>{d}</th>))}
          <th className="px-3 py-2 text-center font-bold text-slate-800 bg-yellow-50 min-w-[50px]">합계</th>
        </tr></thead><tbody>
          {Object.entries(personMap).map(([uid, data]) => (
            <tr key={uid} className="border-b border-slate-100">
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800 z-10">{data.name}</td>
              {days.map((d) => (<td key={d} className={`px-1.5 py-2 text-center ${getSunday(d) ? "bg-red-50/50" : getSaturday(d) ? "bg-blue-50/50" : ""} ${data.days[d] ? "text-slate-800 font-medium" : "text-slate-300"}`}>{data.days[d] || ""}</td>))}
              <td className="px-3 py-2 text-center font-bold text-blue-600 bg-yellow-50/50">{data.total.toFixed(1)}</td>
            </tr>))}
          <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
            <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-700 z-10">총합계</td>
            {days.map((d) => { const t = Object.values(personMap).reduce((s, p) => s + (p.days[d] || 0), 0); return <td key={d} className={`px-1.5 py-2 text-center text-slate-700 ${getSunday(d) ? "bg-red-50" : getSaturday(d) ? "bg-blue-50" : ""}`}>{t || ""}</td>; })}
            <td className="px-3 py-2 text-center text-blue-600 bg-yellow-100">{Object.values(personMap).reduce((s, p) => s + p.total, 0).toFixed(1)}</td>
          </tr>
        </tbody></table>
      </div>

      {/* ② 개인별 총 공수 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <SectionHeader title="② 개인별 총 공수 (투입일수)" />
        <table className="w-full text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50">
          <th className="text-left px-5 py-3 font-medium text-slate-600">이름</th>
          <th className="text-center px-5 py-3 font-medium text-slate-600">출근일수</th>
          <th className="text-center px-5 py-3 font-medium text-slate-600">총 공수</th>
        </tr></thead><tbody>
          {personTotals.map((pt) => (
            <tr key={pt.user_id} className="border-b border-slate-100">
              <td className="px-5 py-3 font-medium text-slate-800">{pt.display_name}</td>
              <td className="px-5 py-3 text-center text-slate-600">{pt.work_days}일</td>
              <td className="px-5 py-3 text-center font-bold text-blue-600">{pt.total_man_days.toFixed(1)}</td>
            </tr>))}
          {personTotals.length > 0 && (
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td className="px-5 py-3 text-slate-700">합계</td>
              <td className="px-5 py-3 text-center text-slate-700">{personTotals.reduce((s, p) => s + p.work_days, 0)}일</td>
              <td className="px-5 py-3 text-center text-blue-600">{personTotals.reduce((s, p) => s + p.total_man_days, 0).toFixed(1)}</td>
            </tr>)}
        </tbody></table>
      </div>

      {/* ③ 업체별/현장별 총 공수 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">③ 업체별 / 현장별 총 공수</h2>
            <ExcelBtn onClick={downloadSection3} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {companyTabList.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === tab ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                style={activeTab === tab ? { backgroundColor: tab === "전체" ? "#3b82f6" : companyColorMap[tab] || "#3b82f6" } : undefined}>
                {tab}{tab !== "전체" && (<span className="ml-1.5 opacity-75">({projectData.filter((p) => p.company_name === tab).reduce((s, p) => s + p.total_man_days, 0).toFixed(1)})</span>)}
              </button>))}
          </div>
        </div>
        <table className="w-full text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50">
          <th className="text-left px-5 py-3 font-medium text-slate-600">업체</th>
          <th className="text-left px-5 py-3 font-medium text-slate-600">현장(공사)</th>
          <th className="text-center px-5 py-3 font-medium text-slate-600">구분</th>
          <th className="text-center px-5 py-3 font-medium text-slate-600">총 공수</th>
        </tr></thead><tbody>
          {filteredProjects.map((p, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-5 py-3"><span className="text-xs px-2 py-1 rounded text-white font-medium" style={{ backgroundColor: p.company_color }}>{p.company_name}</span></td>
              <td className="px-5 py-3 font-medium text-slate-800">{p.project_name}</td>
              <td className="px-5 py-3 text-center">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${p.work_type === "daily" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                  {p.work_type === "daily" ? "일당" : "공사"}
                </span>
              </td>
              <td className="px-5 py-3 text-center font-bold text-blue-600">{p.total_man_days.toFixed(1)}</td>
            </tr>))}
          {filteredProjects.length > 0 && (
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td className="px-5 py-3 text-slate-700" colSpan={3}>{activeTab === "전체" ? "총합계" : `${activeTab} 합계`}</td>
              <td className="px-5 py-3 text-center text-blue-600">{filteredProjects.reduce((s, p) => s + p.total_man_days, 0).toFixed(1)}</td>
            </tr>)}
          {filteredProjects.length === 0 && (<tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">데이터가 없습니다</td></tr>)}
        </tbody></table>
      </div>

      {/* ④ 일당 / 업체별 총 공수 (work_type 기반) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <SectionHeader title="④ 일당 / 업체별 총 공수" onDownload={downloadSection4} />
        <table className="w-full text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50">
          <th className="text-left px-5 py-3 font-medium text-slate-600">구분</th>
          <th className="text-left px-5 py-3 font-medium text-slate-600">업체</th>
          <th className="text-center px-5 py-3 font-medium text-slate-600">총 공수</th>
        </tr></thead><tbody>
          {companiesWithContract.map((c, i) => (
            <tr key={`c-${i}`} className="border-b border-slate-100">
              {i === 0 && <td className="px-5 py-3 font-medium text-blue-700" rowSpan={companiesWithContract.length}>공사</td>}
              <td className="px-5 py-3"><span className="text-xs px-2 py-1 rounded text-white font-medium" style={{ backgroundColor: c.company_color }}>{c.company_name}</span></td>
              <td className="px-5 py-3 text-center font-bold text-blue-600">{c.contract.toFixed(1)}</td>
            </tr>))}
          {companiesWithContract.length > 0 && (
            <tr className="bg-blue-50/50 border-b border-slate-200">
              <td className="px-5 py-2 text-xs font-bold text-blue-700" colSpan={2}>공사 소계</td>
              <td className="px-5 py-2 text-center font-bold text-blue-600 text-xs">{contractTotal.toFixed(1)}</td>
            </tr>)}
          {companiesWithDaily.map((c, i) => (
            <tr key={`d-${i}`} className="border-b border-slate-100">
              {i === 0 && <td className="px-5 py-3 font-medium text-orange-700" rowSpan={companiesWithDaily.length}>일당</td>}
              <td className="px-5 py-3"><span className="text-xs px-2 py-1 rounded text-white font-medium" style={{ backgroundColor: c.company_color }}>{c.company_name}</span></td>
              <td className="px-5 py-3 text-center font-bold text-orange-600">{c.daily.toFixed(1)}</td>
            </tr>))}
          {companiesWithDaily.length > 0 && (
            <tr className="bg-orange-50/50 border-b border-slate-200">
              <td className="px-5 py-2 text-xs font-bold text-orange-700" colSpan={2}>일당 소계</td>
              <td className="px-5 py-2 text-center font-bold text-orange-600 text-xs">{dailyTotal.toFixed(1)}</td>
            </tr>)}
          {(contractTotal + dailyTotal) > 0 && (
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td className="px-5 py-3 text-slate-700" colSpan={2}>총합계</td>
              <td className="px-5 py-3 text-center text-blue-600">{(contractTotal + dailyTotal).toFixed(1)}</td>
            </tr>)}
          {companyByWorkType.length === 0 && (<tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">데이터가 없습니다</td></tr>)}
        </tbody></table>
      </div>

      {/* ⑤ 공사별 총 공수 (업체 통합) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <SectionHeader title="⑤ 공사별 총 공수 (업체 통합)" onDownload={downloadSection5} />
        <table className="w-full text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50">
          <th className="text-left px-5 py-3 font-medium text-slate-600">공사명</th>
          <th className="text-center px-5 py-3 font-medium text-slate-600">총 공수 (업체통합)</th>
        </tr></thead><tbody>
          {projectMerged.map((p, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-5 py-3 font-medium text-slate-800">{p.project_name}</td>
              <td className="px-5 py-3 text-center font-bold text-blue-600">{p.total_man_days.toFixed(1)}</td>
            </tr>))}
          {projectMerged.length > 0 && (
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td className="px-5 py-3 text-slate-700">합계</td>
              <td className="px-5 py-3 text-center text-blue-600">{projectMerged.reduce((s, p) => s + p.total_man_days, 0).toFixed(1)}</td>
            </tr>)}
          {projectMerged.length === 0 && (<tr><td colSpan={2} className="px-5 py-8 text-center text-slate-400">데이터가 없습니다</td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
