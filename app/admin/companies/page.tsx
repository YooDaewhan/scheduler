"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Company {
  id: number;
  name: string;
  color: string;
  project_count: number;
  today_workers: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");

  const loadCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    setCompanies(await res.json());
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    setShowModal(false);
    loadCompanies();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 업체를 삭제하시겠습니까? 관련 공사와 배치 데이터가 모두 삭제됩니다.")) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    loadCompanies();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">업체 관리</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          + 업체 등록
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg">등록된 업체가 없습니다</p>
          <p className="text-sm mt-1">업체를 등록하여 공사를 관리하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition group">
              <Link href={`/admin/companies/${c.id}`} className="block p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-10 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{c.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        진행 중 공사 {c.project_count}건
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-500">
                      {c.today_workers}
                    </div>
                    <div className="text-xs text-slate-400">오늘 투입</div>
                  </div>
                </div>
              </Link>
              <div className="border-t border-slate-100 px-5 py-2 flex justify-end">
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(c.id); }}
                  className="text-xs text-slate-400 hover:text-red-500 transition cursor-pointer"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">업체 등록</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="업체명을 입력하세요"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowModal(false); setNewName(""); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition cursor-pointer"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
