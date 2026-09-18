"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/* =====================================================================
 *  PALPITE10 — Yönetim Paneli  (/admin)
 *  Tek dosya. Tüm işlemler /api/admin üzerinden yapılır.
 *  Arayüz Türkçe; botun müşteriye yazdığı metinler Portekizce kalır.
 * ===================================================================== */

type Any = any;
class AuthError extends Error {}

async function api(action: string, body: Record<string, unknown> = {}): Promise<Any> {
  const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
  const j = await r.json().catch(() => ({ error: "Sunucudan geçersiz cevap geldi." }));
  if (r.status === 401 && action !== "login") throw new AuthError("Oturum süresi doldu.");
  if (!r.ok) throw new Error(j.error || "Bir hata oluştu.");
  return j;
}
const notify = (text: string, bad = false) => window.dispatchEvent(new CustomEvent("adm-toast", { detail: { text, bad } }));

function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) notify(ok);
    } catch (e) {
      if (e instanceof AuthError) window.dispatchEvent(new Event("adm-auth"));
      else notify((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  }, []);
  return [busy, run] as const;
}

function setIn<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  const copy: Any = Array.isArray(obj) ? [...obj] : { ...(obj as Any) };
  copy[k!] = setIn(copy[k!], rest, value);
  return copy;
}
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "–");
const pct = (a: number, b: number) => (b > 0 ? `%${((a / b) * 100).toFixed(1)}` : "–");
const money = (v: unknown) => `R$ ${Number(v ?? 0).toFixed(2)}`;

const STAGE_TR: Record<string, string> = { NEW: "Yeni geldi", DISCOVERY: "Tanışma", FREE_INVITED: "Ücretsiz kanala davet edildi", ENGAGED: "Ücretsiz kanalda", VIP_OFFERED: "VIP teklif edildi", CHECKOUT: "Ödeme sayfasında", PAID: "VIP müşteri", NOT_INTERESTED: "VIP istemiyor", ANY: "Her aşama" };
const PLAN_TR: Record<string, string> = { weekly: "Haftalık", monthly: "Aylık", three_months: "3 Aylık" };
const SIGNAL_TR: Record<string, string> = {
  follows_football: "Futbol takip ediyor", uses_predictions: "Tahmin kullanıyor / kullanmak istiyor", frequent_user: "Tahminleri sık takip ediyor", follows_specific_league: "Belirli bir lig/takım söyledi",
  values_analysis: "Analize değer veriyor", compares_sources: "Başka kanalları da takip ediyor", paid_before: "Daha önce tahmin için para ödemiş", wants_more_content: "Daha fazla tahmin istiyor",
  positive_reaction: "Ücretsiz içeriğe olumlu tepki", asks_about_vip: "VIP'i kendisi sordu", asks_whats_included: "VIP'te ne var diye sordu", asks_about_price: "Fiyat sordu", asks_about_access: "Nasıl girilir / ödenir diye sordu",
  asks_about_results: "Sonuçları / geçmişi sordu", explicit_purchase_intent: "Açıkça satın almak istediğini söyledi", objection_resolved: "İtirazı çözüldü, devam etti", renewed_interest: "Tereddütten sonra yeniden ilgilendi",
  objection_price: "İtiraz: pahalı", objection_trust: "İtiraz: güvenmiyor", objection_value: "İtiraz: ücretsizden farkını görmüyor", explicit_no: "Açıkça istemediğini söyledi",
  returned_to_bot: "Başka bir gün geri yazdı", joined_free_channel: "Ücretsiz kanala girdi (doğrulandı)", clicked_vip_plan: "Bir plana tıkladı", checkout_started: "Ödeme sayfasını açtı",
};
const QUALITY_TR: Record<string, string> = { answered_questions: "Sorulara cevap verdi", brevity: "Kısa ve net", relevance: "Konuyla ilgili", no_repetition: "Kendini tekrar etmedi", offer_timing: "Teklif zamanlaması", honesty: "Dürüstlük" };

/* ------------------------------ stil ------------------------------ */
const CSS = `
.adm{position:fixed;inset:0;overflow:auto;background:#fff;color:#17231c;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;z-index:10}
.adm *{box-sizing:border-box}
.adm h1,.adm h2,.adm h3{font-family:inherit;letter-spacing:0;color:#0f1a14;margin:0;text-wrap:initial}
.adm h1{font-size:19px;line-height:1.2;font-weight:800}.adm h2{font-size:18px;line-height:1.3;font-weight:700}.adm h3{font-size:15px;font-weight:700}
.adm p{margin:0}.adm a{color:#0b7a3b}
.a-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:#fff;border-bottom:1px solid #e6ebe8}
.a-top b{color:#0b7a3b}
.a-shell{display:grid;grid-template-columns:230px 1fr;min-height:calc(100vh - 56px)}
.a-nav{border-right:1px solid #e6ebe8;padding:14px 10px;display:flex;flex-direction:column;gap:4px;background:#fafcfb}
.a-nav button{all:unset;cursor:pointer;padding:11px 12px;border-radius:10px;font-weight:600;color:#33443b;display:flex;justify-content:space-between;align-items:center;gap:8px}
.a-nav button:hover{background:#eef4f0}.a-nav button.on{background:#0b7a3b;color:#fff}
.a-main{padding:22px;max-width:1180px;width:100%}
.a-intro{color:#55655c;margin:4px 0 18px;max-width:70ch}
.a-card{border:1px solid #e1e8e4;border-radius:14px;padding:18px;margin-bottom:16px;background:#fff}
.a-card>header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.a-desc{color:#5b6b62;font-size:13.5px;margin-top:3px;max-width:75ch}
.a-field{margin-bottom:14px}.a-field>label{display:block;font-weight:650;margin-bottom:4px}
.a-help{color:#66776d;font-size:13px;margin:2px 0 6px}
.adm input,.adm textarea,.adm select{width:100%;font:inherit;color:inherit;background:#fff;border:1.5px solid #cfd9d3;border-radius:10px;padding:9px 11px}
.adm textarea{resize:vertical;line-height:1.45}.adm input:focus,.adm textarea:focus,.adm select:focus{outline:none;border-color:#0b7a3b;box-shadow:0 0 0 3px #0b7a3b22}
.a-mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
.a-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:10px;font-weight:700;background:#0b7a3b;color:#fff;text-align:center;min-height:22px}
.a-btn:hover{filter:brightness(1.07)}.a-btn:focus-visible{outline:3px solid #0b7a3b55;outline-offset:2px}
.a-btn.ghost{background:#fff;color:#0b7a3b;box-shadow:inset 0 0 0 1.5px #0b7a3b}.a-btn.soft{background:#eef4f0;color:#1d3a2a}.a-btn.danger{background:#fff;color:#b3261e;box-shadow:inset 0 0 0 1.5px #b3261e}
.a-btn.small{padding:6px 11px;font-size:13.5px}.a-btn[aria-disabled=true]{opacity:.55;pointer-events:none}
.a-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.a-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.a-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.a-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12.5px;font-weight:700;background:#eef2f0;color:#3c4d44;white-space:nowrap}
.a-pill.green{background:#dff3e7;color:#0b6a33}.a-pill.red{background:#fde7e5;color:#a3241d}.a-pill.amber{background:#fff1d6;color:#8a5a00}.a-pill.blue{background:#e3edff;color:#1f3fbf}
.a-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.a-stat{border:1px solid #e1e8e4;border-radius:14px;padding:14px}.a-stat b{display:block;font-size:26px;line-height:1.1}.a-stat span{color:#5b6b62;font-size:13px}
.a-bar{height:10px;border-radius:6px;background:#eef2f0;overflow:hidden}.a-bar>i{display:block;height:100%;background:#0b7a3b;border-radius:6px}
.a-funnel{display:grid;grid-template-columns:230px 1fr 130px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px dashed #e6ebe8;font-size:14px}
.a-warn{background:#fff7e0;border:1px solid #f1d58a;color:#6b4a00;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:14px}
.a-info{background:#eef6ff;border:1px solid #c6dbfb;color:#1b3a73;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:14px}
.a-lock{background:#f6f7f6;border:1px dashed #b9c5be;border-radius:12px;padding:12px 14px;white-space:pre-wrap;font-size:13px;color:#44544b;max-height:320px;overflow:auto}
.a-table{width:100%;border-collapse:collapse;font-size:14px}.a-table th{text-align:left;color:#5b6b62;font-weight:650;font-size:12.5px;padding:6px 8px;border-bottom:1.5px solid #e1e8e4}.a-table td{padding:8px;border-bottom:1px solid #eef2f0;vertical-align:top}
.a-scroll{overflow-x:auto}
.a-conv{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start}
.a-list{border:1px solid #e1e8e4;border-radius:14px;overflow:hidden;max-height:78vh;overflow-y:auto}
.a-item{all:unset;display:block;cursor:pointer;padding:11px 13px;border-bottom:1px solid #eef2f0;width:100%}.a-item:hover{background:#f5f9f6}.a-item.on{background:#e7f4ec}
.a-chat{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto;padding:12px;background:#f7faf8;border-radius:12px;border:1px solid #e6ebe8}
.a-msg{max-width:82%;padding:8px 12px;border-radius:14px;white-space:pre-wrap;word-break:break-word;font-size:14.5px}
.a-msg.user{align-self:flex-start;background:#fff;border:1px solid #dfe7e2}.a-msg.assistant{align-self:flex-end;background:#d9f2e2}.a-msg.event{align-self:center;background:none;color:#7a8a81;font-size:12.5px;text-align:center;padding:2px}
.a-msg small{display:block;color:#7a8a81;font-size:11.5px;margin-top:3px}.a-msg em{display:block;font-style:normal;color:#1f3fbf;border-top:1px dashed #b9c5be;margin-top:5px;padding-top:4px}
.a-stars button{all:unset;cursor:pointer;font-size:30px;line-height:1;color:#cfd9d3;padding:0 3px}.a-stars button.on{color:#f0a800}
.a-toast{position:fixed;right:16px;bottom:16px;z-index:50;max-width:min(440px,92vw);padding:12px 16px;border-radius:12px;background:#0f1a14;color:#fff;white-space:pre-wrap;box-shadow:0 8px 30px #0003;font-size:14px}.a-toast.bad{background:#a3241d}
.a-login{min-height:100vh;display:grid;place-items:center;padding:20px;background:#f7faf8}.a-login form,.a-login .a-card{width:min(400px,100%)}
.a-listedit{display:flex;gap:8px;margin-bottom:8px;align-items:flex-start}
@media (max-width:900px){.a-shell{grid-template-columns:1fr}.a-nav{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid #e6ebe8;padding:8px}.a-nav button{white-space:nowrap;padding:9px 12px}
.a-main{padding:14px}.a-stats{grid-template-columns:1fr 1fr}.a-grid2,.a-grid3{grid-template-columns:1fr}.a-conv{grid-template-columns:1fr}.a-conv.open .a-listwrap{display:none}.a-conv:not(.open) .a-detail{display:none}.a-funnel{grid-template-columns:1fr 90px}.a-funnel .a-bar{display:none}}
`;

/* ------------------------------ parçalar ------------------------------ */
function Card({ title, desc, right, children }: { title?: ReactNode; desc?: ReactNode; right?: ReactNode; children?: ReactNode }) {
  return (
    <section className="a-card">
      {(title || right) && (
        <header>
          <div>
            {title && <h2>{title}</h2>}
            {desc && <p className="a-desc">{desc}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}
function Field({ label, help, children }: { label: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="a-field">
      <label>{label}</label>
      {help && <p className="a-help">{help}</p>}
      {children}
    </div>
  );
}
function Txt({ value, onChange, rows, placeholder, mono }: { value: string | null | undefined; onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean }) {
  return rows ? (
    <textarea className={mono ? "a-mono" : ""} rows={rows} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}
function Num({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return <input type="number" inputMode="decimal" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step ?? 1} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />;
}
function Btn({ children, onClick, kind, small, busy, disabled }: { children: ReactNode; onClick?: () => void; kind?: "ghost" | "soft" | "danger"; small?: boolean; busy?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`a-btn ${kind ?? ""} ${small ? "small" : ""}`} aria-disabled={busy || disabled} onClick={onClick}>
      {busy ? "Bekleyin…" : children}
    </button>
  );
}
function Pill({ children, tone }: { children: ReactNode; tone?: "green" | "red" | "amber" | "blue" }) {
  return <span className={`a-pill ${tone ?? ""}`}>{children}</span>;
}
function ListEdit({ items, onChange, placeholder, rows }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      {items.map((it, i) => (
        <div className="a-listedit" key={i}>
          <Txt value={it} rows={rows} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
          <Btn kind="danger" small onClick={() => onChange(items.filter((_, j) => j !== i))}>Sil</Btn>
        </div>
      ))}
      <Btn kind="soft" small onClick={() => onChange([...items, ""])}>+ {placeholder ?? "Satır ekle"}</Btn>
    </div>
  );
}
function SaveBar({ onSave, onReset, busy, dirty }: { onSave: () => void; onReset: () => void; busy: string | null; dirty: boolean }) {
  return (
    <div className="a-row" style={{ position: "sticky", bottom: 0, background: "#fff", padding: "12px 0", borderTop: "1px solid #e6ebe8", zIndex: 2 }}>
      <Btn onClick={onSave} busy={busy === "save"}>Kaydet ve hemen uygula</Btn>
      <Btn kind="danger" onClick={() => window.confirm("Bu bölümdeki TÜM değişiklikleriniz silinsin ve ilk ayarlara dönülsün mü?") && onReset()} busy={busy === "reset"}>Varsayılana dön</Btn>
      {dirty && <Pill tone="amber">Kaydedilmemiş değişiklik var</Pill>}
      <span className="a-help">Kaydettikten sonra bot yaklaşık 30 saniye içinde yeni ayarları kullanır. Yeniden yayınlamaya (redeploy) gerek yok.</span>
    </div>
  );
}

/* =====================================================================
 *  1. GENEL BAKIŞ
 * ===================================================================== */
const FUNNEL_STEPS: [string, string][] = [
  ["landing_leads", "Sitede butona basan"], ["started_bot", "Botu başlatan"], ["replied", "Bota cevap yazan"], ["invited_free", "Ücretsiz kanala davet edilen"],
  ["joined_free", "Ücretsiz kanala giren"], ["saw_plans", "VIP planlarını gören"], ["checkout", "Ödeme sayfasını açan"], ["paid", "Satın alan"],
];

function Overview({ go }: { go: (tab: string) => void }) {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Any>(null);
  const [, run] = useBusy();
  useEffect(() => {
    run("load", async () => setD(await api("overview", { days })));
  }, [days, run]);
  const f = d?.period ?? {};
  const top = Math.max(1, ...FUNNEL_STEPS.map(([k]) => Number(f[k] ?? 0)));
  return (
    <>
      <h1>Genel Bakış</h1>
      <p className="a-intro">Seçtiğiniz dönemde gelen kişilerin satış hunisinde nereye kadar ilerlediğini gösterir. En büyük düşüşün olduğu adım, geliştirmeniz gereken yerdir.</p>
      <div className="a-row" style={{ marginBottom: 14 }}>
        {[[1, "Son 24 saat"], [7, "Son 7 gün"], [30, "Son 30 gün"], [0, "Tüm zamanlar"]].map(([v, l]) => (
          <Btn key={v} small kind={days === v ? undefined : "soft"} onClick={() => setDays(Number(v))}>{l}</Btn>
        ))}
      </div>
      {d && (d.alerts.needsHuman > 0 || d.alerts.unlinked > 0 || d.alerts.proposals > 0) && (
        <div className="a-warn">
          <b>Sizi bekleyen işler:</b>
          <div className="a-row" style={{ marginTop: 8 }}>
            {d.alerts.needsHuman > 0 && <Btn small kind="ghost" onClick={() => go("konusmalar")}>{d.alerts.needsHuman} kişi insan desteği istiyor</Btn>}
            {d.alerts.unlinked > 0 && <Btn small kind="ghost" onClick={() => go("odemeler")}>{d.alerts.unlinked} ödeme kişiye bağlanamadı</Btn>}
            {d.alerts.proposals > 0 && <Btn small kind="ghost" onClick={() => go("ogrenme")}>{d.alerts.proposals} yeni satış önerisi onayınızı bekliyor</Btn>}
          </div>
        </div>
      )}
      <div className="a-stats">
        <div className="a-stat"><b>{f.started_bot ?? 0}</b><span>Botu başlatan kişi</span></div>
        <div className="a-stat"><b>{f.joined_free ?? 0}</b><span>Ücretsiz kanala giren</span></div>
        <div className="a-stat"><b>{f.paid ?? 0}</b><span>Satın alan · dönüşüm {pct(f.paid ?? 0, f.started_bot ?? 0)}</span></div>
        <div className="a-stat"><b>{money(f.revenue)}</b><span>Bu kişilerden gelen gelir</span></div>
      </div>
      <Card title="Satış hunisi" desc="Her satırdaki yüzde, bir önceki adıma göre kaç kişinin devam ettiğini gösterir.">
        {FUNNEL_STEPS.map(([k, label], i) => {
          const v = Number(f[k] ?? 0);
          const prev = i ? Number(f[FUNNEL_STEPS[i - 1]![0]] ?? 0) : 0;
          return (
            <div className="a-funnel" key={k}>
              <span>{label}</span>
              <div className="a-bar"><i style={{ width: `${(v / top) * 100}%` }} /></div>
              <span><b>{v}</b> {i > 0 && <span className="a-help">({pct(v, prev)})</span>}</span>
            </div>
          );
        })}
        <p className="a-help" style={{ marginTop: 10 }}>VIP istemeyen: {f.not_interested ?? 0} · Mesaj istemeyen: {f.opted_out ?? 0} · Botu engelleyen: {f.blocked ?? 0} · Satış kapatılan (yaş/risk): {f.do_not_sell ?? 0}</p>
      </Card>
      <div className="a-grid2">
        <Card title="Reklam kampanyaları" desc="Hangi kampanya / reklam gerçekten satış getiriyor?">
          <div className="a-scroll">
            <table className="a-table">
              <thead><tr><th>Kampanya / reklam</th><th>Gelen</th><th>Başlatan</th><th>Kanal</th><th>Ödeme</th><th>Satış</th><th>Gelir</th></tr></thead>
              <tbody>
                {(d?.campaigns ?? []).map((c: Any, i: number) => (
                  <tr key={i}><td>{c.campaign ?? "(kampanyasız)"}<br /><span className="a-help">{c.ad ?? ""}</span></td><td>{c.leads}</td><td>{c.started}</td><td>{c.joined_free}</td><td>{c.checkout}</td><td><b>{c.paid}</b></td><td>{money(c.revenue)}</td></tr>
                ))}
                {!d?.campaigns?.length && <tr><td colSpan={7} className="a-help">Henüz veri yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="İnsanlar neye itiraz ediyor?" desc="Botun konuşmalarda yakaladığı itirazlar.">
          {(d?.objections ?? []).map((o: Any) => (
            <div className="a-funnel" style={{ gridTemplateColumns: "1fr 170px" }} key={o.type}>
              <span>{({ price: "Fiyat (pahalı)", trust: "Güven (dolandırıcılık mı?)", value: "Değer (ücretsizden farkı ne?)", timing: "Zaman (sonra bakarım)", results: "Sonuç / garanti", other: "Diğer" } as Any)[o.type] ?? o.type}</span>
              <span><b>{o.leads}</b> kişi · {o.paid_leads} tanesi yine de aldı</span>
            </div>
          ))}
          {!d?.objections?.length && <p className="a-help">Henüz itiraz kaydı yok.</p>}
        </Card>
      </div>
      <Card title="Son ödemeler">
        <div className="a-scroll">
          <table className="a-table">
            <thead><tr><th>Tarih</th><th>Kişi</th><th>Plan</th><th>Tutar</th><th>Durum</th></tr></thead>
            <tbody>
              {(d?.sales ?? []).map((s: Any) => (
                <tr key={s.whop_payment_id}><td>{when(s.created_at)}</td><td>{s.leads?.first_name ?? "Bağlanmamış"} {s.leads?.username ? `@${s.leads.username}` : ""}</td><td>{PLAN_TR[s.plan_key] ?? s.plan_key ?? "–"}</td><td>{money(s.amount)}</td>
                  <td>{s.status === "refunded" ? <Pill tone="red">İade</Pill> : s.is_first ? <Pill tone="green">Yeni satış</Pill> : <Pill tone="blue">Yenileme</Pill>}</td></tr>
              ))}
              {!d?.sales?.length && <tr><td colSpan={5} className="a-help">Henüz ödeme yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* =====================================================================
 *  2. KONUŞMALAR  (oku · Türkçeye çevir · puan ver · bot adına yaz)
 * ===================================================================== */
const FILTERS: [string, string][] = [["all", "Hepsi"], ["needs_human", "İnsan desteği istiyor"], ["hot", "Sıcak (puan 60+)"], ["checkout", "Ödemeyi yarıda bıraktı"], ["paid", "Satın aldı"], ["lost", "Kaybedildi"]];

function LeadDetail({ id, back, changed }: { id: string; back: () => void; changed: () => void }) {
  const [d, setD] = useState<Any>(null);
  const [tr, setTr] = useState<Record<number, string>>({});
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [say, setSay] = useState("");
  const [busy, run] = useBusy();
  const load = useCallback(() => run("load", async () => {
    const r = await api("lead", { id });
    setD(r); setRating(r.review?.rating ?? 0); setNote(r.review?.note ?? "");
  }), [id, run]);
  useEffect(() => { setD(null); setTr({}); load(); }, [load]);
  if (!d) return <Card><p className="a-help">Yükleniyor…</p></Card>;
  const L = d.lead;
  const act = (op: string, ok: string, extra: Record<string, unknown> = {}) => run(op, async () => { await api("lead_action", { id, op, ...extra }); await load(); changed(); }, ok);
  const translate = () => run("tr", async () => {
    const msgs = d.messages.filter((m: Any) => m.role !== "event").slice(-80);
    const r = await api("translate", { texts: msgs.map((m: Any) => m.content) });
    setTr(Object.fromEntries(msgs.map((m: Any, i: number) => [m.id, r.t[i]])));
  });
  const q = d.analysis?.quality_detail ?? null;
  return (
    <div>
      <div className="a-row" style={{ marginBottom: 10 }}><Btn small kind="soft" onClick={back}>← Listeye dön</Btn></div>
      <Card
        title={<>{L.first_name ?? "İsimsiz"} {L.username && <span className="a-help">@{L.username}</span>}</>}
        desc={<>Telegram ID: {L.telegram_user_id} · İlk geliş: {when(L.created_at)} · Kampanya: {L.campaign ?? "–"}</>}
        right={<div className="a-row"><Pill tone="blue">{STAGE_TR[L.stage] ?? L.stage}</Pill>{L.paid && <Pill tone="green">Ödedi · {money(L.total_revenue)}</Pill>}{L.needs_human && <Pill tone="amber">İnsan bekliyor</Pill>}{L.do_not_sell && <Pill tone="red">Satış kapalı</Pill>}{L.opted_out && <Pill tone="red">Mesaj istemiyor</Pill>}{L.blocked && <Pill tone="red">Botu engelledi</Pill>}</div>}
      >
        <div className="a-row" style={{ marginBottom: 12 }}>
          <Btn small kind="ghost" onClick={translate} busy={busy === "tr"}>🇹🇷 Konuşmayı Türkçeye çevir</Btn>
          {L.needs_human ? <Btn small onClick={() => act("human_done", "İşaret kaldırıldı, bot devam ediyor.")}>İlgilendim, işareti kaldır</Btn> : <Btn small kind="soft" onClick={() => act("human_needed", "İşaretlendi.")}>“İnsan ilgilenecek” diye işaretle</Btn>}
          {L.do_not_sell ? <Btn small kind="soft" onClick={() => act("sell_on", "Satış tekrar açıldı.")}>Satışı tekrar aç</Btn> : <Btn small kind="danger" onClick={() => act("sell_off", "Bu kişiye artık satış yapılmayacak.")}>Bu kişiye satış yapma</Btn>}
        </div>
        <div className="a-chat">
          {d.messages.map((m: Any) => (
            <div key={m.id} className={`a-msg ${m.role}`}>
              {m.content}
              {tr[m.id] && <em>{tr[m.id]}</em>}
              {m.role !== "event" && <small>{m.role === "user" ? "Müşteri" : "Bot"} · {when(m.created_at)}</small>}
            </div>
          ))}
          {!d.messages.length && <p className="a-help">Henüz mesaj yok.</p>}
        </div>
      </Card>

      <Card title="Bu konuşmaya puan verin" desc="Botun bu konuşmadaki satış performansını değerlendirin. Puanınız ve notunuz, yapay zekâ koçuna EN GÜÇLÜ kanıt olarak gönderilir ve bir sonraki satış önerisini doğrudan etkiler. Notu Türkçe yazabilirsiniz.">
        <div className="a-stars" style={{ marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} className={n <= rating ? "on" : ""} onClick={() => setRating(n)} aria-label={`${n} yıldız`}>★</button>)}
          <span className="a-help" style={{ marginLeft: 8 }}>{["Puan seçin", "Çok kötü", "Kötü", "Orta", "İyi", "Mükemmel"][rating]}</span>
        </div>
        <Txt rows={3} value={note} onChange={setNote} placeholder="Örn: Fiyatı çok erken söyledi. Önce kişinin ne aradığını sormalıydı. / Çok iyi: itirazı sakin karşıladı." />
        <div className="a-row" style={{ marginTop: 10 }}>
          <Btn onClick={() => run("rev", async () => { await api("review_save", { lead_id: id, rating, note }); changed(); }, "Puanınız kaydedildi. Koç bir sonraki öğrenme turunda kullanacak.")} busy={busy === "rev"} disabled={!rating}>Puanı kaydet</Btn>
          {d.review?.used_in_batch && <Pill tone="green">Koç bu puanı kullandı (tur #{d.review.used_in_batch})</Pill>}
        </div>
      </Card>

      <div className="a-grid2">
        <Card title={`İlgi puanı: ${L.score}/100`} desc="Bot, kişinin yazdıklarından kanıt toplar; puanı sistem hesaplar. Ağırlıkları “Kurallar ve Puanlama” sekmesinden değiştirebilirsiniz.">
          <div className="a-bar" style={{ marginBottom: 10 }}><i style={{ width: `${L.score}%` }} /></div>
          {d.signals.map((s: Any) => (
            <p key={s.key} style={{ fontSize: 14, marginBottom: 6 }}>• <b>{SIGNAL_TR[s.key] ?? s.key}</b>{s.evidence ? <span className="a-help"> — “{s.evidence}”</span> : null}</p>
          ))}
          {!d.signals.length && <p className="a-help">Henüz sinyal yok.</p>}
          {d.profile && <p className="a-help" style={{ marginTop: 8 }}>Hafıza: takım {d.profile.favorite_team ?? "?"} · aradığı: {(d.profile.wants ?? []).join("; ") || "?"} · itirazlar: {(d.profile.objections ?? []).join(", ") || "yok"}</p>}
        </Card>
        <Card title="Yapay zekâ analizi" desc="Konuşma bittiğinde (satış, ret veya 7 gün sessizlik) otomatik yapılır. İngilizcedir.">
          {d.analysis ? (
            <>
              <p style={{ marginBottom: 8 }}><Pill tone={d.analysis.outcome === "won" ? "green" : "red"}>{d.analysis.outcome === "won" ? "Kazanıldı" : `Kaybedildi · ${d.analysis.loss_reason ?? ""}`}</Pill> <Pill>Kalite {d.analysis.conversation_quality}/100</Pill></p>
              {q && Object.entries(QUALITY_TR).map(([k, l]) => (
                <div className="a-funnel" style={{ gridTemplateColumns: "170px 1fr 40px", padding: "3px 0", border: 0 }} key={k}><span style={{ fontSize: 13 }}>{l}</span><div className="a-bar"><i style={{ width: `${(q[k] ?? 0) * 10}%` }} /></div><b>{q[k] ?? "–"}</b></div>
              ))}
              <p style={{ margin: "8px 0", fontSize: 14 }}>{d.analysis.summary}</p>
              {(d.analysis.agent_mistakes ?? []).length > 0 && <p style={{ fontSize: 14 }}><b>Botun hataları:</b> {d.analysis.agent_mistakes.join(" · ")}</p>}
              {(d.analysis.what_worked ?? []).length > 0 && <p style={{ fontSize: 14 }}><b>İşe yarayanlar:</b> {d.analysis.what_worked.join(" · ")}</p>}
            </>
          ) : <p className="a-help">Bu konuşma henüz analiz edilmedi (hâlâ açık).</p>}
        </Card>
      </div>

      <Card title="Bot adına mesaj gönder" desc="Yazdığınız metin müşteriye AYNEN gider (çevrilmez). Müşteriler Brezilyalı olduğu için Portekizce yazın.">
        <Txt rows={3} value={say} onChange={setSay} placeholder="Oi! Aqui é da equipe PALPITE10…" />
        <div style={{ marginTop: 10 }}><Btn onClick={() => act("say", "Mesaj gönderildi.", { text: say }).then(() => setSay(""))} busy={busy === "say"} disabled={!say.trim()}>Gönder</Btn></div>
      </Card>
    </div>
  );
}

function Conversations() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [d, setD] = useState<Any>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [, run] = useBusy();
  const load = useCallback(() => run("load", async () => setD(await api("leads", { filter, q, page }))), [filter, q, page, run]);
  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [load, q]);
  return (
    <>
      <h1>Konuşmalar</h1>
      <p className="a-intro">Botun müşterilerle yaptığı bütün konuşmalar. Bir kişiye tıklayın: konuşmayı okuyun, Türkçeye çevirin, bota puan verin veya bot adına kendiniz yazın.</p>
      <div className="a-row" style={{ marginBottom: 10 }}>
        {FILTERS.map(([k, l]) => <Btn key={k} small kind={filter === k ? undefined : "soft"} onClick={() => { setFilter(k); setPage(0); }}>{l}</Btn>)}
      </div>
      <div className={`a-conv ${sel ? "open" : ""}`}>
        <div className="a-listwrap">
          <input placeholder="İsim, @kullanıcı adı veya Telegram ID ara…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} style={{ marginBottom: 10 }} />
          <div className="a-list">
            {(d?.leads ?? []).map((l: Any) => (
              <button key={l.id} className={`a-item ${sel === l.id ? "on" : ""}`} onClick={() => setSel(l.id)}>
                <div className="a-row" style={{ justifyContent: "space-between" }}><b>{l.first_name ?? "İsimsiz"}</b><span className="a-help">{when(l.last_user_message_at)}</span></div>
                <div className="a-row" style={{ gap: 6, marginTop: 4 }}>
                  <Pill>{STAGE_TR[l.stage] ?? l.stage}</Pill><Pill tone={l.score >= 60 ? "green" : undefined}>puan {l.score}</Pill>
                  {l.paid && <Pill tone="green">ödedi</Pill>}{l.needs_human && <Pill tone="amber">insan bekliyor</Pill>}{l.rating && <Pill tone="blue">★ {l.rating}</Pill>}
                </div>
              </button>
            ))}
            {d && !d.leads.length && <p className="a-help" style={{ padding: 14 }}>Bu filtrede kimse yok.</p>}
          </div>
          <div className="a-row" style={{ marginTop: 10 }}>
            {page > 0 && <Btn small kind="soft" onClick={() => setPage(page - 1)}>← Önceki</Btn>}
            {d?.hasMore && <Btn small kind="soft" onClick={() => setPage(page + 1)}>Sonraki →</Btn>}
          </div>
        </div>
        <div className="a-detail">{sel ? <LeadDetail id={sel} back={() => setSel(null)} changed={load} /> : <Card><p className="a-help">Soldan bir kişi seçin.</p></Card>}</div>
      </div>
    </>
  );
}

/* =====================================================================
 *  Ayar sekmeleri için ortak yardımcı
 * ===================================================================== */
function useSection(section: "business" | "prompts" | "rules") {
  const [s, setS] = useState<Any>(null);
  const [draft, setDraft] = useState<Any>(null);
  const [busy, run] = useBusy();
  const take = useCallback((r: Any) => { setS(r); setDraft(r[section]); }, [section]);
  useEffect(() => { run("load", async () => take(await api("settings_get"))); }, [run, take]);
  return {
    s, draft, busy,
    dirty: Boolean(s) && JSON.stringify(s[section]) !== JSON.stringify(draft),
    upd: (path: (string | number)[], v: unknown) => setDraft((d: Any) => setIn(d, path, v)),
    save: () => run("save", async () => take(await api("settings_save", { section, value: draft })), "Kaydedildi. Bot yeni ayarları kullanıyor."),
    reset: () => run("reset", async () => take(await api("settings_reset", { section })), "İlk ayarlara dönüldü."),
  };
}

/* =====================================================================
 *  3. İŞLETME BİLGİLERİ  (botun söyleyebileceği TEK gerçekler)
 * ===================================================================== */
function Business() {
  const { s, draft: b, upd, save, reset, busy, dirty } = useSection("business");
  if (!b) return <p className="a-help">Yükleniyor…</p>;
  const tr = b.vip.trackRecord;
  const emptyTr = s.defaults.business.vip.trackRecord ?? { periods: [], scope: "", disclaimer: "Resultado passado não garante resultado futuro. Não existe garantia de acerto nem de lucro." };
  return (
    <>
      <h1>İşletme Bilgileri</h1>
      <p className="a-intro">Bot müşteriye YALNIZCA burada yazan bilgileri söyleyebilir. Boş bıraktığınız bir bilgi sorulursa bot uydurmaz; “ekibe sorup döneyim” der. Müşterinin okuyacağı metinleri <b>Portekizce</b> yazın.</p>
      <div className="a-warn">Garanti, “kesin kazanç”, “risksiz”, “son yerler” gibi ifadeler kaydedilemez — sistem reddeder. Bu hem Brezilya yasaları hem de Meta reklam hesabınızın güvenliği içindir.</div>

      <Card title="Genel">
        <div className="a-grid2">
          <Field label="Marka adı"><Txt value={b.brand} onChange={(v) => upd(["brand"], v)} /></Field>
          <Field label="En küçük yaş" help="18'in altına inemez."><Num value={b.minimumAge} min={18} max={25} onChange={(v) => upd(["minimumAge"], v)} /></Field>
        </div>
      </Card>

      <Card title="Ücretsiz kanal" desc="Bot ücretsiz kanalı anlatırken bunları kullanır.">
        <div className="a-grid2">
          <Field label="Kanalın adı"><Txt value={b.freeChannel.name} onChange={(v) => upd(["freeChannel", "name"], v)} /></Field>
          <Field label="Paylaşım sıklığı" help="Örn: 1 palpite gratuito por dia"><Txt value={b.freeChannel.postingFrequency} onChange={(v) => upd(["freeChannel", "postingFrequency"], v)} /></Field>
        </div>
        <Field label="Kanalda neler paylaşılıyor?"><ListEdit items={b.freeChannel.whatWePost} onChange={(v) => upd(["freeChannel", "whatWePost"], v)} placeholder="Madde ekle" /></Field>
        <Field label="Konumlandırma" help="Ücretsiz ile VIP arasındaki farkı bot nasıl anlatsın? (Ücretsizi kötülemeden.)"><Txt rows={3} value={b.freeChannel.positioning} onChange={(v) => upd(["freeChannel", "positioning"], v)} /></Field>
      </Card>

      <Card title="VIP" desc="Yalnızca GERÇEK faydaları yazın. Bot bu listeyi sayar, başka bir şey eklemez.">
        <div className="a-grid2">
          <Field label="VIP'in adı"><Txt value={b.vip.name} onChange={(v) => upd(["vip", "name"], v)} /></Field>
          <Field label="Erişim nasıl veriliyor?"><Txt value={b.vip.delivery} onChange={(v) => upd(["vip", "delivery"], v)} /></Field>
        </div>
        <Field label="Faydalar"><ListEdit items={b.vip.benefits} onChange={(v) => upd(["vip", "benefits"], v)} placeholder="Fayda ekle" /></Field>
        <div className="a-grid2">
          <Field label="Günde kaç tahmin?"><Txt rows={2} value={b.vip.volume} onChange={(v) => upd(["vip", "volume"], v)} /></Field>
          <Field label="Ligler / şampiyonalar" help="Şu an: “lig farkı yok, veriye göre seçiliyor”."><Txt rows={2} value={b.vip.coverage} onChange={(v) => upd(["vip", "coverage"], v)} /></Field>
          <Field label="Market türleri"><Txt rows={3} value={b.vip.marketTypes} onChange={(v) => upd(["vip", "marketTypes"], v)} /></Field>
          <Field label="Kombine (COMBO) önerileri"><Txt rows={3} value={b.vip.combos} onChange={(v) => upd(["vip", "combos"], v)} /></Field>
          <Field label="İptal koşulu"><Txt rows={2} value={b.vip.cancellation} onChange={(v) => upd(["vip", "cancellation"], v)} /></Field>
          <Field label="İade politikası" help="Boşsa bot “ekibe sorayım” der. Örn: Reembolso em até 7 dias pela Whop."><Txt rows={2} value={b.vip.refundPolicy} onChange={(v) => upd(["vip", "refundPolicy"], v)} /></Field>
        </div>
        <Field label="Aktif promosyon" help="Yalnızca GERÇEK ve şu an geçerli bir kampanya varsa yazın. Boşken bot indirim, kupon veya süre sınırından asla bahsetmez.">
          <Txt value={b.vip.activePromotion} onChange={(v) => upd(["vip", "activePromotion"], v)} placeholder="Boş = promosyon yok" />
        </Field>
        <label className="a-row"><input type="checkbox" style={{ width: 20 }} checked={b.vip.plansDifferOnlyInDuration} onChange={(e) => upd(["vip", "plansDifferOnlyInDuration"], e.target.checked)} /> Tüm planlar aynı VIP erişimini verir, yalnızca süre farklıdır</label>
      </Card>

      <Card title="Planlar ve fiyatlar" desc="Buradaki fiyat botun SÖYLEDİĞİ fiyattır. Müşterinin gerçekte ödediği tutarı Whop belirler — ikisini aynı tutun. Plan–Whop eşleşmesi (WHOP_PLAN_… değişkenleri) Vercel'de kalır.">
        <div className="a-grid3">
          {b.plans.map((p: Any, i: number) => (
            <div key={p.key} style={{ border: "1px solid #e1e8e4", borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginBottom: 8 }}>{PLAN_TR[p.key]} planı</h3>
              <Field label="Buton / plan adı"><Txt value={p.name} onChange={(v) => upd(["plans", i, "name"], v)} /></Field>
              <Field label="Fiyat yazısı" help="Müşteriye aynen böyle yazılır."><Txt value={p.priceLabel} onChange={(v) => upd(["plans", i, "priceLabel"], v)} /></Field>
              <Field label="Fiyat (sayı, R$)" help="Meta'ya gönderilen değer."><Num value={p.price} step={0.01} min={0} onChange={(v) => upd(["plans", i, "price"], v)} /></Field>
              <Field label="Ödeme tipi"><select value={p.billingType} onChange={(e) => upd(["plans", i, "billingType"], e.target.value)}><option value="recurring">Abonelik (otomatik yenilenir)</option><option value="one_time">Tek seferlik</option></select></Field>
              <Field label="Ödeme açıklaması" help="Otomatik yenilemeyi asla gizlemeyin."><Txt rows={3} value={p.billingLabel} onChange={(v) => upd(["plans", i, "billingLabel"], v)} /></Field>
              <Field label="Kime uygun?"><Txt rows={2} value={p.bestFor} onChange={(v) => upd(["plans", i, "bestFor"], v)} /></Field>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Geçmiş sonuçlar (kanıt)" desc="Bot bu sayıları yalnızca biri sonuçları / güveni sorduğunda söyler; her seferinde dönemi ve “geçmiş sonuç geleceği garanti etmez” uyarısını ekler. İsabet oranı ve ROI aşağıdaki sayılardan OTOMATİK hesaplanır; bot başka hiçbir yüzde söyleyemez.">
        <div className="a-warn"><b>Yalnızca GERÇEK ve kanıtlayabileceğiniz sonuçları girin.</b> Uydurma sonuç Brezilya'da yasa dışı reklamdır ve Meta hesabının kapanmasına yol açar. Emin değilseniz kapalı tutun.</div>
        <label className="a-row" style={{ marginBottom: 12 }}><input type="checkbox" style={{ width: 20 }} checked={Boolean(tr)} onChange={(e) => upd(["vip", "trackRecord"], e.target.checked ? emptyTr : null)} /> Botun geçmiş sonuçlardan bahsetmesine izin ver</label>
        {tr && (
          <>
            <div className="a-scroll">
              <table className="a-table" style={{ minWidth: 820 }}>
                <thead><tr><th style={{ width: 190 }}>Dönem</th><th>Toplam</th><th>Kazanan</th><th>Kaybeden</th><th>İptal</th><th>Ort. oran</th><th>Kâr (birim)</th><th>İsabet</th><th>ROI</th><th /></tr></thead>
                <tbody>
                  {tr.periods.map((p: Any, i: number) => (
                    <tr key={i}>
                      <td><Txt value={p.label} onChange={(v) => upd(["vip", "trackRecord", "periods", i, "label"], v)} placeholder="01/08/2026 a 31/08/2026" /></td>
                      {(["total", "won", "lost", "void"] as const).map((k) => <td key={k}><Num value={p[k]} min={0} onChange={(v) => upd(["vip", "trackRecord", "periods", i, k], v)} /></td>)}
                      <td><Num value={p.averageOdds} step={0.01} onChange={(v) => upd(["vip", "trackRecord", "periods", i, "averageOdds"], v)} /></td>
                      <td><Num value={p.profitUnits} step={0.1} onChange={(v) => upd(["vip", "trackRecord", "periods", i, "profitUnits"], v)} /></td>
                      <td><b>{pct(p.won, p.won + p.lost)}</b></td><td><b>{pct(p.profitUnits, p.total)}</b></td>
                      <td><Btn small kind="danger" onClick={() => upd(["vip", "trackRecord", "periods"], tr.periods.filter((_: Any, j: number) => j !== i))}>Sil</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ margin: "10px 0 14px" }}><Btn small kind="soft" onClick={() => upd(["vip", "trackRecord", "periods"], [...tr.periods, { label: "", total: 0, won: 0, lost: 0, void: 0, averageOdds: 1.8, profitUnits: 0 }])}>+ Dönem ekle</Btn></div>
            <div className="a-grid2">
              <Field label="Kapsam notu"><Txt value={tr.scope} onChange={(v) => upd(["vip", "trackRecord", "scope"], v)} /></Field>
              <Field label="Zorunlu uyarı cümlesi"><Txt value={tr.disclaimer} onChange={(v) => upd(["vip", "trackRecord", "disclaimer"], v)} /></Field>
            </div>
          </>
        )}
      </Card>

      <Card title="Müşteri yorumları" desc="Bot en fazla BİR yorumu, kelimesi kelimesine ve isimle aktarır; yalnızca biri kullananların fikrini sorarsa. Yalnızca gerçek ve izin alınmış yorumları girin.">
        {b.vip.testimonials.map((t: Any, i: number) => (
          <div className="a-listedit" key={i}>
            <div style={{ width: 170 }}><Txt value={t.author} placeholder="Lucas M." onChange={(v) => upd(["vip", "testimonials", i, "author"], v)} /></div>
            <Txt rows={3} value={t.text} onChange={(v) => upd(["vip", "testimonials", i, "text"], v)} />
            <Btn small kind="danger" onClick={() => upd(["vip", "testimonials"], b.vip.testimonials.filter((_: Any, j: number) => j !== i))}>Sil</Btn>
          </div>
        ))}
        <Btn small kind="soft" onClick={() => upd(["vip", "testimonials"], [...b.vip.testimonials, { author: "", text: "" }])}>+ Yorum ekle</Btn>
      </Card>

      <div className="a-grid2">
        <Card title="Üslup örnekleri" desc="Botun ilham alacağı, sizin tarzınızdaki cümleler (senaryo değil)."><ListEdit items={b.voiceExamples} onChange={(v) => upd(["voiceExamples"], v)} placeholder="Cümle ekle" /></Card>
        <Card title="Bot ASLA bunları söylemesin" desc="Yerleşik güvenlik kurallarına EK olarak sizin yasaklarınız. Türkçe yazabilirsiniz."><ListEdit items={b.neverSay} onChange={(v) => upd(["neverSay"], v)} placeholder="Yasak ekle" rows={2} /></Card>
      </div>
      <SaveBar onSave={save} onReset={reset} busy={busy} dirty={dirty} />
    </>
  );
}

/* =====================================================================
 *  4. SATIŞ ASİSTANI  (prompt'lar + deneme sohbeti)
 * ===================================================================== */
const BLOCKS: [string, string, string, number][] = [
  ["mission", "Görev", "Botun kim olduğu ve neyi amaçladığı.", 6],
  ["style", "Yazı tarzı", "Mesaj uzunluğu, ton, emoji kullanımı, yasak kalıplar.", 10],
  ["method", "Satış yöntemi (adım adım)", "Botun izlediği danışman-satış sırası. Adımları değiştirebilir veya ekleyebilirsiniz.", 10],
  ["buying", "Satın alma sinyalleri", "Müşteri fiyat / VIP sorduğunda botun ne yapacağı.", 4],
  ["objections", "İtirazlara cevap", "Fiyat, güven, değer, zaman itirazları. {{PLANO_ENTRADA}} yazan yere en ucuz planın adı ve fiyatı otomatik gelir.", 8],
  ["extra", "Sizin ek talimatlarınız", "Buraya istediğinizi TÜRKÇE yazabilirsiniz (bot yine Portekizce konuşur). Örn: “Flamengo taraftarlarıyla daha samimi ol.” Güvenlik kurallarıyla çelişirse güvenlik kuralları kazanır.", 5],
];
const ACTION_TR: Record<string, string> = { none: "Sadece cevap verdi", invite_free: "Ücretsiz kanala davet etmek istiyor", offer_vip: "Kendi isteğiyle VIP teklif etmek istiyor", show_plans: "Müşteri sordu → planları göstermek istiyor", handoff_human: "İnsana devretmek istiyor", stop_selling: "Satışı bırakmak istiyor" };
const SCENARIOS: [string, string][] = [["new", "Yeni gelen biri (henüz kanalda değil)"], ["invited", "Kanala davet edildi, daha girmedi"], ["engaged", "Ücretsiz kanalda, ilgili (puan 70)"], ["offered", "VIP teklif edildi"], ["checkout", "Ödeme sayfasını açtı, bitirmedi"], ["paid", "VIP müşteri"]];

function TestChat() {
  const [scenario, setScenario] = useState("new");
  const [history, setHistory] = useState<Any[]>([]);
  const [input, setInput] = useState("");
  const [withTr, setWithTr] = useState(true);
  const [busy, run] = useBusy();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [history]);
  const send = () => {
    const text = input.trim();
    if (!text) return;
    const next = [...history, { role: "user", content: text }];
    setHistory(next); setInput("");
    run("chat", async () => {
      const out = await api("test_chat", { scenario, history: next.map((m) => ({ role: m.role, content: m.content })) });
      let t: string[] = [];
      if (withTr) t = (await api("translate", { texts: out.messages }).catch(() => ({ t: [] }))).t;
      const meta = `${ACTION_TR[out.next_action] ?? out.next_action}${Object.keys(out.signals ?? {}).length ? ` · yakaladığı sinyaller: ${Object.keys(out.signals).map((k) => SIGNAL_TR[k] ?? k).join(", ")}` : ""}${out.guardrailHits?.length ? ` · ⚠️ güvenlik filtresi devreye girdi: ${out.guardrailHits.join(", ")}` : ""}`;
      setHistory([...next, ...out.messages.map((m: string, i: number) => ({ role: "assistant", content: m, tr: t[i], meta: i === out.messages.length - 1 ? meta : undefined }))]);
    });
  };
  return (
    <Card title="Deneme sohbeti" desc="Gerçek botu, Telegram'a girmeden test edin. Siz müşteri gibi (Portekizce veya İngilizce) yazın; bot KAYDEDİLMİŞ ayarlarla cevap verir. Hiçbir müşteriye mesaj gitmez. Her mesaj küçük bir DeepSeek ücreti harcar.">
      <div className="a-grid2" style={{ marginBottom: 10 }}>
        <Field label="Senaryo"><select value={scenario} onChange={(e) => { setScenario(e.target.value); setHistory([]); }}>{SCENARIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <label className="a-row"><input type="checkbox" style={{ width: 20 }} checked={withTr} onChange={(e) => setWithTr(e.target.checked)} /> Botun cevaplarını Türkçeye de çevir</label>
      </div>
      <div className="a-chat" style={{ minHeight: 160 }}>
        {history.map((m, i) => (
          <div key={i} className={`a-msg ${m.role}`}>{m.content}{m.tr && <em>{m.tr}</em>}{m.meta && <small>Botun kararı: {m.meta}</small>}</div>
        ))}
        {!history.length && <p className="a-help">Örnek: “oi”, “quanto custa o vip?”, “isso é golpe?”, “tenho 16 anos”, “perdi tudo apostando”…</p>}
        <div ref={end} />
      </div>
      <div className="a-row" style={{ marginTop: 10 }}>
        <div style={{ flex: 1, minWidth: 200 }}><input value={input} placeholder="Müşteri olarak yazın…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && busy !== "chat" && send()} /></div>
        <Btn onClick={send} busy={busy === "chat"}>Gönder</Btn>
        <Btn kind="soft" onClick={() => setHistory([])}>Sıfırla</Btn>
      </div>
    </Card>
  );
}

function Assistant() {
  const { s, draft: p, upd, save, reset, busy, dirty } = useSection("prompts");
  const [showFull, setShowFull] = useState(false);
  if (!p) return <p className="a-help">Yükleniyor…</p>;
  return (
    <>
      <h1>Satış Asistanı</h1>
      <p className="a-intro">Botun “beyni”. Aşağıdaki bölümler botun her cevabından önce okuduğu talimatlardır. Varsayılan metinler Portekizcedir; siz Türkçe veya İngilizce de yazabilirsiniz — bot yine Portekizce cevap verir. Değiştirdikten sonra kaydedin ve alttaki <b>Deneme sohbeti</b> ile test edin.</p>
      {dirty && <div className="a-info">Deneme sohbeti KAYDEDİLMİŞ ayarları kullanır. Önce kaydedin.</div>}
      <Card title="Düzenleyebileceğiniz talimatlar">
        {BLOCKS.map(([k, label, help, rows]) => (
          <Field key={k} label={label} help={help}><Txt rows={rows} value={p.blocks[k]} onChange={(v) => upd(["blocks", k], v)} /></Field>
        ))}
      </Card>
      <Card title="Aşamaya göre talimatlar" desc="Bot, kişinin hunideki yerine göre bu ek talimatlardan yalnızca birini görür.">
        {Object.keys(p.stages).map((k) => (
          <Field key={k} label={STAGE_TR[k] ?? k}><Txt rows={3} value={p.stages[k]} onChange={(v) => upd(["stages", k], v)} /></Field>
        ))}
      </Card>
      <Card title="🔒 Kilitli güvenlik kuralları" desc="Bunlar panelden DEĞİŞTİRİLEMEZ: garanti vermeme, reşit olmayanlara ve kumar sorunu yaşayanlara satış yapmama, robot olduğunu gizlememe, kayıpları “geri kazan” dememe. Bunlar müşterilerinizi, reklam hesabınızı ve sizi korur. Ayrıca botun her mesajı gönderilmeden önce otomatik filtreden geçer.">
        <div className="a-lock">{s.lockedPrompt}</div>
        <div style={{ marginTop: 10 }}><Btn small kind="soft" onClick={() => setShowFull(!showFull)}>{showFull ? "Gizle" : "Botun gördüğü TAM talimatı göster"}</Btn></div>
        {showFull && <div className="a-lock" style={{ marginTop: 10, maxHeight: 520 }}>{s.fullPrompt}</div>}
      </Card>
      <SaveBar onSave={save} onReset={reset} busy={busy} dirty={dirty} />
      <div style={{ height: 16 }} />
      <TestChat />
    </>
  );
}

/* =====================================================================
 *  5. KURALLAR VE PUANLAMA
 * ===================================================================== */
const RULE_TR: Record<string, [string, string]> = {
  minRepliesBeforeFreeInvite: ["Ücretsiz kanala davet için en az cevap", "Kişi bota en az bu kadar mesaj yazmadan bot kanala davet edemez."],
  forceFreeInviteAfterReplies: ["Bu kadar cevaptan sonra daveti zorunlu yap", "Bot unutsa bile sistem daveti kendisi gönderir."],
  minRepliesAfterJoinBeforeOffer: ["Kanala girdikten sonra VIP teklifi için en az cevap", "Kişi önce ücretsiz içeriği görsün, biraz konuşsun."],
  vipScoreThreshold: ["VIP teklifi için gereken ilgi puanı (0–100)", "Düşürürseniz bot daha erken teklif eder; yükseltirseniz daha seçici olur."],
  offerDueAfterEligibleTurns: ["Uygun olduktan kaç mesaj sonra “şimdi teklif et” densin", "0 = hemen."],
  maxProactiveOffers: ["Bot kendi isteğiyle en fazla kaç kez VIP teklif etsin", "Müşteri kendisi sorarsa bu sınıra takılmaz, her zaman cevap alır."],
  offerCooldownHours: ["İki teklif arasında bekleme (saat)", ""],
  closeAsLostAfterSilentDays: ["Kaç gün sessizlikten sonra “kaybedildi” sayılsın", "O zaman konuşma analiz edilir. Kişi tekrar yazarsa otomatik yeniden açılır."],
  historyMessages: ["Bot her cevapta son kaç mesajı okusun", "Fazlası daha pahalı, azı daha unutkan."],
  maxPerLeadTotal: ["Bir kişiye en fazla kaç takip mesajı", ""], maxSinceLastReply: ["Cevap gelmeden art arda en fazla kaç takip mesajı", ""],
  sendFromHour: ["Takip mesajı başlangıç saati (Brezilya saati)", ""], sendUntilHour: ["Takip mesajı bitiş saati (Brezilya saati)", ""], maxPerRun: ["Tek çalışmada en fazla kaç mesaj gönderilsin", ""],
  coachBatchSize: ["Kaç analiz birikince koç yeni öneri hazırlasın", "Az = sık ama zayıf kanıtlı öneriler."], defaultMinSamplePerVariant: ["A/B testinde varyant başına en az kişi", "Kazanan ilan etmek için gereken en küçük örnek."],
};
const FOLLOWUP_TR: Record<string, string> = { checkout_1: "Ödeme yarıda kaldı — 1. hatırlatma", checkout_2: "Ödeme yarıda kaldı — 2. ve son hatırlatma", offer_1: "VIP teklifinden sonra sustu — 1", offer_2: "VIP teklifinden sonra sustu — 2 (son)", free_1: "Kanala davet edildi, girmedi — 1", free_2: "Kanala davet edildi, girmedi — 2 (son)", engaged_1: "Kanalda ama sessiz — 1", engaged_2: "Kanalda ama sessiz — 2", discovery_1: "En başta sustu" };

function Rules() {
  const { s, draft: r, upd, save, reset, busy, dirty } = useSection("rules");
  if (!r) return <p className="a-help">Yükleniyor…</p>;
  const group = (g: string, title: string, desc: string) => (
    <Card title={title} desc={desc}>
      <div className="a-grid2">
        {Object.keys(s.specs[g]).map((k) => (
          <Field key={k} label={RULE_TR[k]?.[0] ?? k} help={<>{RULE_TR[k]?.[1]} <span>İzin verilen: {s.specs[g][k][0]}–{s.specs[g][k][1]} · ilk ayar: {s.defaults.rules[g][k]}</span></>}>
            <Num value={r[g][k]} min={s.specs[g][k][0]} max={s.specs[g][k][1]} onChange={(v) => upd([g, k], v)} />
          </Field>
        ))}
      </div>
    </Card>
  );
  return (
    <>
      <h1>Kurallar ve Puanlama</h1>
      <p className="a-intro">Yapay zekâ yalnızca ÖNERİR; ne zaman davet edileceğine, ne zaman VIP teklif edileceğine bu kurallar karar verir. Böylece bot kimseyi sıkıştıramaz ve satın almak isteyeni de bekletmez.</p>
      {group("funnel", "Satış hunisi kuralları", "Davet ve teklif zamanlaması.")}
      {group("followups", "Takip mesajı sınırları", "Sessiz kalan kişilere gönderilen hatırlatmalar. Kişi “PARAR” yazarsa hepsi durur.")}
      <Card title="Takip mesajları" desc="Her mesaj kişi başına en fazla bir kez gönderilir. “Hedef” yapay zekâya verilen talimattır (Türkçe/İngilizce olabilir); “Yedek metin” yapay zekâ çalışmazsa AYNEN gönderilir (Portekizce olmalı).">
        {Object.entries(s.followupBuckets).map(([bucket, rules]: Any) => rules.map((fr: Any) => (
          <div key={fr.key} style={{ borderTop: "1px solid #eef2f0", padding: "12px 0" }}>
            <h3 style={{ marginBottom: 8 }}>{FOLLOWUP_TR[fr.key] ?? fr.key} <span className="a-help">({STAGE_TR[bucket] ?? bucket}{fr.keyboard === "plans" ? " · plan butonlarıyla" : fr.keyboard === "free_channel" ? " · kanal butonuyla" : ""})</span></h3>
            <div className="a-grid2">
              <Field label="Kaç saat sessizlikten sonra?"><Num value={r.followupRules[fr.key].afterSilentHours} min={1} max={720} onChange={(v) => upd(["followupRules", fr.key, "afterSilentHours"], v)} /></Field>
              <Field label="Hedef (yapay zekâya talimat)"><Txt rows={3} value={r.followupRules[fr.key].goal} onChange={(v) => upd(["followupRules", fr.key, "goal"], v)} /></Field>
            </div>
            <Field label="Yedek metin (Portekizce)"><Txt rows={2} value={r.followupRules[fr.key].fallback} onChange={(v) => upd(["followupRules", fr.key, "fallback"], v)} /></Field>
          </div>
        )))}
        <p className="a-help">Not: Ücretsiz Vercel planında takip mesajları günde bir kez (Brezilya saatiyle 12:00) gönderilir. Saatlik gönderim için supabase/optional_hourly_cron.sql dosyasını çalıştırın.</p>
      </Card>
      <Card title="İlgi puanı ağırlıkları" desc="Her sinyal kişinin puanına bu kadar “puan” ekler (eksi değerler düşürür). 30 puan = 100/100. Örn: “Fiyat sordu” ağırlığını artırırsanız fiyat soranlar teklif eşiğine daha hızlı ulaşır. 🔒 işaretli sinyalleri yapay zekâ değil sistem doğrular.">
        <div className="a-grid2">
          {s.signals.map((sg: Any) => (
            <div className="a-row" key={sg.key} style={{ justifyContent: "space-between", borderBottom: "1px dashed #e6ebe8", paddingBottom: 6 }}>
              <span style={{ flex: 1 }}>{sg.source === "system" ? "🔒 " : ""}{SIGNAL_TR[sg.key] ?? sg.key} <span className="a-help">(ilk: {s.defaults.rules.weights[sg.key]})</span></span>
              <div style={{ width: 90 }}><Num value={r.weights[sg.key]} min={-20} max={20} onChange={(v) => upd(["weights", sg.key], v)} /></div>
            </div>
          ))}
        </div>
      </Card>
      {group("learning", "Öğrenme ayarları", "Koçun ve A/B testlerinin ne kadar veriyle karar vereceği.")}
      <SaveBar onSave={save} onReset={reset} busy={busy} dirty={dirty} />
    </>
  );
}

/* =====================================================================
 *  6. ÖĞRENME  (öneriler · onay · playbook · A/B testleri)
 * ===================================================================== */
const SLOT_TR: Record<string, string> = { opening: "Açılış mesajı", free_invite: "Ücretsiz kanala davet", engagement: "Kanaldaki sohbet", vip_transition: "VIP'e geçiş cümlesi", objection_handling: "İtiraz yönetimi" };
const METRIC_TR: Record<string, string> = { reply: "Cevap yazma", free_join: "Kanala girme", vip_offer: "VIP teklifine ulaşma", checkout: "Ödeme sayfasını açma", purchase: "Satın alma" };
const COACH_TR: Record<string, string> = { waiting: "bekliyor (yeterli analiz birikmedi)", proposed: "yeni bir öneri hazırladı — aşağıda onayınızı bekliyor", activated: "yeni playbook'u yayına aldı", unchanged: "değişiklik gerekmediğine karar verdi", rejected: "önerisi güvenlik kontrolünden geçemedi", error: "hata verdi" };
const OBJ_KEYS: [string, string][] = [["price", "Fiyat"], ["trust", "Güven"], ["value", "Değer / fark"], ["timing", "Zaman"], ["results", "Sonuç / garanti"], ["other", "Diğer"]];

function diffGuidelines(a: Any[], b: Any[]) {
  const A = new Map(a.map((g) => [g.id, g.text]));
  const B = new Map(b.map((g) => [g.id, g.text]));
  const out: { t: string; text: string; old?: string }[] = [];
  for (const g of b) { if (!A.has(g.id)) out.push({ t: "Eklendi", text: g.text }); else if (A.get(g.id) !== g.text) out.push({ t: "Değişti", text: g.text, old: A.get(g.id) }); }
  for (const g of a) if (!B.has(g.id)) out.push({ t: "Silindi", text: g.text });
  return out;
}

function Learning() {
  const [d, setD] = useState<Any>(null);
  const [pb, setPb] = useState<Any>(null);
  const [summary, setSummary] = useState("");
  const [force, setForce] = useState(false);
  const [exp, setExp] = useState<Any>({ slot: "opening", name: "", hypothesis: "", metric: "reply", variantA: "", variantB: "", start: true });
  const [busy, run] = useBusy();
  const load = useCallback(() => run("load", async () => { const r = await api("learning"); setD(r); setPb(r.active.content); }), [run]);
  useEffect(() => { load(); }, [load]);
  if (!d || !pb) return <p className="a-help">Yükleniyor…</p>;
  const pbDirty = JSON.stringify(pb) !== JSON.stringify(d.active.content);
  return (
    <>
      <h1>Öğrenme</h1>
      <p className="a-intro">Bot kendi kendine satış davranışını DEĞİŞTİRMEZ. Döngü şöyle: konuşma biter → yapay zekâ analiz eder → {d.needed} analiz birikince “koç” yeni bir satış rehberi (playbook) ÖNERİR → siz okuyup onaylarsınız → ancak o zaman yayına girer.</p>

      <Card title="Durum" right={<Btn onClick={() => run("learn", async () => { const r = await api("run_learning", { force }); notify(`Tamamlandı.\nSessiz diye kapatılan: ${r.closedAsSilent}\nAnaliz edilen konuşma: ${r.analyzed}\nKoç: ${COACH_TR[r.coach.status] ?? r.coach.status}`); await load(); })} busy={busy === "learn"}>Öğrenme turunu şimdi çalıştır</Btn>}>
        <p>Koç için biriken analiz: <b>{d.pending} / {d.needed}</b> · Henüz kullanılmamış puanınız: <b>{d.freshReviews}</b> · Yayındaki rehber: <b>v{d.active.version}</b></p>
        <div className="a-bar" style={{ margin: "10px 0" }}><i style={{ width: `${Math.min(100, (d.pending / d.needed) * 100)}%` }} /></div>
        <label className="a-row"><input type="checkbox" style={{ width: 20 }} checked={force} onChange={(e) => setForce(e.target.checked)} /> Yeterli analiz birikmese de koçu şimdi çalıştır (kanıt zayıf olabilir)</label>
        <p className="a-help" style={{ marginTop: 6 }}>Normalde her gün otomatik çalışır. Bu düğme 1–3 dakika sürebilir; sayfayı kapatmayın.</p>
      </Card>

      <Card title={`Onayınızı bekleyen öneriler (${d.proposals.length})`} desc="Koçun önerdiği yeni rehber. Onaylarsanız hemen yayına girer; reddederseniz mevcut rehber kalır.">
        {!d.proposals.length && <p className="a-help">Şu an bekleyen öneri yok.</p>}
        {d.proposals.map((p: Any) => (
          <div key={p.version} style={{ border: "1.5px solid #f1d58a", borderRadius: 12, padding: 14, marginBottom: 12, background: "#fffdf5" }}>
            <h3>Öneri v{p.version} <span className="a-help">· {when(p.created_at)}</span></h3>
            <p style={{ margin: "8px 0" }}>{p.summary}</p>
            {diffGuidelines(d.active.content.guidelines, p.content.guidelines).map((x, i) => (
              <p key={i} style={{ fontSize: 14, marginBottom: 6 }}><Pill tone={x.t === "Eklendi" ? "green" : x.t === "Silindi" ? "red" : "amber"}>{x.t}</Pill> {x.text}{x.old && <span className="a-help"><br />Eskisi: {x.old}</span>}</p>
            ))}
            <div className="a-row" style={{ marginTop: 10 }}>
              <Btn onClick={() => run(`ok${p.version}`, async () => { await api("playbook_decide", { version: p.version, approve: true }); await load(); }, `v${p.version} yayında.`)} busy={busy === `ok${p.version}`}>✓ Onayla ve yayına al</Btn>
              <Btn kind="danger" onClick={() => run(`no${p.version}`, async () => { await api("playbook_decide", { version: p.version, approve: false }); await load(); }, "Reddedildi.")} busy={busy === `no${p.version}`}>✕ Reddet</Btn>
            </div>
          </div>
        ))}
      </Card>

      <Card title={`Yayındaki satış rehberi (v${d.active.version})`} desc="Botun her konuşmada okuduğu, geçmiş konuşmalardan öğrenilmiş tavsiyeler. İsterseniz kendiniz düzenleyin: kaydettiğinizde yeni bir sürüm olarak yayına girer. İngilizce, Türkçe veya Portekizce yazabilirsiniz.">
        {pb.guidelines.map((g: Any, i: number) => (
          <div className="a-listedit" key={g.id}>
            <div style={{ width: 210 }}><select value={g.stage} onChange={(e) => setPb(setIn(pb, ["guidelines", i, "stage"], e.target.value))}>{Object.keys(STAGE_TR).filter((k) => k !== "NEW" || g.stage === "NEW").map((k) => <option key={k} value={k}>{STAGE_TR[k]}</option>)}</select></div>
            <Txt rows={2} value={g.text} onChange={(v) => setPb(setIn(pb, ["guidelines", i, "text"], v))} />
            <Btn small kind="danger" onClick={() => setPb({ ...pb, guidelines: pb.guidelines.filter((_: Any, j: number) => j !== i) })}>Sil</Btn>
          </div>
        ))}
        <Btn small kind="soft" onClick={() => setPb({ ...pb, guidelines: [...pb.guidelines, { id: `m${Date.now() % 1000000}`, stage: "ANY", text: "" }] })}>+ Tavsiye ekle</Btn>
        <h3 style={{ margin: "18px 0 8px" }}>İtirazlara önerilen yaklaşım</h3>
        <div className="a-grid2">{OBJ_KEYS.map(([k, l]) => <Field key={k} label={l}><Txt rows={3} value={pb.objection_responses?.[k] ?? ""} onChange={(v) => setPb(setIn(pb, ["objection_responses", k], v))} /></Field>)}</div>
        <Field label="Kaçınılacak şeyler"><ListEdit items={pb.avoid ?? []} onChange={(v) => setPb({ ...pb, avoid: v })} placeholder="Madde ekle" /></Field>
        {(pb.locked_winners ?? []).length > 0 && <div className="a-info"><b>A/B testiyle kanıtlanmış (kilitli):</b>{pb.locked_winners.map((w: Any) => <div key={w.slot}>• [{SLOT_TR[w.slot] ?? w.slot}] {w.instruction}</div>)}</div>}
        <Field label="Bu sürümde ne değiştirdiniz? (kendinize not)"><Txt value={summary} onChange={setSummary} /></Field>
        <div className="a-row">
          <Btn disabled={!pbDirty} onClick={() => run("pb", async () => { const r = await api("playbook_save", { content: { ...pb, guidelines: pb.guidelines.filter((g: Any) => g.text.trim()), avoid: (pb.avoid ?? []).filter((x: string) => x.trim()) }, summary }); setSummary(""); await load(); notify(`v${r.version} yayında.`); })} busy={busy === "pb"}>Yeni sürüm olarak kaydet ve yayına al</Btn>
          {pbDirty && <Btn kind="soft" onClick={() => setPb(d.active.content)}>Değişiklikleri geri al</Btn>}
        </div>
      </Card>

      <Card title="A/B testleri" desc="İki farklı yaklaşımı gerçek müşterilerde karşılaştırır. Yalnızca YENİ gelenler teste girer (yarı yarıya). Kazanan ilan etmek için hem yeterli kişi hem de istatistiksel anlamlılık (p < 0,05) gerekir; kazanan otomatik olarak rehbere kilitlenir.">
        {d.experiments.map((e: Any) => {
          const r = e.results ?? {};
          return (
            <div key={e.id} style={{ borderTop: "1px solid #eef2f0", padding: "12px 0" }}>
              <div className="a-row" style={{ justifyContent: "space-between" }}>
                <h3>#{e.id} {e.name}</h3>
                <div className="a-row">
                  <Pill tone={e.status === "running" ? "green" : e.status === "won" ? "blue" : e.status === "draft" ? "amber" : undefined}>{({ draft: "Taslak", running: "Çalışıyor", won: `Kazanan: ${e.winner}`, inconclusive: "Fark çıkmadı", stopped: "Durduruldu" } as Any)[e.status]}</Pill>
                  {e.status === "draft" && <Btn small onClick={() => run(`e${e.id}`, async () => { notify((await api("experiment_status", { id: e.id, status: "running" })).message); await load(); })}>Başlat</Btn>}
                  {e.status === "running" && <Btn small kind="danger" onClick={() => run(`e${e.id}`, async () => { await api("experiment_status", { id: e.id, status: "stopped" }); await load(); }, "Durduruldu.")}>Durdur</Btn>}
                </div>
              </div>
              <p className="a-help">{SLOT_TR[e.slot] ?? e.slot} · ölçüt: {METRIC_TR[e.metric] ?? e.metric} · varyant başına en az {e.min_sample} kişi</p>
              {e.variants.map((v: Any) => <p key={v.key} style={{ fontSize: 14, marginTop: 4 }}><b>{v.key}:</b> {v.instruction} {r[v.key] && <Pill>{r[v.key].s}/{r[v.key].n} · {pct(r[v.key].s, r[v.key].n)}</Pill>}</p>)}
              {typeof r.pValue === "number" && <p className="a-help">p = {r.pValue.toFixed(3)} {r.pValue < 0.05 ? "(anlamlı fark)" : "(henüz anlamlı fark yok)"}</p>}
            </div>
          );
        })}
        <h3 style={{ margin: "16px 0 8px" }}>Yeni test oluştur</h3>
        <div className="a-grid3">
          <Field label="Botun hangi anı?"><select value={exp.slot} onChange={(e) => setExp({ ...exp, slot: e.target.value })}>{Object.entries(SLOT_TR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Başarı ölçütü"><select value={exp.metric} onChange={(e) => setExp({ ...exp, metric: e.target.value })}>{Object.entries(METRIC_TR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Test adı"><Txt value={exp.name} onChange={(v) => setExp({ ...exp, name: v })} /></Field>
        </div>
        <div className="a-grid2">
          <Field label="A varyantı (bota talimat)"><Txt rows={3} value={exp.variantA} onChange={(v) => setExp({ ...exp, variantA: v })} /></Field>
          <Field label="B varyantı (bota talimat)"><Txt rows={3} value={exp.variantB} onChange={(v) => setExp({ ...exp, variantB: v })} /></Field>
        </div>
        <Field label="Varsayımınız (neden B daha iyi olabilir?)"><Txt value={exp.hypothesis} onChange={(v) => setExp({ ...exp, hypothesis: v })} /></Field>
        <div className="a-row">
          <label className="a-row"><input type="checkbox" style={{ width: 20 }} checked={exp.start} onChange={(e) => setExp({ ...exp, start: e.target.checked })} /> Hemen başlat (aynı anda o “an” için başka test çalışıyorsa taslak kalır)</label>
          <Btn onClick={() => run("exp", async () => { await api("experiment_create", exp); setExp({ ...exp, name: "", hypothesis: "", variantA: "", variantB: "" }); await load(); }, "Test oluşturuldu.")} busy={busy === "exp"} disabled={exp.variantA.trim().length < 10 || exp.variantB.trim().length < 10 || !exp.name.trim()}>Testi oluştur</Btn>
        </div>
      </Card>

      <Card title="Koçun geçmiş turları">
        {d.batches.map((b: Any) => (
          <div key={b.id} style={{ borderTop: "1px solid #eef2f0", padding: "10px 0" }}>
            <p><b>Tur #{b.id}</b> <span className="a-help">· {when(b.created_at)} · {b.sample_size} konuşma, {b.won_count} satış · en büyük kayıp: {b.biggest_leak ?? "–"}</span> <Pill>{({ proposed: "Öneri hazırlandı", active: "Yayına alındı", unchanged: "Değişiklik yok", rejected: "Reddedildi (güvenlik)" } as Any)[b.result] ?? b.result}</Pill></p>
            <p style={{ fontSize: 14, marginTop: 4 }}>{b.summary}</p>
            {(b.problems ?? []).length > 0 && <p className="a-help">Sorunlar: {b.problems.join(" · ")}</p>}
          </div>
        ))}
        {!d.batches.length && <p className="a-help">Koç henüz hiç çalışmadı. {d.needed} konuşma analiz edilince ilk öneri gelir.</p>}
      </Card>

      <Card title="Son analiz edilen konuşmalar" desc="Kalite puanı 0–100 (yapay zekânın değerlendirmesi). Kendi puanınızı “Konuşmalar” sekmesinden verebilirsiniz.">
        <div className="a-scroll">
          <table className="a-table">
            <thead><tr><th>Kişi</th><th>Sonuç</th><th>Kalite</th><th>Özet ve botun hataları</th></tr></thead>
            <tbody>
              {d.analyses.map((a: Any) => (
                <tr key={a.lead_id}><td>{a.leads?.first_name ?? "?"}<br /><span className="a-help">{when(a.created_at)}</span></td>
                  <td>{a.outcome === "won" ? <Pill tone="green">Satış</Pill> : <Pill tone="red">{a.loss_reason ?? "Kayıp"}</Pill>}<br /><span className="a-help">{STAGE_TR[a.drop_stage] ?? a.drop_stage}</span></td>
                  <td><b>{a.conversation_quality ?? "–"}</b></td><td style={{ fontSize: 13.5 }}>{a.summary}{(a.agent_mistakes ?? []).length > 0 && <><br /><span style={{ color: "#a3241d" }}>Hata: {a.agent_mistakes.join(" · ")}</span></>}</td></tr>
              ))}
              {!d.analyses.length && <tr><td colSpan={4} className="a-help">Henüz analiz yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* =====================================================================
 *  7. ÖDEMELER
 * ===================================================================== */
function Payments() {
  const [d, setD] = useState<Any>(null);
  const [ids, setIds] = useState<Record<string, string>>({});
  const [busy, run] = useBusy();
  const load = useCallback(() => run("load", async () => setD(await api("payments"))), [run]);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <h1>Ödemeler</h1>
      <p className="a-intro">Whop'tan gelen bütün ödemeler. “Bağlanmamış” bir ödeme, hangi Telegram kullanıcısına ait olduğu bulunamayan ödemedir: müşterinin Telegram ID'sini yazıp bağlarsanız VIP erişimi otomatik gönderilir ve satış sayılır.</p>
      <Card>
        <div className="a-scroll">
          <table className="a-table">
            <thead><tr><th>Tarih</th><th>Kişi</th><th>Plan</th><th>Tutar</th><th>Durum</th><th>E-posta</th></tr></thead>
            <tbody>
              {(d?.payments ?? []).map((p: Any) => (
                <tr key={p.whop_payment_id}>
                  <td>{when(p.created_at)}</td>
                  <td>{p.lead_id ? <>{p.leads?.first_name ?? "?"} {p.leads?.username ? `@${p.leads.username}` : ""}{p.matched_by === "recent_checkout" && <><br /><Pill tone="amber">tahmini eşleşme — kontrol edin</Pill></>}</> : (
                    <div className="a-row"><Pill tone="red">Bağlanmamış</Pill><div style={{ width: 150 }}><input placeholder="Telegram ID" value={ids[p.whop_payment_id] ?? ""} onChange={(e) => setIds({ ...ids, [p.whop_payment_id]: e.target.value })} /></div>
                      <Btn small onClick={() => run(p.whop_payment_id, async () => { notify((await api("payment_link", { payment_id: p.whop_payment_id, telegram_id: ids[p.whop_payment_id] })).message); await load(); })} busy={busy === p.whop_payment_id}>Bağla</Btn></div>
                  )}</td>
                  <td>{PLAN_TR[p.plan_key] ?? p.plan_key ?? "–"}</td><td>{money(p.amount)}</td>
                  <td>{p.status === "refunded" ? <Pill tone="red">İade edildi</Pill> : p.is_first ? <Pill tone="green">Yeni satış</Pill> : <Pill tone="blue">Yenileme</Pill>}</td><td className="a-help">{p.email ?? ""}</td>
                </tr>
              ))}
              {d && !d.payments.length && <tr><td colSpan={6} className="a-help">Henüz ödeme yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* =====================================================================
 *  8. SİSTEM
 * ===================================================================== */
function System() {
  const [d, setD] = useState<Any>(null);
  const [busy, run] = useBusy();
  const load = useCallback(() => run("load", async () => setD(await api("system"))), [run]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <p className="a-help">Yükleniyor…</p>;
  const ok = (v: boolean, yes: string, no: string) => <p style={{ marginBottom: 6 }}>{v ? "✅" : "⚠️"} {v ? yes : no}</p>;
  return (
    <>
      <h1>Sistem</h1>
      <p className="a-intro">Bağlantıların sağlık durumu ve elle çalıştırabileceğiniz işlemler. Şifreler ve API anahtarları güvenlik nedeniyle panelde gösterilmez; onları Vercel → Settings → Environment Variables bölümünden değiştirirsiniz.</p>
      <Card title="Sağlık kontrolü" right={<Btn small kind="soft" onClick={load}>Yenile</Btn>}>
        {ok(!d.envProblems.length, "Bütün zorunlu ayarlar (environment variables) doğru.", `Hatalı / eksik ayarlar: ${d.envProblems.join(" | ")}`)}
        {ok(d.webhook?.url === `${d.appUrl}/api/telegram/webhook` && !d.webhook?.last_error_message, "Telegram bağlantısı çalışıyor.", `Telegram bağlantısında sorun: ${d.webhook?.last_error_message ?? d.webhook?.error ?? "webhook adresi farklı"} — aşağıdaki düğmeyle yeniden kurun.`)}
        {ok(d.flags.whopApiKey, "Whop API anahtarı var: her ödeme doğru kişiye otomatik bağlanır.", "Whop API anahtarı yok: ödemeler tahmini eşleştirilir.")}
        {ok(d.flags.vipChannelId, "VIP kanalı bağlı: tek kullanımlık davet + abonelik bitince otomatik çıkarma.", "TELEGRAM_VIP_CHANNEL_ID yok.")}
        {ok(d.flags.meta, d.flags.metaTestMode ? "Meta bağlı — DİKKAT: test modu açık (META_TEST_EVENT_CODE). Gerçek reklamdan önce silin." : "Meta Pixel + Conversions API bağlı.", "Meta bağlı değil: reklamlar satışları göremez.")}
        {d.lastMetaError && <p style={{ marginBottom: 6 }}>⚠️ Meta son olayı reddetti ({d.lastMetaError.event} · {when(d.lastMetaError.at)}): <span className="a-help">{d.lastMetaError.detail}</span></p>}
        {d.flags.meta && <p className="a-help" style={{ marginBottom: 6 }}>Meta'ya giden olaylar: Contact (sitede butona basıldı) → Lead (botu başlattı) → CompleteRegistration (ücretsiz kanala girdi, doğrulandı) → InitiateCheckout (ödeme sayfası) → Purchase (ödeme onaylandı, tutar ile).</p>}
        {ok(d.flags.adminChat, "Telegram yönetici bildirimleri açık.", "TELEGRAM_ADMIN_CHAT_ID yok: satış bildirimi alamazsınız.")}
        {ok(d.flags.support, "Destek kişisi tanımlı.", "SUPPORT_USERNAME yok.")}
        {ok(d.flags.ownPassword, "Panel için ayrı şifre (ADMIN_PASSWORD) tanımlı.", "Panel şu an SETUP_SECRET ile açılıyor. Vercel'e ADMIN_PASSWORD ekleyip yeniden yayınlarsanız ayrı bir şifreniz olur.")}
        {ok(!d.flags.autoApprove, "Öneriler sizin onayınızı bekliyor (önerilen ayar).", "DİKKAT: PLAYBOOK_AUTO_APPROVE=true — koçun önerileri onaysız yayına giriyor.")}
        <p className="a-help">Yapay zekâ modeli: {d.model} · Adres: {d.appUrl} · Bekleyen Telegram mesajı: {d.webhook?.pending_update_count ?? "?"}</p>
      </Card>
      <Card title="Elle çalıştır">
        <div className="a-row">
          <Btn kind="ghost" onClick={() => run("hook", async () => { await api("register_webhook"); await load(); }, "Telegram bağlantısı yeniden kuruldu.")} busy={busy === "hook"}>Telegram bağlantısını yeniden kur</Btn>
          <Btn kind="ghost" onClick={() => window.confirm("Zamanı gelmiş takip mesajları ŞİMDİ gönderilsin mi? (Brezilya'da gece olabilir.)") && run("fu", async () => { const r = await api("run_followups"); notify(`Gönderilen: ${r.sent} · engellenmiş: ${r.blocked} · hata: ${r.errors}`); })} busy={busy === "fu"}>Takip mesajlarını şimdi gönder</Btn>
        </div>
      </Card>
      <div className="a-grid2">
        <Card title="Başarısız Whop bildirimleri" desc="Whop bunları otomatik tekrar dener.">
          {d.failedWhop.map((w: Any) => <p key={w.id} style={{ fontSize: 13.5, marginBottom: 6 }}><b>{w.type}</b> · {when(w.created_at)}<br /><span className="a-help">{w.error}</span></p>)}
          {!d.failedWhop.length && <p className="a-help">Yok 👍</p>}
        </Card>
        <Card title="Başarısız Telegram mesajları">
          {d.failedTelegram.map((t: Any) => <p key={t.update_id} style={{ fontSize: 13.5, marginBottom: 6 }}>#{t.update_id} · {when(t.created_at)} · {t.attempts} deneme<br /><span className="a-help">{t.error}</span></p>)}
          {!d.failedTelegram.length && <p className="a-help">Yok 👍</p>}
        </Card>
      </div>
    </>
  );
}

/* =====================================================================
 *  Kabuk: giriş + menü
 * ===================================================================== */
const TABS: [string, string][] = [["ozet", "📊 Genel Bakış"], ["konusmalar", "💬 Konuşmalar"], ["isletme", "🏷️ İşletme Bilgileri"], ["asistan", "🤖 Satış Asistanı"], ["kurallar", "⚖️ Kurallar ve Puanlama"], ["ogrenme", "🧠 Öğrenme"], ["odemeler", "💳 Ödemeler"], ["sistem", "🛠️ Sistem"]];

export default function AdminPage() {
  const [auth, setAuth] = useState<"checking" | "in" | "out">("checking");
  const [tab, setTab] = useState("ozet");
  const [pw, setPw] = useState("");
  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null);
  const [busy, run] = useBusy();

  useEffect(() => {
    document.title = "PALPITE10 · Yönetim Paneli";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => { const det = (e as CustomEvent).detail; setToast(det); clearTimeout(timer); timer = setTimeout(() => setToast(null), det.bad ? 9000 : 4500); };
    const onAuth = () => setAuth("out");
    window.addEventListener("adm-toast", onToast);
    window.addEventListener("adm-auth", onAuth);
    api("ping").then(() => setAuth("in"), () => setAuth("out"));
    return () => { window.removeEventListener("adm-toast", onToast); window.removeEventListener("adm-auth", onAuth); meta.remove(); };
  }, []);

  const login = () => run("login", async () => { await api("login", { password: pw }); setPw(""); setAuth("in"); });

  return (
    <div className="adm">
      <style>{CSS}</style>
      {auth === "checking" && <div className="a-login"><p className="a-help">Yükleniyor…</p></div>}
      {auth === "out" && (
        <div className="a-login">
          <div className="a-card">
            <h1 style={{ marginBottom: 6 }}>PALPITE<b style={{ color: "#0b7a3b" }}>10</b> · Yönetim Paneli</h1>
            <p className="a-help" style={{ marginBottom: 14 }}>Şifreniz: Vercel'deki ADMIN_PASSWORD değeri. Tanımlamadıysanız SETUP_SECRET değeriniz.</p>
            <Field label="Şifre"><input type="password" value={pw} autoFocus onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} /></Field>
            <Btn onClick={login} busy={busy === "login"}>Giriş yap</Btn>
          </div>
        </div>
      )}
      {auth === "in" && (
        <>
          <div className="a-top">
            <h1>PALPITE<b>10</b> · Yönetim Paneli</h1>
            <Btn small kind="soft" onClick={() => api("logout").finally(() => setAuth("out"))}>Çıkış</Btn>
          </div>
          <div className="a-shell">
            <nav className="a-nav">{TABS.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</nav>
            <main className="a-main">
              {tab === "ozet" && <Overview go={setTab} />}
              {tab === "konusmalar" && <Conversations />}
              {tab === "isletme" && <Business />}
              {tab === "asistan" && <Assistant />}
              {tab === "kurallar" && <Rules />}
              {tab === "ogrenme" && <Learning />}
              {tab === "odemeler" && <Payments />}
              {tab === "sistem" && <System />}
            </main>
          </div>
        </>
      )}
      {toast && <div className={`a-toast ${toast.bad ? "bad" : ""}`} onClick={() => setToast(null)}>{toast.text}</div>}
    </div>
  );
}
