"use client";

import { useState, useEffect, useCallback } from "react";

interface Member {
  id: number;
  username: string;
  display_name: string;
  role: string;
  month_total: number;
  created_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    username: "", password: "", display_name: "", role: "member",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/members");
    setMembers(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.username.trim()) return;
    if (!editId && !form.password) return alert("비밀번호를 입력하세요");

    const url = editId ? `/api/members/${editId}` : "/api/members";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);

    setForm({ username: "", password: "", display_name: "", role: "member" });
    setEditId(null);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 인원을 삭제하시겠습니까?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">인원 관리</h1>
        <button
          onClick={() => {
            setEditId(null);
            setForm({ username: "", password: "", display_name: "", role: "member" });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          + 인원 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 text-sm font-medium text-slate-600">번호</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-slate-600">이름</th>
              <th className="text-left px-5 py-3 text-sm font-medium text-slate-600">로그인 ID</th>
              <th className="text-center px-5 py-3 text-sm font-medium text-slate-600">역할</th>
              <th className="text-center px-5 py-3 text-sm font-medium text-slate-600">이번달 공수</th>
              <th className="text-right px-5 py-3 text-sm font-medium text-slate-600">관리</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="px-5 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{m.display_name}</td>
                <td className="px-5 py-3 text-sm text-slate-500">{m.username}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    m.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {m.role === "admin" ? "관리자" : "일반"}
                  </span>
                </td>
                <td className="px-5 py-3 text-center font-bold text-blue-500">{m.month_total}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditId(m.id);
                      setForm({ username: m.username, password: "", display_name: m.display_name, role: m.role });
                      setShowModal(true);
                    }}
                    className="text-xs text-slate-400 hover:text-blue-500 mr-3 cursor-pointer"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editId ? "인원 수정" : "인원 등록"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이름 *</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="이름"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">로그인 ID *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="로그인 아이디"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  비밀번호 {editId ? "(변경 시에만 입력)" : "*"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">역할</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">일반 회원</option>
                  <option value="admin">관리자</option>
                </select>
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
