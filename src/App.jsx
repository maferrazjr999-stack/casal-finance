import { useState, useEffect, useCallback, useMemo } from "react";
import { subscribeState, saveState } from "./firebase";

// ─── Local Storage ────────────────────────────────────────────────────────────
const STORAGE_KEY = "casal_finance_v1";
const loadLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveLocal = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

const CATEGORIES = [
  { id: "moradia", label: "Moradia", emoji: "🏠" },
  { id: "mercado", label: "Mercado", emoji: "🛒" },
  { id: "transporte", label: "Transporte", emoji: "🚗" },
  { id: "saude", label: "Saúde", emoji: "💊" },
  { id: "lazer", label: "Lazer", emoji: "🎉" },
  { id: "viagem", label: "Viagem", emoji: "✈️" },
  { id: "restaurante", label: "Restaurante", emoji: "🍽️" },
  { id: "assinaturas", label: "Assinaturas", emoji: "📱" },
  { id: "educacao", label: "Educação", emoji: "📚" },
  { id: "outros", label: "Outros", emoji: "📦" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const PALETTE = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#C77DFF",
  "#FF9A3C", "#00C9A7", "#FF6FC8", "#45B7D1", "#98C1D9"
];

const DEFAULT_STATE = {
  users: [
    { id: "A", name: "Pessoa 1", avatar: "👤", color: "#FF6B6B" },
    { id: "B", name: "Pessoa 2", avatar: "👥", color: "#4D96FF" },
  ],
  transactions: [],
  onboarded: false,
};

// ─── Icon Components ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d={d} />
  </svg>
);

const Icons = {
  Plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Home: (p) => <Icon {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />,
  List: (p) => <Icon {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  Chart: (p) => <Icon {...p} d="M18 20V10M12 20V4M6 20v-6" />,
  Settings: (p) => <Icon {...p} d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 012.83-2.83l-.06-.06A1.65 1.65 0 0021 10.6V9.4a1.65 1.65 0 00-1.18-1.58l-.06-.06a2 2 0 00-2.83 2.83l.06.06A1.65 1.65 0 0015 12H9a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 00-2.83-2.83l.06.06A1.65 1.65 0 004.6 9.4v1.2A1.65 1.65 0 006.18 12.18l.06.06a2 2 0 002.83-2.83l-.06-.06A1.65 1.65 0 009 8V7" />,
  X: (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />,
  Check: (p) => <Icon {...p} d="M20 6L9 17l-5-5" />,
  ArrowRight: (p) => <Icon {...p} d="M5 12h14M12 5l7 7-7 7" />,
  Transfer: (p) => <Icon {...p} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />,
  Trash: (p) => <Icon {...p} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  Sun: (p) => <Icon {...p} d="M12 17a5 5 0 100-10 5 5 0 000 10z M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />,
  Moon: (p) => <Icon {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
  Download: (p) => <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  Edit: (p) => <Icon {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
};

// ─── Mini Donut Chart ─────────────────────────────────────────────────────────
function DonutChart({ data, size = 160 }) {
  if (!data.length) return <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", fontSize: 13 }}>Sem dados</div>;
  const r = 55, cx = size / 2, cy = size / 2, stroke = 22;
  const total = data.reduce((s, d) => s + d.value, 0);
  let angle = -90;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const deg = pct * 360;
    const start = angle;
    angle += deg;
    const startR = (start * Math.PI) / 180;
    const endR = ((start + deg) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startR), y1 = cy + r * Math.sin(startR);
    const x2 = cx + r * Math.cos(endR), y2 = cy + r * Math.sin(endR);
    const large = deg > 180 ? 1 : 0;
    return { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: PALETTE[i % PALETTE.length], pct, label: d.label, value: d.value };
  });
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="butt" style={{ transition: "opacity .2s" }} />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="var(--card-bg)" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="var(--fg-muted)" fontFamily="inherit">Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--fg)" fontFamily="inherit">
        {fmt(data.reduce((s, d) => s + d.value, 0))}
      </text>
    </svg>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ userA, userB, users }) {
  const maxVal = Math.max(...userA.concat(userB).map(v => v || 0), 1);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80, padding: "0 4px" }}>
      {months.slice(0, 6).map((m, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
            <div style={{ flex: 1, background: users[0].color, borderRadius: "3px 3px 0 0", height: `${((userA[i] || 0) / maxVal) * 100}%`, transition: "height .4s", opacity: 0.9 }} />
            <div style={{ flex: 1, background: users[1].color, borderRadius: "3px 3px 0 0", height: `${((userB[i] || 0) / maxVal) * 100}%`, transition: "height .4s", opacity: 0.9 }} />
          </div>
          <span style={{ fontSize: 9, color: "var(--fg-muted)", fontWeight: 600 }}>{m}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(() => loadLocal() || DEFAULT_STATE);
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [filterMonth, setFilterMonth] = useState(thisMonth());
  const [filterCat, setFilterCat] = useState("all");
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ value: "", desc: "", date: today(), paidBy: "A", type: "shared", category: "outros" });
  const [transferForm, setTransferForm] = useState({ from: "A", to: "B", value: "", date: today(), desc: "" });
  const [editNames, setEditNames] = useState(false);
  const [nameA, setNameA] = useState(state.users[0].name);
  const [nameB, setNameB] = useState(state.users[1].name);
  const [loading, setLoading] = useState(true);

  // ── Firebase sync (non-blocking) ──────────────────────────────────────────
  useEffect(() => {
    // Start with local data immediately
    const localData = loadLocal();
    if (localData) {
      setState(localData);
      setNameA(localData.users[0].name);
      setNameB(localData.users[1].name);
    }

    // Firebase sync in background - don't block UI
    const unsub = subscribeState((firebaseState) => {
      if (firebaseState && firebaseState.transactions !== undefined) {
        const merged = {
          users: firebaseState.users || DEFAULT_STATE.users,
          transactions: firebaseState.transactions || [],
          onboarded: firebaseState.onboarded ?? false,
        };
        setState(merged);
        saveLocal(merged);
        setNameA(merged.users[0].name);
        setNameB(merged.users[1].name);
      }
      setLoading(false);
    });

    // Fallback: if Firebase doesn't respond in 3s, show local data
    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  const update = useCallback((fn) => {
    setState(prev => {
      const next = fn(prev);
      saveLocal(next);
      saveState(next);
      return next;
    });
  }, []);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Computed balance ─────────────────────────────────────────────────────
  const balance = useMemo(() => {
    let balA = 0;
    // balA positivo = B deve para A
    // balA negativo = A deve para B
    state.transactions.forEach(t => {
      if (t.type === "transfer") {
        // Quem transfere está pagando sua dívida:
        // B transfere para A → B está pagando → balA diminui (B deve menos)
        // A transfere para B → A está pagando → balA aumenta (A deve menos)
        if (t.from === "B") balA -= t.value;
        else balA += t.value;
      } else if (t.type === "shared") {
        const half = t.value / 2;
        if (t.paidBy === "A") balA += half; // A pagou mais → B deve para A
        else balA -= half;                   // B pagou mais → A deve para B
      }
    });
    return balA;
  }, [state.transactions]);

  // ── Monthly stats ────────────────────────────────────────────────────────
  const monthlyTx = useMemo(() =>
    state.transactions.filter(t => t.date.startsWith(filterMonth)),
    [state.transactions, filterMonth]
  );

  const filteredTx = useMemo(() => {
    let txs = monthlyTx;
    if (filterCat !== "all") txs = txs.filter(t => t.category === filterCat);
    return [...txs].reverse();
  }, [monthlyTx, filterCat]);

  const totalMonth = useMemo(() =>
    monthlyTx.filter(t => t.type !== "transfer").reduce((s, t) => s + t.value, 0),
    [monthlyTx]
  );

  const catData = useMemo(() => {
    const map = {};
    monthlyTx.filter(t => t.type !== "transfer").forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.value;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([id, value]) => ({ label: CAT_MAP[id]?.label || id, value }));
  }, [monthlyTx]);

  const spentByUser = useMemo(() => {
    const a = monthlyTx.filter(t => t.paidBy === "A" && t.type !== "transfer").reduce((s, t) => s + t.value, 0);
    const b = monthlyTx.filter(t => t.paidBy === "B" && t.type !== "transfer").reduce((s, t) => s + t.value, 0);
    return { a, b };
  }, [monthlyTx]);

  const last6Months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return d.toISOString().slice(0, 7);
    });
  }, []);

  const barDataA = useMemo(() => last6Months.map(m =>
    state.transactions.filter(t => t.date.startsWith(m) && t.paidBy === "A" && t.type !== "transfer").reduce((s, t) => s + t.value, 0)
  ), [state.transactions, last6Months]);

  const barDataB = useMemo(() => last6Months.map(m =>
    state.transactions.filter(t => t.date.startsWith(m) && t.paidBy === "B" && t.type !== "transfer").reduce((s, t) => s + t.value, 0)
  ), [state.transactions, last6Months]);

  const userA = state.users[0], userB = state.users[1];

  // ── Actions ──────────────────────────────────────────────────────────────
  const addExpense = () => {
    const val = parseFloat(form.value.replace(",", "."));
    if (!val || val <= 0 || !form.desc.trim()) { showToast("Preencha todos os campos", false); return; }
    const tx = { id: Date.now(), ...form, value: val, date: form.date };
    update(s => ({ ...s, transactions: [...s.transactions, tx] }));
    setForm({ value: "", desc: "", date: today(), paidBy: "A", type: "shared", category: "outros" });
    setModal(null);
    showToast("Despesa adicionada! ✓");
  };

  const addTransfer = () => {
    const val = parseFloat(transferForm.value.replace(",", "."));
    if (!val || val <= 0) { showToast("Valor inválido", false); return; }
    const tx = { id: Date.now(), type: "transfer", ...transferForm, value: val, paidBy: transferForm.from, desc: transferForm.desc || "Acerto" };
    update(s => ({ ...s, transactions: [...s.transactions, tx] }));
    setTransferForm({ from: "A", to: "B", value: "", date: today(), desc: "" });
    setModal(null);
    showToast("Transferência registrada! ✓");
  };

  const deleteTx = (id) => {
    update(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }));
    showToast("Removido");
  };

  const saveNames = () => {
    const newUsers = [{ ...state.users[0], name: nameA }, { ...state.users[1], name: nameB }];
    update(s => ({ ...s, users: newUsers, onboarded: true }));
    setEditNames(false);
    if (!state.onboarded) setModal(null);
    showToast("Nomes salvos!");
  };

  const exportCSV = () => {
    const header = "Data,Descrição,Valor,Pago por,Tipo,Categoria\n";
    const rows = state.transactions.map(t =>
      `${t.date},"${t.desc}",${t.value},${state.users.find(u => u.id === t.paidBy)?.name},${t.type},${t.category}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casal-finance-${filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado!");
  };

  const styles = {
    root: { minHeight: "100vh", fontFamily: "'DM Sans', 'Nunito', system-ui, sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" },
    light: { "--bg": "#F7F8FC", "--card-bg": "#FFFFFF", "--fg": "#111827", "--fg-muted": "#6B7280", "--border": "#E5E7EB", "--accent": "#4D96FF", "--accent-bg": "#EFF6FF" },
    dark: { "--bg": "#0F1117", "--card-bg": "#1A1D27", "--fg": "#F3F4F6", "--fg-muted": "#9CA3AF", "--border": "#2D3148", "--accent": "#60A5FA", "--accent-bg": "#1E2A42" },
    onboard: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 },
    header: { position: "sticky", top: 0, zIndex: 100, background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    main: { background: "var(--bg)", minHeight: "calc(100vh - 120px)", paddingBottom: 100 },
    page: { display: "flex", flexDirection: "column", gap: 14, padding: "16px 16px 24px" },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "var(--bg)", borderTop: "1px solid var(--border)", display: "flex", zIndex: 100 },
    navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", transition: "color .2s" },
    navBtnActive: { color: "var(--accent)" },
    fab: { width: 56, height: 56, borderRadius: "50%", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 28px rgba(77,150,255,.5)" },
    card: { background: "var(--card-bg)", borderRadius: 18, padding: "18px 16px", border: "1px solid var(--border)" },
    cardTitle: { fontWeight: 800, fontSize: 14, color: "var(--fg)", marginBottom: 14, letterSpacing: "-0.3px" },
    input: { width: "100%", background: "var(--card-bg)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "11px 14px", fontSize: 15, color: "var(--fg)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
    inputGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.5px" },
    btn: { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--fg)", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
    chip: { padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "var(--bg)", border: "1.5px solid var(--border)", color: "var(--fg-muted)", fontFamily: "inherit" },
    chipActive: { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" },
    toggleBtn: { padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--bg)", border: "1.5px solid var(--border)", color: "var(--fg-muted)", fontFamily: "inherit" },
    toggleBtnActive: { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" },
    divider: { height: 1, background: "var(--border)", margin: "2px 0" },
  };

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); }
    input[type=date]::-webkit-calendar-picker-indicator,
    input[type=month]::-webkit-calendar-picker-indicator { filter: invert(50%); cursor: pointer; }
    select option { background: #1A1D27; color: #F3F4F6; }
    @keyframes pulse { 0%,100% { box-shadow: 0 6px 28px rgba(77,150,255,.5); } 50% { box-shadow: 0 6px 36px rgba(77,150,255,.85); } }
    .fab-pulse { animation: pulse 2.5s ease-in-out infinite; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
  `;

  const theme = dark ? styles.dark : styles.light;

  if (loading) {
    return (
      <div style={{ ...styles.root, ...theme, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>Sincronizando...</p>
        </div>
      </div>
    );
  }

  if (!state.onboarded) {
    return (
      <div style={{ ...styles.onboard, ...theme }}>
        <style>{css}</style>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: "var(--fg)", letterSpacing: "-1px", marginBottom: 4 }}>CasalFinance</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 15, marginBottom: 32, textAlign: "center" }}>Controle suas finanças em dupla</p>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: userA.color + "22", border: `2px solid ${userA.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{userA.avatar}</div>
            <input style={styles.input} placeholder="Nome da pessoa 1" value={nameA} onChange={e => setNameA(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: userB.color + "22", border: `2px solid ${userB.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{userB.avatar}</div>
            <input style={styles.input} placeholder="Nome da pessoa 2" value={nameB} onChange={e => setNameB(e.target.value)} />
          </div>
          <button onClick={saveNames} style={styles.btn}><Icons.Check size={18} /> Começar</button>
        </div>
      </div>
    );
  }

  const debtColor = balance >= 0 ? "#6BCB77" : "#FF6B6B";
  const debtStr = balance >= 0 ? `${userB.name} deve` : `${userA.name} deve`;
  const absBalance = Math.abs(balance);

  return (
    <div style={{ ...styles.root, ...theme }}>
      <style>{css}</style>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>💰</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: "var(--fg)", letterSpacing: "-0.5px" }}>CasalFinance</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setDark(d => !d)} style={{ ...styles.iconBtn, padding: 8 }}>
            {dark ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
          </button>
          <button onClick={() => setModal("settings")} style={styles.iconBtn}>
            <Icons.Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── MAIN ───────────────────────────────────────────────── */}
      <div style={styles.main}>

        {/* ── HOME ─────────────────────────────────────────────── */}
        {tab === "home" && (
          <div style={styles.page}>
            {/* Balance */}
            <div style={{ ...styles.card, textAlign: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Saldo entre vocês</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: debtColor }}>{debtStr}</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: debtColor, letterSpacing: "-1px" }}>{fmt(absBalance)}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
                {state.users.map(u => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: u.color }} />
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{u.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly total */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {state.users.map((u, i) => {
                const spent = i === 0 ? spentByUser.a : spentByUser.b;
                return (
                  <div key={i} style={styles.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: u.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{u.avatar}</div>
                      <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 600 }}>{u.name}</span>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.5px" }}>{fmt(spent)}</p>
                    <p style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>gasto este mês</p>
                  </div>
                );
              })}
            </div>

            {/* Category chart */}
            {catData.length > 0 && (
              <div style={styles.card}>
                <p style={styles.cardTitle}>Por categoria</p>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <DonutChart data={catData} size={140} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    {catData.slice(0, 5).map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE[i], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--fg-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)" }}>{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Last 5 transactions */}
            <div style={styles.card}>
              <p style={styles.cardTitle}>Últimas despesas</p>
              {state.transactions.length === 0 ? (
                <p style={{ color: "var(--fg-muted)", fontSize: 14, textAlign: "center", padding: "16px 0" }}>Nenhuma despesa ainda 😊</p>
              ) : (
                [...state.transactions].reverse().slice(0, 5).map(t => <TxRow key={t.id} t={t} users={state.users} onDelete={deleteTx} />)
              )}
              {state.transactions.length > 5 && (
                <button onClick={() => setTab("history")} style={{ ...styles.btn, marginTop: 8, background: "transparent", color: "var(--accent)", border: "1.5px solid var(--accent)", padding: "10px" }}>
                  Ver tudo
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY ──────────────────────────────────────────── */}
        {tab === "history" && (
          <div style={styles.page}>
            <p style={{ fontWeight: 900, fontSize: 20, color: "var(--fg)", letterSpacing: "-0.5px" }}>Histórico</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                style={{ ...styles.input, flex: 1, fontSize: 13, padding: "8px 10px" }} />
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                style={{ ...styles.input, fontSize: 13, padding: "8px 10px" }}>
                <option value="all">Todas categorias</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                <option value="transfer">Transferências</option>
              </select>
            </div>
            {filteredTx.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-muted)" }}>Nenhuma transação encontrada</div>
            ) : (
              <div style={styles.card}>
                {filteredTx.map((t, i) => (
                  <div key={t.id}>
                    {i > 0 && <div style={styles.divider} />}
                    <TxRow t={t} users={state.users} onDelete={deleteTx} />
                  </div>
                ))}
              </div>
            )}
            <button onClick={exportCSV} style={{ ...styles.btn, background: "transparent", color: "var(--fg-muted)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <Icons.Download size={16} /> Exportar CSV
            </button>
          </div>
        )}

        {/* ── STATS ────────────────────────────────────────────── */}
        {tab === "stats" && (
          <div style={styles.page}>
            <p style={{ fontWeight: 900, fontSize: 20, color: "var(--fg)", letterSpacing: "-0.5px" }}>Estatísticas</p>

            <div style={styles.card}>
              <p style={styles.cardTitle}>Gastos por mês (últimos 6)</p>
              <BarChart userA={barDataA} userB={barDataB} users={state.users} />
              <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                {state.users.map(u => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: u.color }} />
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{u.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <p style={styles.cardTitle}>Categorias este mês</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <DonutChart data={catData} size={180} />
              </div>
              {catData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: PALETTE[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "var(--fg)", flex: 1 }}>{d.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{fmt(d.value)}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-muted)", minWidth: 40, textAlign: "right" }}>
                    {((d.value / totalMonth) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              {catData.length === 0 && <p style={{ color: "var(--fg-muted)", textAlign: "center", fontSize: 14 }}>Nenhum dado ainda</p>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[userA, userB].map((u, i) => {
                const spent = i === 0 ? spentByUser.a : spentByUser.b;
                return (
                  <div key={i} style={{ ...styles.card, textAlign: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, margin: "0 auto 8px" }}>{u.avatar}</div>
                    <p style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 4 }}>{u.name}</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.5px" }}>{fmt(spent)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ─────────────────────────────────────────── */}
      <nav style={styles.nav}>
        <button onClick={() => setTab("home")} style={{ ...styles.navBtn, ...(tab === "home" ? styles.navBtnActive : {}) }}>
          <Icons.Home size={22} />
          <span style={{ fontSize: 10, marginTop: 2 }}>Início</span>
        </button>
        <button onClick={() => setTab("history")} style={{ ...styles.navBtn, ...(tab === "history" ? styles.navBtnActive : {}) }}>
          <Icons.List size={22} />
          <span style={{ fontSize: 10, marginTop: 2 }}>Histórico</span>
        </button>
        <button onClick={() => setTab("stats")} style={{ ...styles.navBtn, ...(tab === "stats" ? styles.navBtnActive : {}) }}>
          <Icons.Chart size={22} />
          <span style={{ fontSize: 10, marginTop: 2 }}>Estatísticas</span>
        </button>
        <button onClick={() => setModal("settings")} style={{ ...styles.navBtn, ...(tab === "settings" ? styles.navBtnActive : {}) }}>
          <Icons.Settings size={22} />
          <span style={{ fontSize: 10, marginTop: 2 }}>Ajustes</span>
        </button>
      </nav>

      {/* ── FAB ────────────────────────────────────────────────── */}
      <button className="fab-pulse" onClick={() => setModal("expense")} style={{ ...styles.fab, position: "fixed", bottom: 90, right: 20 }}>
        <Icons.Plus size={24} />
      </button>

      {/* ── EXPENSE MODAL ──────────────────────────────────────── */}
      {modal === "expense" && (
        <Modal title="Nova despesa" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Descrição</label>
              <input style={styles.input} placeholder="Ex: Almoço no sábado" value={form.desc}
                onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} autoFocus />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Valor (R$)</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data</label>
              <input style={styles.input} type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Pago por</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {state.users.map(u => (
                  <button key={u.id} onClick={() => setForm(f => ({ ...f, paidBy: u.id }))}
                    style={{ ...styles.toggleBtn, ...(form.paidBy === u.id ? styles.toggleBtnActive : {}), display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{u.avatar}</span> {u.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Tipo</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {["shared", "individual"].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{ ...styles.toggleBtn, ...(form.type === t ? styles.toggleBtnActive : {}) }}>
                    {t === "shared" ? "💰 Compartilhada" : "👤 Individual"}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Categoria</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))}
                    style={{ padding: "8px 4px", borderRadius: 10, fontSize: 18, border: form.category === c.id ? "2px solid var(--accent)" : "1.5px solid var(--border)", background: form.category === c.id ? "var(--accent-bg)" : "var(--card-bg)", cursor: "pointer" }}>
                    {c.emoji}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addExpense} style={styles.btn}><Icons.Check size={16} /> Adicionar</button>
          </div>
        </Modal>
      )}

      {/* ── TRANSFER MODAL ──────────────────────────────────────── */}
      {modal === "transfer" && (
        <Modal title="Acerto / Transferência" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ ...styles.card, textAlign: "center", background: "var(--accent-bg)", border: "none" }}>
              <p style={{ fontSize: 11, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Saldo atual</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: debtColor }}>{debtStr}</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: debtColor }}>{fmt(absBalance)}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>De</label>
                <select style={styles.input} value={transferForm.from} onChange={e => setTransferForm(f => ({ ...f, from: e.target.value, to: e.target.value === "A" ? "B" : "A" }))}>
                  <option value="A">{userA.name}</option>
                  <option value="B">{userB.name}</option>
                </select>
              </div>
              <Icons.ArrowRight size={20} style={{ color: "var(--accent)", marginTop: 20 }} />
              <div style={styles.inputGroup}>
                <label style={styles.label}>Para</label>
                <div style={{ ...styles.input, display: "flex", alignItems: "center", color: "var(--fg-muted)" }}>
                  {transferForm.to === "A" ? userA.name : userB.name}
                </div>
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Valor (R$)</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" value={transferForm.value}
                onChange={e => setTransferForm(f => ({ ...f, value: e.target.value }))} autoFocus />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data</label>
              <input style={styles.input} type="date" value={transferForm.date}
                onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Descrição (opcional)</label>
              <input style={styles.input} placeholder="Ex: Acerto do mês" value={transferForm.desc}
                onChange={e => setTransferForm(f => ({ ...f, desc: e.target.value }))} />
            </div>
            <button onClick={addTransfer} style={styles.btn}><Icons.Check size={16} /> Confirmar Acerto</button>
          </div>
        </Modal>
      )}

      {/* ── SETTINGS MODAL ────────────────────────────────────── */}
      {modal === "settings" && (
        <Modal title="Configurações" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>Nomes do casal</p>
            {[{ val: nameA, set: setNameA, u: userA }, { val: nameB, set: setNameB, u: userB }].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: f.u.color + "22", border: `2px solid ${f.u.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.u.avatar}</div>
                <input style={{ ...styles.input, flex: 1 }} value={f.val} onChange={e => f.set(e.target.value)} />
              </div>
            ))}
            <button onClick={saveNames} style={styles.btn}><Icons.Check size={16} /> Salvar nomes</button>
            <div style={styles.divider} />
            <button onClick={() => setModal("transfer")} style={{ ...styles.btn, background: "#4D96FF22", color: "#4D96FF", border: "1.5px solid #4D96FF44" }}>
              <Icons.Transfer size={16} /> Fazer acerto
            </button>
            <button onClick={exportCSV} style={{ ...styles.btn, background: "transparent", color: "var(--fg)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <Icons.Download size={16} /> Exportar CSV
            </button>
            <button onClick={() => { if (confirm("Apagar TODOS os dados? Esta ação não pode ser desfeita.")) { update(() => ({ ...DEFAULT_STATE, onboarded: true, users: state.users })); setModal(null); showToast("Dados apagados"); } }}
              style={{ ...styles.btn, background: "#FF6B6B22", color: "#FF6B6B", border: "1.5px solid #FF6B6B44", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <Icons.Trash size={16} /> Apagar todos os dados
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#6BCB77" : "#FF6B6B", color: "#fff", padding: "10px 20px", borderRadius: 30, fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ t, users, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const payer = users.find(u => u.id === t.paidBy) || users[0];
  const cat = CAT_MAP[t.category] || { emoji: "📦", label: "Outros" };
  const isTransfer = t.type === "transfer";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: isTransfer ? "#4D96FF22" : payer.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {isTransfer ? "🔄" : cat.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</p>
        <p style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 1 }}>
          {isTransfer ? `${payer.name} → ${users.find(u => u.id !== t.paidBy)?.name}` : `${payer.name} · ${t.type === "shared" ? "compartilhada" : "individual"}`}
          {" · "}{fmtDate(t.date)}
        </p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: isTransfer ? "#4D96FF" : "var(--fg)" }}>{fmt(t.value)}</p>
        {!isTransfer && t.type === "shared" && <p style={{ fontSize: 10, color: "var(--fg-muted)" }}>÷2 = {fmt(t.value / 2)}</p>}
      </div>
      {confirm ? (
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onDelete(t.id)} style={{ ...styles.iconBtn, color: "#FF6B6B" }}><Icons.Check size={16} /></button>
          <button onClick={() => setConfirm(false)} style={styles.iconBtn}><Icons.X size={16} /></button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} style={{ ...styles.iconBtn, color: "var(--fg-muted)" }}><Icons.Trash size={15} /></button>
      )}
    </div>
  );
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--bg)", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -10px 60px rgba(0,0,0,.3)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontWeight: 900, fontSize: 20, color: "var(--fg)", letterSpacing: "-0.5px" }}>{title}</h2>
          <button onClick={onClose} style={styles.iconBtn}><Icons.X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}