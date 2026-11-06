"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { useNow } from "@/lib/use-now";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 連續輸錯被鎖定時，解除鎖定的時間（ISO 字串）
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const router = useRouter();
  const now = useNow(1000);

  // 一打開就查是否仍在鎖定中（例如鎖定後重新整理頁面）
  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d) => setLockedUntil(d.lockedUntil ?? null))
      .catch(() => {});
  }, []);

  const lockMs = lockedUntil ? new Date(lockedUntil).getTime() - now : 0;
  const isLocked = lockMs > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.push("/admin/schedule");
      router.refresh();
      return;
    }
    const d = await res.json().catch(() => ({}));
    if (res.status === 429 && d.lockedUntil) {
      setLockedUntil(d.lockedUntil);
    } else if (res.status === 401) {
      setErr(d.remaining > 0 ? `密碼錯誤，還可以再試 ${d.remaining} 次` : "密碼錯誤");
    } else {
      setErr("暫時無法登入，請稍後再試");
    }
    setPw("");
    setBusy(false);
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

        {isLocked ? (
          <div className="rounded-xl bg-accent/5 border border-accent/20 px-4 py-3 text-sm">
            <p className="font-bold text-accent">密碼錯誤次數過多，已暫時鎖定</p>
            <p className="text-gray-500 mt-1">
              請於 {unlockTime(lockedUntil!)} 後再試（約 {Math.ceil(lockMs / 60_000)} 分鐘）。
            </p>
          </div>
        ) : (
          <>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="管理密碼"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-brand"
            />
            {err && <p className="text-sm text-red-500 mt-2">{err}</p>}
          </>
        )}

        <button
          disabled={busy || isLocked || !pw}
          className="mt-4 w-full rounded-xl bg-brand text-white py-3 font-bold hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
        >
          {busy ? "登入中…" : "登入"}
        </button>
      </form>
    </main>
  );
}

function unlockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  });
}
