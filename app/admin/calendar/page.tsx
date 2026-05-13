"use client";

import { useState, useEffect, useCallback } from "react";

interface Assignment {
  id: string; date: string; man_day: number; note: string | null;
  user_id: string; project_id: string; worker_name: string;
  project_name: string; work_type: string;
  company_id: string; company_name: string; company_color: string;
}
interface Project { id: string; name: string; work_type: string; company_id: string; company_name: string; company_color: string; }
interface Member { id: string; display_name: string; }
interface WorkerEntry { id: string; name: string; man_day: number; note: string | null; assignment_id: string; user_id: string; project_id: string; }
interface DayGroup { company_name: string; company_color: string; project_name: string; project_id: string; work_type: string; workers: WorkerEntry[]; }
type DayData = Record<string, DayGroup>;

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ project_id: "", user_ids: [] as string[], man_day: "1.0", note: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ project_id: "", user_id: "", man_day: "1.0", note: "" });

  const load = useCallback(async () => {
    const [calRes, projRes, memRes] = await Promise.all([
      fetch(`/api/calendar?year=${year}&month=${month}`), fetch("/api/projects"), fetch("/api/members"),
    ]);
    setAssignments(await calRes.json()); setProjects(await projRes.json()); setMembers(await memRes.json());
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = new Date(year, month - 1, 1).getDay();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = []; } }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  // 그룹핑 키에 work_type 포함 → 같은 업체+같은 공사명이어도 공사/일당 분리
  const byDate: Record<string, DayData> = {};
  for (const a of assignments) {
    if (!byDate[a.date]) byDate[a.date] = {};
    const key = `${a.company_name}|${a.project_name}|${a.work_type}`;
    if (!byDate[a.date][key]) {
      byDate[a.date][key] = { company_name: a.company_name, company_color: a.company_color, project_name: a.project_name, project_id: a.project_id, work_type: a.work_type, workers: [] };
    }
    byDate[a.date][key].workers.push({ id: a.user_id, name: a.worker_name, man_day: a.man_day, note: a.note, assignment_id: a.id, user_id: a.user_id, project_id: a.project_id });
  }

  const dateStr = (d: number) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const prevMonth = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); setSelectedDate(null); };
  const nextMonth = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); setSelectedDate(null); };

  const handleAddAssignment = async () => {
    if (!addForm.project_id || addForm.user_ids.length === 0 || !selectedDate) return;
    await fetch("/api/assignments", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: addForm.user_ids.map((uid) => ({ user_id: uid, project_id: addForm.project_id, date: selectedDate, man_day: parseFloat(addForm.man_day) || 1.0, note: addForm.note || null })) }) });
    setAddForm({ project_id: "", user_ids: [], man_day: "1.0", note: "" }); setShowAddForm(false); load();
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("이 배치를 삭제하시겠습니까?")) return;
    await fetch(`/api/assignments/${id}`, { method: "DELETE" }); setEditingId(null); load();
  };

  const startEdit = (w: WorkerEntry) => {
    setEditingId(w.assignment_id);
    setEditForm({ project_id: String(w.project_id), user_id: String(w.user_id), man_day: String(w.man_day), note: w.note || "" });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    await fetch(`/api/assignments/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: editForm.project_id, user_id: editForm.user_id, man_day: parseFloat(editForm.man_day) || 1.0, note: editForm.note || null }) });
    setEditingId(null); load();
  };

  const toggleUser = (uid: string) => { setAddForm((prev) => ({ ...prev, user_ids: prev.user_ids.includes(uid) ? prev.user_ids.filter((id) => id !== uid) : [...prev.user_ids, uid] })); };

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const selectedDayData = selectedDate ? byDate[selectedDate] : null;

  const projectsByCompany: Record<string, Project[]> = {};
  for (const p of projects) {
    if (!projectsByCompany[p.company_name]) projectsByCompany[p.company_name] = [];
    projectsByCompany[p.company_name].push(p);
  }

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selectedDate ? "hidden lg:block" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">{year}년 {month}월</h1>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-lg transition cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {dayNames.map((d, i) => (<div key={d} className={`text-center py-2 text-sm font-medium ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-600"}`}>{d}</div>))}
          </div>
          {weeks.map((w, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
              {w.map((d, di) => {
                if (d === null) return <div key={di} className="min-h-[100px] bg-slate-50/50" />;
                const ds = dateStr(d); const dayData = byDate[ds];
                const isToday = ds === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                const isSunday = di === 0; const isSaturday = di === 6; const isSelected = ds === selectedDate;

                return (
                  <div key={di} onClick={() => setSelectedDate(ds)}
                    className={`min-h-[100px] p-1.5 border-r border-slate-100 last:border-r-0 cursor-pointer transition hover:bg-blue-50/50 calendar-cell overflow-y-auto ${isSelected ? "bg-blue-50 ring-2 ring-blue-400 ring-inset" : ""} ${isSunday ? "bg-red-50/30" : ""} ${isSaturday ? "bg-blue-50/30" : ""}`}>
                    <div className={`text-xs font-bold mb-1 ${isToday ? "w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center" : isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-slate-700"}`}>{d}</div>
                    {dayData && Object.values(dayData).map((group, gi) => (
                      <div key={gi} className="mb-1">
                        <div className={`text-[10px] font-bold px-1 py-0.5 rounded truncate ${
                          group.work_type === "daily" ? "border border-dashed" : "text-white"
                        }`} style={
                          group.work_type === "daily"
                            ? { borderColor: group.company_color, color: group.company_color }
                            : { backgroundColor: group.company_color }
                        }>
                          [{group.company_name}] {group.project_name}
                          {group.work_type === "daily" && <span className="ml-0.5 text-[8px]">일당</span>}
                        </div>
                        <div className={`text-[10px] px-1 truncate ${group.work_type === "daily" ? "text-orange-600" : "text-slate-600"}`}>
                          {group.workers.map((w) => `${w.name}${w.man_day !== 1 ? w.man_day : ""}`).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      {selectedDate && (
        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 sticky top-6">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800">
                {selectedDate.replace(/-/g, ".")}
                <span className="text-sm font-normal text-slate-500 ml-2">({dayNames[new Date(selectedDate).getDay()]})</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowAddForm(true); setEditingId(null); setAddForm({ project_id: "", user_ids: [], man_day: "1.0", note: "" }); }}
                  className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition cursor-pointer">+ 배치추가</button>
                <button onClick={() => setSelectedDate(null)} className="lg:hidden p-1 hover:bg-slate-100 rounded cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {!selectedDayData || Object.keys(selectedDayData).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">배치 데이터가 없습니다</p>
              ) : (
                <div className="space-y-4">
                  {Object.values(selectedDayData).map((group, gi) => (
                    <div key={gi}>
                      <div className={`text-sm font-bold px-2 py-1.5 rounded mb-2 flex items-center gap-2 ${
                        group.work_type === "daily" ? "border border-dashed" : "text-white"
                      }`} style={group.work_type === "daily" ? { borderColor: group.company_color, color: group.company_color } : { backgroundColor: group.company_color }}>
                        [{group.company_name}] {group.project_name}
                        {group.work_type === "daily" && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">일당</span>}
                      </div>
                      <div className="space-y-1 ml-2">
                        {group.workers.map((w, wi) => (
                          <div key={wi}>
                            {editingId === w.assignment_id ? (
                              <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                                <div className="grid grid-cols-2 gap-2">
                                  <div><label className="block text-[10px] font-medium text-slate-500 mb-0.5">인원</label>
                                    <select value={editForm.user_id} onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                                      {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                                    </select></div>
                                  <div><label className="block text-[10px] font-medium text-slate-500 mb-0.5">공사</label>
                                    <select value={editForm.project_id} onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                                      {Object.entries(projectsByCompany).map(([company, projs]) => (
                                        <optgroup key={company} label={company}>{projs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.work_type === "daily" ? "일당" : "공사"})</option>)}</optgroup>
                                      ))}
                                    </select></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><label className="block text-[10px] font-medium text-slate-500 mb-0.5">공수</label>
                                    <input type="number" step="0.5" value={editForm.man_day} onChange={(e) => setEditForm({ ...editForm, man_day: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                  <div><label className="block text-[10px] font-medium text-slate-500 mb-0.5">비고</label>
                                    <input type="text" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="비고" /></div>
                                </div>
                                <div className="flex gap-1.5">
                                  <button onClick={() => setEditingId(null)} className="flex-1 px-2 py-1.5 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-100 transition cursor-pointer">취소</button>
                                  <button onClick={handleEditSave} className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition cursor-pointer">저장</button>
                                  <button onClick={() => handleDeleteAssignment(w.assignment_id)} className="px-2 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition cursor-pointer">삭제</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50 group cursor-pointer" onClick={() => startEdit(w)}>
                                <div className="text-sm">
                                  <span className="font-medium text-slate-800">{w.name}</span>
                                  <span className="text-slate-500 ml-1">({w.man_day})</span>
                                  {w.note && <span className="text-xs text-slate-400 ml-2">{w.note}</span>}
                                </div>
                                <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition">수정</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">총 투입인원</span>
                      <span className="font-bold text-slate-800">{(() => { const ids = new Set<string>(); Object.values(selectedDayData).forEach(g => g.workers.forEach(w => ids.add(w.id))); return ids.size; })()}명</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-500">총 공수</span>
                      <span className="font-bold text-blue-500">{Object.values(selectedDayData).flatMap((g) => g.workers).reduce((sum, w) => sum + w.man_day, 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showAddForm && (
              <div className="border-t border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">배치 추가</h3>
                <div className="space-y-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">공사 선택</label>
                    <select value={addForm.project_id} onChange={(e) => setAddForm({ ...addForm, project_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">선택하세요</option>
                      {Object.entries(projectsByCompany).map(([company, projs]) => (
                        <optgroup key={company} label={company}>{projs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.work_type === "daily" ? "일당" : "공사"})</option>)}</optgroup>
                      ))}
                    </select></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">인원 선택 (다중)</label>
                    <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
                      {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={addForm.user_ids.includes(m.id)} onChange={() => toggleUser(m.id)} className="rounded" />
                          <span className="text-sm">{m.display_name}</span>
                        </label>
                      ))}
                    </div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">공수</label>
                      <input type="number" step="0.5" value={addForm.man_day} onChange={(e) => setAddForm({ ...addForm, man_day: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">비고</label>
                      <input type="text" value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="비고" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddForm(false)} className="flex-1 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition cursor-pointer">취소</button>
                    <button onClick={handleAddAssignment} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition cursor-pointer">저장</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
