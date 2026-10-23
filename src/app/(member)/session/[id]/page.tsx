"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { getSessionDetail, createBookings, type BookResult } from "@/lib/client-api";
import { messageForCode } from "@/lib/booking-errors";
import { hhmm, shortDate } from "@/lib/date-utils";
import { sessionState, bookingDeadlineMs } from "@/lib/session-status";
import type { SessionWithCounts } from "@/lib/types";
import type { SessionPerson } from "@/app/api/sessions/[id]/route";
import type { DictKey, Locale } from "@/lib/i18n";

type Translator = (key: DictKey, vars?: Record<string, string | number>) => string;

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, dependents, locale, t } = useLiff();
  const hasFamily = dependents.length > 0;

  const [data, setData] = useState<{
    session: SessionWithCounts;
    roster: string[];
    people: SessionPerson[];
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    if (!profile) return;
    getSessionDetail(id)
      .then((d) => {
        setData(d);
        setLoadError(null);
        // 預設勾選「我自己」（若還沒約過、也沒有被擋）
        const self = d.people.find((p) => p.relation === "self");
        if (self && !self.alreadyBooked && !blockReasonFor(self, d.session, t)) {
          setSelected(new Set([self.memberId]));
        } else {
          setSelected(new Set());
        }
      })
      .catch((e) => {
        const code = (e as { code?: string }).code;
        setLoadError(
          code === "NOT_ELIGIBLE"
            ? t("session_notEligibleError")
            : code === "SESSION_NOT_FOUND"
              ? t("session_notFoundError")
              : t("session_loadError")
        );
      });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id, profile]);

  function toggle(memberId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  async function handleBook(memberIds: string[]) {
    if (memberIds.length === 0) {
      setMsg({ ok: false, text: t("session_selectAtLeastOne") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { results } = await createBookings(id, memberIds);
      setMsg({ ok: results.every((r) => r.ok), text: formatResults(results, locale, t) });
      setSelected(new Set());
      load();
    } catch (e) {
      setMsg({ ok: false, text: messageForCode((e as { code?: string }).code ?? "UNKNOWN", locale) });
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-sm text-muted">{loadError}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-brand border border-brand/30 rounded-xl px-4 py-2"
        >
          {t("session_backToSchedule")}
        </button>
      </div>
    );
  }
  if (!data) return <p className="text-center text-muted text-sm py-16">{t("common_loading")}</p>;
  const s = data.session;
  const self = data.people.find((p) => p.relation === "self");
  const state = sessionState(s);
  const anyBooked = data.people.some((p) => p.alreadyBooked);

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted text-xl" aria-label="back">
          ‹
        </button>
        <h1 className={`font-bold ${state === "cancelled" ? "line-through text-muted" : ""}`}>{s.title}</h1>
        {s.visibility === "private" && (
          <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">
            {t("session_privateBadge")}
          </span>
        )}
      </header>

      <div className="p-4 space-y-4">
        {state === "cancelled" && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm">
            <p className="font-bold text-accent">{t("session_statusCancelled")}</p>
            <p className="text-muted mt-1">
              {t(s.cancel_reason === "manual" ? "session_cancelledManual" : "session_cancelledInsufficient")}
            </p>
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-2 text-sm">
          <Row label={t("session_time")} value={`${shortDate(s.session_date, locale)} ${hhmm(s.start_time)} – ${hhmm(s.end_time)}`} />
          <Row label={t("session_coach")} value={s.coach_name ?? t("session_coach")} />
          <Row label={t("session_location")} value={t("brand_name")} />
          {state !== "cancelled" && (
            <Row
              label={t("session_remainingSeats")}
              value={s.remaining > 0 ? t("session_seats", { n: s.remaining }) : t("schedule_full")}
            />
          )}
          {s.min_attendance > 1 && (
            <Row label={t("session_minAttendance")} value={t("session_minValue", { n: s.min_attendance })} />
          )}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold mb-2">{t("session_rosterTitle", { n: data.roster.length })}</p>
          {data.roster.length === 0 ? (
            <p className="text-muted text-sm">{t("session_noOneBooked")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.roster.map((name, i) => (
                <span key={i} className="text-xs bg-brand/10 text-brand rounded-full px-3 py-1">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasFamily && state !== "cancelled" && (
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-sm font-semibold mb-2">{t("session_bookFor")}</p>
            <div className="space-y-2">
              {data.people.map((p) => {
                const reason = !p.alreadyBooked ? blockReasonFor(p, s, t) : null;
                const disabled = p.alreadyBooked || !!reason;
                const checked = selected.has(p.memberId);
                return (
                  <label
                    key={p.memberId}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                      disabled ? "opacity-50" : "cursor-pointer"
                    } ${checked ? "border-brand bg-brand/5" : "border-border"}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        aria-label={p.relation === "self" ? t("session_self") : p.displayName}
                        disabled={disabled}
                        checked={checked}
                        onChange={() => toggle(p.memberId)}
                        className="w-4 h-4 accent-brand"
                      />
                      <span className="text-sm font-medium truncate">
                        {p.relation === "self" ? t("session_self") : p.displayName}
                      </span>
                      {p.memberRelation && (
                        <span className="shrink-0 text-[10px] bg-brand/10 text-brand rounded-full px-1.5 py-0.5">
                          {t(`relation_${p.memberRelation}`)}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {p.alreadyBooked
                        ? t("session_statusBooked")
                        : reason ?? t("session_creditsLeft", { n: p.credits })}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {msg && (
          <p
            className={`text-center text-sm rounded-lg py-2 px-3 whitespace-pre-line ${
              msg.ok ? "text-brand bg-brand/10" : "text-accent bg-accent/10"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>

      {/* 底部動作按鈕 */}
      <div className="mt-auto p-4">
        {state === "cancelled" ? (
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-2xl border border-brand/40 text-brand py-4 font-bold"
          >
            {t("session_backToSchedule")}
          </button>
        ) : state === "closed" ? (
          anyBooked ? (
            <div className="text-center text-sm text-muted">{t("session_bookedClosedNote")}</div>
          ) : (
            <div className="w-full rounded-2xl bg-gray-100 text-gray-400 py-4 font-bold text-center">
              {t("session_statusClosed")}
            </div>
          )
        ) : hasFamily ? (
          <button
            disabled={busy || selected.size === 0}
            onClick={() => handleBook(Array.from(selected))}
            className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
          >
            {busy ? t("common_processing") : t("session_bookSelected", { n: selected.size })}
          </button>
        ) : self?.alreadyBooked ? (
          <div className="text-center text-sm text-muted">{t("session_alreadyBookedNote")}</div>
        ) : (
          (() => {
            const reason = self ? blockReasonFor(self, s, t) : null;
            return reason ? (
              <div className="w-full rounded-2xl bg-gray-100 text-gray-400 py-4 font-bold text-center">
                {reason}
              </div>
            ) : (
              <button
                disabled={busy || !self}
                onClick={() => self && handleBook([self.memberId])}
                className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
              >
                {busy ? t("common_processing") : t("session_bookSelectedOne")}
              </button>
            );
          })()
        )}
        {state === "open" && (
          <div className="text-[11px] text-muted text-center mt-3 space-y-1">
            {s.min_attendance > 1 && <p>{t("session_deadlineNote", { min: s.min_attendance })}</p>}
            <p>{t("session_cancelPolicy")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 預約前先判斷能不能約，直接顯示原因（不用點了才失敗）
function blockReasonFor(p: SessionPerson, s: SessionWithCounts, t: Translator): string | null {
  if (bookingDeadlineMs(s) <= Date.now()) return t("session_statusClosed");
  if (s.remaining <= 0) return t("schedule_full");
  if (s.visibility === "private" && !p.eligible) return t("session_statusNotEligible");
  if (!p.profileComplete) return t("session_statusProfileIncomplete");
  if (p.credits <= 0) {
    const type = t(s.visibility === "private" ? "session_creditType_private" : "session_creditType_group");
    return t("session_statusNoCredits", { type });
  }
  return null;
}

function formatResults(results: BookResult[], locale: Locale, t: Translator): string {
  if (results.length === 1) {
    return results[0].ok
      ? t("notify_bookSuccess")
      : messageForCode(results[0].error ?? "UNKNOWN", locale);
  }
  return results
    .map((r) => `${r.displayName}：${r.ok ? t("session_bookOk") : messageForCode(r.error ?? "UNKNOWN", locale)}`)
    .join("\n");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
