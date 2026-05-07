"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Project {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: number;
  today_workers: number;
}

interface Company {
  id: number;
  name: string;
  color: string;
}

export default function CompanyDetailPage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/companies/${companyId}`),
      fetch(`/api/companies/${companyId}/projects`),
    ]);
    setCompany(await cRes.json());
    setProjects(await pRes.json());
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editId) {
      await fetch(`/api/projects/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_active: true }),
      });
    } else {
      await fetch(`/api/companies/${companyId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm({ name: "", start_date: "", end_date: "" });
    setEditId(null);
    setShowModal(false);
    load();
  };

  const handleToggleActive = async (p: Project) => {
    await fetch(`/api/projects/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
        is_active: !p.is_active,
      }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 공사를 삭제하시겠습니까?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  if (!company) return <div className="text-slate-400 py-10 text-center">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <Link href="/admin/companies" className="hover:text-blue-500 transition">업체 관리</Link>
        <span>›</span>
        <span className="text-slate-800 font-medium">{company.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-8 rounded-full" style={{ backgroundColor: company.color }} />
          <h1 className="text-2xl font-bold text-slate-800">{company.name} - 공사 관리</h1>
        </div>
        <button
          onClick={() => { setEditId(null); setForm({ name: "", start_date: "", end_date: "" }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          + 공사 등록
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg">등록된 공사가 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-sm font-medium text-slate-600">공사명</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-slate-600">기간</th>
                <th className="text-center px-5 py-3 text-sm font-medium text-slate-600">상태</th>
                <th className="text-center px-5 py-3 text-sm font-medium text-slate-600">오늘 투입</th>
                <th className="text-right px-5 py-3 text-sm font-medium text-slate-600">관리</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className={`border-b border-slate-100 ${!p.is_active ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {p.start_date || "미정"} ~ {p.end_date || "미정"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer ${
                        p.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.is_active ? "활성" : "비활성"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center text-sm font-bold text-blue-500">
                    {p.today_workers}명
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => { setEditId(p.id); setForm({ name: p.name, start_date: p.start_date || "", end_date: p.end_date || "" }); setShowModal(true); }}
                      className="text-xs text-slate-400 hover:text-blue-500 mr-3 cursor-pointer"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editId ? "공사 수정" : "공사 등록"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">공사명 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="공사명을 입력하세요"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition cursor-pointer"
              >
                {editId ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
