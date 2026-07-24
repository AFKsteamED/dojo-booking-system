"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/wordmark";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.push("/admin/schedule");
      router.refresh();
    } else {
      setErr(true);
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 bg-gray-50">
      <form
        onSubmit={submit}
        className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-card"
      >
        <Wordmark className="text-[11px]" />
        <h1 className="text-2xl font-extrabold mt-1">教練後台</h1>
        <p className="text-sm text-gray-400 mt-1 mb-6">請輸入管理密碼</p>

        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="管理密碼"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-brand"
        />
        {err && <p className="text-sm text-red-500 mt-2">密碼錯誤</p>}

        <button
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-brand text-white py-3 font-bold hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
        >
          {busy ? "登入中…" : "登入"}
        </button>
      </form>
    </main>
  );
}
