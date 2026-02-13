"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MentionItem = { kind: "user" | "role"; id: string; name: string; extra?: string };

function renderMentions(text: string) {
  // destaca @algo (usuario/cargo) sem quebrar o texto
  const parts = text.split(/(@[A-Za-z0-9_\-]{1,32})/g);
  return parts.map((p, idx) => {
    if (p.startsWith("@") && p.length > 1) {
      return (
        <span key={idx} className="text-white/90 font-semibold bg-white/10 border border-white/10 rounded-lg px-1">
          {p}
        </span>
      );
    }
    return <span key={idx}>{p}</span>;
  });
}

export default function ThreadClient({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Array<{ url: string; name?: string; mime?: string; size?: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQ, setMentionQ] = useState("");
  const [mentionItems, setMentionItems] = useState<MentionItem[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);


  async function uploadFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/uploads/file", { method: "POST", body: form });
    if (!r.ok) {
      const j = await r.json().catch(() => null);
      throw new Error(j?.message || "Falha ao enviar arquivo.");
    }
    return (await r.json()) as { url: string; name?: string; mime?: string; size?: number };
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const list = Array.from(files);
    for (const f of list) {
      try {
        const up = await uploadFile(f);
        setAttachments((prev) => [...prev, up]);
      } catch (e: any) {
        alert(e?.message || "Erro ao anexar arquivo.");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addLinkAttachment() {
    const url = prompt("Cole o link (URL):");
    if (!url) return;
    const clean = url.trim();
    if (!clean) return;
    setAttachments((prev) => [...prev, { url: clean, name: "Link", mime: "text/url" }]);
  }

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  }

  async function load() {
    const r = await fetch(`/api/dm/conversations/${id}/messages`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (!r.ok) return;
    setData(j?.conversation ?? null);
    setMeId(j?.meId ?? null);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [id]);

  
  // carrega lista de cargos (Role model) uma vez
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch("/api/roles/list", { cache: "no-store" }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (!alive) return;
      setRoles(Array.isArray(j?.roles) ? j.roles : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const roleItems = useMemo<MentionItem[]>(() => {
    const q = mentionQ.toLowerCase();
    if (!q) return [];
    return roles
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((r) => ({ kind: "role", id: r.id, name: r.name }));
  }, [roles, mentionQ]);

  // detecta se o usuário está digitando "@..." no final do input
  useEffect(() => {
    let alive = true;
    async function run() {
      const m = text.match(/(^|\s)@([^\s@]{0,32})$/);
      if (!m) {
        setMentionOpen(false);
        setMentionQ("");
        setMentionItems([]);
        return;
      }
      const q = (m[2] || "").trim();
      setMentionQ(q);
      setMentionOpen(true);

      // Users: só busca com 2+ chars
      if (q.length < 2) {
        const combined = [...roleItems];
        setMentionItems(combined);
        return;
      }

      setLoadingMentions(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const j = await r.json().catch(() => null);
        const users = Array.isArray(j?.users) ? j.users : [];
        const userItems: MentionItem[] = users.slice(0, 6).map((u: any) => ({
          kind: "user",
          id: u.id,
          name: u.username,
          extra: u.role,
        }));
        if (!alive) return;
        setMentionItems([...roleItems, ...userItems].slice(0, 10));
      } catch {
        if (!alive) return;
        setMentionItems([...roleItems]);
      } finally {
        if (alive) setLoadingMentions(false);
      }
    }

    const t = setTimeout(run, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [text, roleItems]);

  function pickMention(item: MentionItem) {
    // substitui o token @... do final do texto
    const label = `@${item.name}`;
    const next = text.replace(/(^|\s)@([^\s@]{0,32})$/, (full, space) => `${space}${label} `);
    setText(next);
    setMentionOpen(false);
    setMentionItems([]);
  }

  async function send() {
    const content = text.trim();
    if (!content && !attachments.length) return;

    const payload = { content, attachments };

    // UI whatsapp-like: mantém o input limpo, mas se falhar, restaura
    setText("");
    setMentionOpen(false);
    setAttachments([]);

    const res = await fetch(`/api/dm/conversations/${id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!res || !res.ok) {
      const j = await res?.json().catch(() => null);
      alert(j?.message || "Falha ao enviar mensagem.");
      setText(payload.content || "");
      setAttachments(payload.attachments || []);
      return;
    }

    const j = await res.json().catch(() => null);
    const created = j?.message ?? null;
    if (created) {
      setData((prev: any) => {
        if (!prev) return prev;
        const msgs = Array.isArray(prev.messages) ? prev.messages : [];
        if (msgs.some((m: any) => m.id === created.id)) return prev;
        return { ...prev, messages: [...msgs, created] };
      });
    }

    await load();
  }

  const msgs = data?.messages || [];
  const parts = Array.isArray(data?.participants) ? data.participants : [];
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of parts) {
      const uid = String(p?.userId || "");
      const uname = String(p?.user?.username || "");
      if (uid && uname) m.set(uid, uname);
    }
    return m;
  }, [parts]);

  const otherPart = parts.find((p: any) => p.userId !== meId) ?? null;
  const other = otherPart?.user ?? null;
  const meName = meId ? (nameById.get(meId) || "") : "";
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)] min-h-[540px]">
      <div className="card shrink-0">
        <h1 className="text-xl font-semibold">
          Bate-papo
          {meName && other?.username ? ` • ${meName} ↔ ${other.username}` : other?.username ? ` • ${other.username}` : ""}
        </h1>
        <div className="text-sm text-white/55 mt-1">Mensagens em bolhas (estilo WhatsApp), anexos e atualização automática.</div>
      </div>

      <div className="card flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-2">
          {msgs.length === 0 && (
            <div className="py-8 text-center text-sm text-white/55">Nenhuma mensagem ainda.</div>
          )}
          {msgs.map((m: any) => {
            const mine = meId && m.senderId === meId;
            const senderName = nameById.get(String(m.senderId || "")) || (mine ? meName : other?.username || "");
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl border border-white/10 p-3 ${mine ? "bg-emerald-500/15" : "bg-black/20"}`}>
                  <div className="text-[11px] text-white/45 flex items-center justify-between gap-2">
                    <span>{senderName || (mine ? "Você" : (other?.username ?? ""))}</span>
                    <span>{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="text-white/85 whitespace-pre-wrap">{renderMentions(String(m?.content ?? ""))}</div>
                  {Array.isArray((m as any).attachments) && (m as any).attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(m as any).attachments.map((a: any) => {
                        const url = String(a.url || "");
                        const mime = String(a.mime || "");
                        const isImg = mime.startsWith("image/") || url.match(/\.(png|jpg|jpeg|webp|gif)$/i);
                        const isVid = mime.startsWith("video/") || url.match(/\.(mp4|webm|ogg)$/i);
                        const isLink = mime === "text/url";
                        if (isImg) {
                          return (
                            <a key={a.id || url} href={url} target="_blank" rel="noreferrer" className="block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={a.name || "imagem"} className="h-32 w-32 object-cover rounded-xl border border-white/10" />
                            </a>
                          );
                        }
                        if (isVid) {
                          return <video key={a.id || url} src={url} controls className="h-40 rounded-xl border border-white/10" />;
                        }
                        return (
                          <a key={a.id || url} href={url} target="_blank" rel="noreferrer" className="text-xs underline text-white/80 hover:text-white">
                            {isLink ? url : (a.name || url)}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* composer fixo embaixo */}
        <div className="relative mt-3 pt-3 border-t border-white/10">
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => onPickFiles(e.target.files)} />

          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div key={a.url} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-2 py-1 text-xs text-white/80">
                  <span className="max-w-[260px] truncate">{a.name || a.url}</span>
                  <button onClick={() => removeAttachment(a.url)} className="text-white/50 hover:text-white/90" type="button">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite sua mensagem... (use @usuario ou @cargo)"
              className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/85 outline-none"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm text-white/80"
              title="Anexar arquivo"
              type="button"
            >
              Anexar
            </button>
            <button
              onClick={addLinkAttachment}
              className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm text-white/80"
              title="Anexar link"
              type="button"
            >
              Link
            </button>
            <button onClick={send} className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2" type="button">
              Enviar
            </button>

            {mentionOpen && mentionItems.length > 0 && (
              <div className="absolute left-0 right-24 bottom-[52px] rounded-2xl border border-white/10 bg-black/90 backdrop-blur p-2 shadow-xl z-[100000]">
                <div className="text-[11px] text-white/45 px-2 py-1">
                  {loadingMentions ? "Buscando…" : "Sugestões"} • cargos e usuários
                </div>
                <div className="max-h-[240px] overflow-auto">
                  {mentionItems.map((it) => (
                    <button
                      key={`${it.kind}:${it.id}`}
                      type="button"
                      onClick={() => pickMention(it)}
                      className="w-full text-left rounded-xl px-3 py-2 hover:bg-white/10"
                    >
                      <div className="text-sm text-white/85">
                        <span className="font-semibold">@{it.name}</span>
                        {it.kind === "role" ? <span className="ml-2 text-xs text-white/45">cargo</span> : null}
                        {it.kind === "user" ? <span className="ml-2 text-xs text-white/45">{it.extra ?? ""}</span> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
