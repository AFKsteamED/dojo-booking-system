"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import { hhmm } from "@/lib/date-utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

type Template = {
  id: string;
  title: string;
  weekday: number;
  start_time: string;
  end_time: string;
  capacity: number;
  visibility: "public" | "private";
  coach_name: string | null;
  member_count: number;
};

export default function CoursesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);

  useEffect(() => {
    adminApi.templates().then((d) => setTemplates(d.templates)).catch(() => setTemplates([]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">常態課／名單</h1>
        <Link href="/admin/courses/new"
          className="text-sm bg-brand text-white rounded-lg px-3 py-2 hover:bg-brand-strong">
          ＋ 新增課程
        </Link>
      </div>

      <div className="space-y-3">
        {templates === null && <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>}
        {templates?.length === 0 && (
          <p className="text-gray-400 text-sm py-6 text-center">尚無常態課</p>
        )}
        {templates?.map((t) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold">{t.title}</p>
                {t.visibility === "private" ? (
                  <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">私人</span>
                ) : (
                  <span className="text-[11px] bg-brand/10 text-brand rounded-full px-2 py-0.5">公開</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                每週{WEEKDAYS[t.weekday]} {hhmm(t.start_time)}–{hhmm(t.end_time)} · {t.coach_name ?? "教練"}
                {t.visibility === "private" && ` · 名單 ${t.member_count} 人`}
              </p>
            </div>
            <Link href={`/admin/courses/${t.id}`}
              className="text-sm text-brand border border-brand/30 rounded-lg px-3 py-1.5 shrink-0">
              編輯{t.visibility === "private" ? "／名單" : ""}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
