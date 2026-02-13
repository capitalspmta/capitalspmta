"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, Button, Badge, Input } from "@/components/ui";

type Me = { id: string; username: string; role: string };
type Shift = { id: string; openedAt: string; closedAt: string | null; seconds: number };
type RankingRow = { userId: string; username: string; role: string; seconds: number };

function fmtHms(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(r)}`;
}

const RANK: Record<string, number> = { USER: 1, SUPPORT: 2, MODERATOR: 3, ADMIN: 4, OWNER: 5 };

export default function StaffTimeclockPage() {
  const [tab, setTab] = useState<"clock" | "open" | "online">("clock");

  const [me, setMe] = useState<Me | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [daySeconds, setDaySeconds] = useState<number>(0);
  const [weekSeconds, setWeekSeconds] = useState<number>(0);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [weekDays, setWeekDays] = useState<Array<{ dateKey: string; label: string }>>([]);
  const [weekDaily, setWeekDaily] = useState<
    Array<{ userId: string; username: string; role: string; totalSeconds: number; byDay: Array<{ dateKey: string; label: string; seconds: number }> }>
  >([]);
  const [openShifts, setOpenShifts] = useState<Array<{ id: string; openedAt: string; user: { id: string; username: string; role: string } }>>([]);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string; username: string; role: string; lastSeenAt: string }>>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adminUserId, setAdminUserId] = useState("");
  const [staffQ, setStaffQ] = useState("");
  const [staffResults, setStaffResults] = useState<Array<{ id: string; username: string; role: string }>>([]);
  const [deltaHours, setDeltaHours] = useState("1");

  const canManageOthers = useMemo(() => (me ? (RANK[me.role] ?? 0) >= RANK.MODERATOR : false), [me]);

  async function load() {
    setError(null);
    const res = await fetch("/api/staff/timeclock", { cache: "no-store" }).catch(() => null);
    const j = await res?.json().catch(() => null);
    if (!res || !res.ok) {
      setError(j?.message || "Falha ao carregar.");
      return;
    }
    setMe(j?.me ?? null);
    setShift(j?.shift ?? null);
    setDaySeconds(Number(j?.daySeconds || 0));
    setWeekSeconds(Number(j?.weekSeconds || 0));
    setRanking(Array.isArray(j?.ranking) ? j.ranking : []);
    setOpenShifts(Array.isArray(j?.openShifts) ? j.openShifts : []);

    setWeekDays(Array.isArray(j?.weekDays) ? j.weekDays : []);
    setWeekDaily(Array.isArray(j?.weekDaily) ? j.weekDaily : []);
    setWeekDays(Array.isArray(j?.weekDays) ? j.weekDays : []);
    setWeekDaily(Array.isArray(j?.weekDaily) ? j.weekDaily : []);

    const r2 = await fetch("/api/staff/online-users", { cache: "no-store" }).catch(() => null);
    const j2 = await r2?.json().catch(() => null);
    setOnlineUsers(Array.isArray(j2?.users) ? j2.users : []);
  }

  async function action(url: string, body?: any) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.message || "Erro");
      await load();
    } catch (e: any) {
      setError(e?.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  // busca staff por username
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (!staffQ.trim()) {
        setStaffResults([]);
        return;
      }
      const r = await fetch(`/api/admin/users/search?q=${encodeURIComponent(staffQ.trim())}`, { cache: "no-store" }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (!alive) return;
      setStaffResults(Array.isArray(j?.users) ? j.users : []);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [staffQ]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "clock" ? "primary" : "ghost"} onClick={() => setTab("clock")}>
            Meu ponto
          </Button>
          <Button variant={tab === "open" ? "primary" : "ghost"} onClick={() => setTab("open")}>
            Pontos abertos
          </Button>
          <Button variant={tab === "online" ? "primary" : "ghost"} onClick={() => setTab("online")}>
            Usuários online
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {me ? <Badge>{me.role}</Badge> : null}
        </div>
      </div>

      {error ? <div className="text-red-300 text-sm">{error}</div> : null}

      {tab === "clock" ? (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Bate ponto</div>
              <div className="text-sm text-white/55">Abra e feche seu ponto. Staff pode gerenciar outros.</div>
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => action("/api/staff/timeclock/open")}>
                Abrir
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => action("/api/staff/timeclock/close")}>
                Fechar
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/50">Status</div>
              <div className="mt-1">
                {shift?.closedAt == null ? <Badge>ABERTO</Badge> : <Badge>FECHADO</Badge>}
              </div>
              <div className="text-xs text-white/45 mt-2">
                {shift?.openedAt ? `Aberto em ${new Date(shift.openedAt).toLocaleString()}` : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/50">Hoje</div>
              <div className="text-xl font-semibold mt-1">{fmtHms(daySeconds)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/50">Semana</div>
              <div className="text-xl font-semibold mt-1">{fmtHms(weekSeconds)}</div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">Ranking da semana</div>
            <div className="space-y-2">
              {ranking.slice(0, 20).map((r) => (
                <div key={r.userId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white/85">{r.username}</span>
                    <Badge>{r.role}</Badge>
                  </div>
                  <div className="text-white/80 font-mono">{fmtHms(r.seconds)}</div>
                </div>
              ))}
            </div>

            {/* detalhamento por dia (Seg..Dom) */}
            {weekDays.length && weekDaily.length ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-[720px] w-full text-xs">
                  <thead className="text-left text-white/55">
                    <tr className="border-b border-white/10">
                      <th className="py-2 px-3">Usuário</th>
                      {weekDays.map((d) => (
                        <th key={d.dateKey} className="py-2 px-3">{d.label}</th>
                      ))}
                      <th className="py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/75">
                    {weekDaily.slice(0, 15).map((row) => (
                      <tr key={row.userId} className="border-b border-white/5">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="text-white/85">{row.username}</span> <span className="text-white/45">({row.role})</span>
                        </td>
                        {weekDays.map((d) => {
                          const sec = row.byDay?.find((x) => x.dateKey === d.dateKey)?.seconds || 0;
                          return (
                            <td key={d.dateKey} className="py-2 px-3 font-mono">{fmtHms(sec)}</td>
                          );
                        })}
                        <td className="py-2 px-3 font-mono">{fmtHms(row.totalSeconds || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {tab === "open" ? (
        <Card className="p-5 space-y-3">
          <div className="text-lg font-semibold">Staff com ponto aberto agora</div>
          <div className="space-y-2">
            {openShifts.length ? (
              openShifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge>ABERTO</Badge>
                    <span className="text-white/85">{s.user.username}</span>
                    <Badge>{s.user.role}</Badge>
                  </div>
                  <div className="text-xs text-white/55">{new Date(s.openedAt).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <div className="text-white/60 text-sm">Nenhum ponto aberto.</div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "online" ? (
        <Card className="p-5 space-y-3">
          <div className="text-lg font-semibold">Usuários online no site</div>
          <div className="space-y-2">
            {onlineUsers.length ? (
              onlineUsers.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white/85">{u.username}</span>
                    <Badge>{u.role}</Badge>
                  </div>
                  <div className="text-xs text-white/55">ativo: {new Date(u.lastSeenAt).toLocaleTimeString()}</div>
                </Link>
              ))
            ) : (
              <div className="text-white/60 text-sm">Ninguém online agora.</div>
            )}
          </div>
        </Card>
      ) : null}

      {canManageOthers ? (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Gerenciar staff</div>
            <Badge>MODERATOR+</Badge>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <Input value={staffQ} onChange={(e) => setStaffQ(e.target.value)} placeholder="Buscar staff por username..." />
            <Input value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} placeholder="User ID selecionado" />
          </div>

          {staffResults.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {staffResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setAdminUserId(s.id)}
                  className="text-left rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white/85">{s.username}</div>
                    <Badge>{s.role}</Badge>
                  </div>
                  <div className="text-[11px] text-white/45">Clique para selecionar</div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-2 md:grid-cols-3">
            <Input value={deltaHours} onChange={(e) => setDeltaHours(e.target.value)} placeholder="Horas (+/-)" />
            <Button
              disabled={busy || !adminUserId}
              onClick={() => action("/api/staff/timeclock/adjust", { userId: adminUserId, deltaSeconds: Math.round(Number(deltaHours) * 3600) })}
            >
              Ajustar horas
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => action("/api/staff/timeclock/reset")}>
              Resetar horas da semana (ADMIN+)
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !adminUserId} onClick={() => action("/api/staff/timeclock/force-close", { userId: adminUserId })}>
              Fechar ponto do staff
            </Button>
            <Button variant="ghost" disabled={busy || !adminUserId} onClick={() => action("/api/staff/timeclock/force-cancel", { userId: adminUserId })}>
              Cancelar ponto do staff
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
