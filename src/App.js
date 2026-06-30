import { useState, useEffect } from "react";

const STORAGE_KEY = "lalchamista-bills";
const FRIENDS_KEY = "lalchamista-friends";

const categories = [
  "Coffee", "Cocktails", "Beer", "Wine", "Aperitivo", "Food",
  "Water Bill", "Electricity Bill", "Other"
];

const categoryMeta = {
  "Coffee":           { color: "#c8a96e", icon: "☕" },
  "Cocktails":        { color: "#e07b4a", icon: "🍹" },
  "Beer":             { color: "#d4a017", icon: "🍺" },
  "Wine":             { color: "#9b4b6e", icon: "🍷" },
  "Aperitivo":        { color: "#e8834a", icon: "🥂" },
  "Food":             { color: "#5a8a5e", icon: "🍽️" },
  "Water Bill":       { color: "#4a90c8", icon: "💧" },
  "Electricity Bill": { color: "#f0c030", icon: "⚡" },
  "Other":            { color: "#7a7a7a", icon: "📋" },
};

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  category: "Coffee",
  amount: "",
  note: "",
  friends: [],
};

export default function App() {
  const [bills, setBills] = useState([]);
  const [friends, setFriends] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState("bills"); // "bills" | "friends"
  const [newFriend, setNewFriend] = useState("");

  useEffect(() => { loadData(); }, []);

  function loadData() {
    try {
      const b = localStorage.getItem(STORAGE_KEY);
      if (b) setBills(JSON.parse(b));
    } catch { setBills([]); }
    try {
      const f = localStorage.getItem(FRIENDS_KEY);
      if (f) setFriends(JSON.parse(f));
    } catch { setFriends([]); }
    setLoading(false);
  }

  function saveBills(updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setBills(updated);
  }

  function saveFriends(updated) {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(updated));
    setFriends(updated);
  }

  async function addBill() {
    if (!form.description || !form.amount) return;
    const newBill = { ...form, id: Date.now().toString(), amount: parseFloat(form.amount) };
    await saveBills([newBill, ...bills]);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function deleteBill(id) {
    await saveBills(bills.filter((b) => b.id !== id));
    setDeleteId(null);
  }

  async function addFriend() {
    const name = newFriend.trim();
    if (!name || friends.includes(name)) return;
    await saveFriends([...friends, name]);
    setNewFriend("");
  }

  async function removeFriend(name) {
    await saveFriends(friends.filter((f) => f !== name));
  }

  function toggleFriendInForm(name) {
    const current = form.friends || [];
    const updated = current.includes(name)
      ? current.filter((f) => f !== name)
      : [...current, name];
    setForm({ ...form, friends: updated });
  }

  const filtered = filter === "All" ? bills : bills.filter((b) => b.category === filter);
  const total = filtered.reduce((sum, b) => sum + b.amount, 0);
  const grandTotal = bills.reduce((sum, b) => sum + b.amount, 0);

  // Utility bills total
  const utilityTotal = bills
    .filter(b => b.category === "Water Bill" || b.category === "Electricity Bill")
    .reduce((s, b) => s + b.amount, 0);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={{ color: "#c8a96e", fontFamily: "Georgia, serif", marginTop: 16 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoCircle}>L</div>
        <div>
          <div style={styles.logoTitle}>Lalchamista</div>
          <div style={styles.logoSub}>CAFFÈ · BAR — Bill Tracker</div>
        </div>
        <div style={styles.totalBadge}>
          <div style={styles.totalLabel}>Total Spent</div>
          <div style={styles.totalAmount}>€{grandTotal.toFixed(2)}</div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <div style={styles.statIcon}>💧⚡</div>
          <div style={styles.statValue}>€{utilityTotal.toFixed(2)}</div>
          <div style={styles.statLabel}>Utilities</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statIcon}>🥂</div>
          <div style={styles.statValue}>€{bills.filter(b=>b.category==="Aperitivo").reduce((s,b)=>s+b.amount,0).toFixed(2)}</div>
          <div style={styles.statLabel}>Aperitivo</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statValue}>{friends.length}</div>
          <div style={styles.statLabel}>Friends</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statIcon}>🧾</div>
          <div style={styles.statValue}>{bills.length}</div>
          <div style={styles.statLabel}>Bills</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab("bills")} style={{ ...styles.tab, ...(activeTab === "bills" ? styles.tabActive : {}) }}>
          Bills
        </button>
        <button onClick={() => setActiveTab("friends")} style={{ ...styles.tab, ...(activeTab === "friends" ? styles.tabActive : {}) }}>
          Friends {friends.length > 0 && <span style={styles.badge}>{friends.length}</span>}
        </button>
      </div>

      {/* ── BILLS TAB ── */}
      {activeTab === "bills" && (
        <>
          {/* Filter + Add */}
          <div style={styles.actionRow}>
            <div style={styles.filterRow}>
              {["All", ...categories].map((cat) => {
                const meta = categoryMeta[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    style={{
                      ...styles.filterBtn,
                      background: filter === cat ? (meta?.color || "#c8a96e") : "transparent",
                      color: filter === cat ? "#1a1a0f" : (meta?.color || "#c8a96e"),
                      borderColor: meta?.color || "#c8a96e",
                    }}
                  >
                    {meta?.icon && <span style={{ marginRight: 3 }}>{meta.icon}</span>}{cat}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
              {showForm ? "✕ Cancel" : "+ Add Bill"}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div style={styles.formCard}>
              <div style={styles.formTitle}>New Bill</div>
              <div style={styles.formGrid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Date</label>
                  <input type="date" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Category</label>
                  <select value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.input}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Description</label>
                  <input type="text" placeholder="e.g. Espresso + Aperol Spritz"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Amount (€)</label>
                  <input type="number" placeholder="0.00" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    style={styles.input} step="0.01" min="0" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Note (optional)</label>
                  <input type="text" placeholder="Any extra detail…" value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })} style={styles.input} />
                </div>

                {/* Friends picker */}
                {friends.length > 0 && (
                  <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1" }}>
                    <label style={styles.label}>With friends</label>
                    <div style={styles.friendPicker}>
                      {friends.map((f) => {
                        const selected = (form.friends || []).includes(f);
                        return (
                          <button key={f} onClick={() => toggleFriendInForm(f)} style={{
                            ...styles.friendChip,
                            background: selected ? "#3a5a3a" : "#2a2a18",
                            borderColor: selected ? "#5a8a5e" : "#3a3a28",
                            color: selected ? "#a0d0a0" : "#888",
                          }}>
                            👤 {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={addBill} disabled={!form.description || !form.amount}
                style={{ ...styles.saveBtn, opacity: !form.description || !form.amount ? 0.4 : 1 }}>
                Save Bill
              </button>
            </div>
          )}

          {/* Summary strip */}
          {filter !== "All" && (
            <div style={styles.summaryStrip}>
              <span style={{ color: "#aaa" }}>
                {categoryMeta[filter]?.icon} <b style={{ color: categoryMeta[filter]?.color || "#c8a96e" }}>{filter}</b>
              </span>
              <span style={{ color: "#c8a96e", fontWeight: "bold" }}>
                {filtered.length} bill{filtered.length !== 1 ? "s" : ""} · €{total.toFixed(2)}
              </span>
            </div>
          )}

          {/* Bills list */}
          {filtered.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🧾</div>
              <div style={styles.emptyText}>No bills yet{filter !== "All" ? ` in ${filter}` : ""}.</div>
              <div style={styles.emptyHint}>Tap "+ Add Bill" to log your first one.</div>
            </div>
          ) : (
            <div style={styles.list}>
              {filtered.map((bill) => {
                const meta = categoryMeta[bill.category] || { color: "#7a7a7a", icon: "📋" };
                return (
                  <div key={bill.id} style={styles.card}>
                    <div style={{ ...styles.catIcon }}>{meta.icon}</div>
                    <div style={styles.cardBody}>
                      <div style={styles.cardTop}>
                        <span style={styles.cardDesc}>{bill.description}</span>
                        <span style={{ ...styles.cardAmount, color: meta.color }}>€{bill.amount.toFixed(2)}</span>
                      </div>
                      <div style={styles.cardMeta}>
                        <span style={{ color: meta.color }}>{bill.category}</span>
                        <span style={styles.dot}>·</span>
                        <span>{new Date(bill.date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {bill.note && <><span style={styles.dot}>·</span><span style={{ fontStyle: "italic" }}>{bill.note}</span></>}
                        {bill.friends?.length > 0 && (
                          <><span style={styles.dot}>·</span><span style={{ color: "#5a8a5e" }}>👥 {bill.friends.join(", ")}</span></>
                        )}
                      </div>
                    </div>
                    {deleteId === bill.id ? (
                      <div style={styles.confirmDelete}>
                        <button onClick={() => deleteBill(bill.id)} style={styles.confirmYes}>Delete</button>
                        <button onClick={() => setDeleteId(null)} style={styles.confirmNo}>Keep</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(bill.id)} style={styles.deleteBtn}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── FRIENDS TAB ── */}
      {activeTab === "friends" && (
        <div style={{ padding: "20px 24px" }}>
          <div style={styles.formTitle}>Your Friends</div>

          {/* Add friend */}
          <div style={styles.friendAddRow}>
            <input
              type="text"
              placeholder="Friend's name…"
              value={newFriend}
              onChange={(e) => setNewFriend(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFriend()}
              style={{ ...styles.input, flex: 1 }}
            />
            <button onClick={addFriend} disabled={!newFriend.trim()} style={{
              ...styles.addBtn,
              opacity: !newFriend.trim() ? 0.4 : 1,
            }}>Add</button>
          </div>

          {friends.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>👥</div>
              <div style={styles.emptyText}>No friends added yet.</div>
              <div style={styles.emptyHint}>Add names above to tag them on bills.</div>
            </div>
          ) : (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {friends.map((f) => {
                const theirBills = bills.filter(b => b.friends?.includes(f));
                const theirTotal = theirBills.reduce((s, b) => s + b.amount, 0);
                return (
                  <div key={f} style={styles.friendCard}>
                    <div style={styles.friendAvatar}>{f[0].toUpperCase()}</div>
                    <div style={styles.friendInfo}>
                      <div style={styles.friendName}>{f}</div>
                      <div style={styles.friendStats}>
                        {theirBills.length} bill{theirBills.length !== 1 ? "s" : ""} together
                        {theirBills.length > 0 && <span style={{ color: "#c8a96e" }}> · €{theirTotal.toFixed(2)}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeFriend(f)} style={styles.deleteBtn} title="Remove">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#141410", color: "#e8e0d0", fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 60 },
  loadingWrap: { minHeight: "100vh", background: "#141410", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  spinner: { width: 36, height: 36, border: "3px solid #333", borderTop: "3px solid #c8a96e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header: { background: "linear-gradient(135deg, #1e1e14 0%, #2a2a18 100%)", borderBottom: "1px solid #3a3a28", padding: "24px 24px 20px", display: "flex", alignItems: "center", gap: 16 },
  logoCircle: { width: 48, height: 48, borderRadius: "50%", background: "#c8a96e", color: "#1a1a0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontFamily: "Georgia, serif", fontWeight: "bold", flexShrink: 0 },
  logoTitle: { fontFamily: "Georgia, serif", fontSize: 20, color: "#c8a96e", letterSpacing: "0.04em" },
  logoSub: { fontSize: 10, color: "#888", letterSpacing: "0.12em", marginTop: 2 },
  totalBadge: { marginLeft: "auto", textAlign: "right" },
  totalLabel: { fontSize: 10, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase" },
  totalAmount: { fontSize: 24, color: "#c8a96e", fontFamily: "Georgia, serif", fontWeight: "bold" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid #2a2a1e", background: "#1a1a10" },
  statBox: { padding: "14px 8px", textAlign: "center", borderRight: "1px solid #2a2a1e" },
  statIcon: { fontSize: 16, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: "bold", color: "#c8a96e", fontFamily: "Georgia, serif" },
  statLabel: { fontSize: 9, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 },
  tabs: { display: "flex", borderBottom: "1px solid #2a2a1e" },
  tab: { flex: 1, padding: "12px", background: "transparent", border: "none", color: "#666", fontSize: 13, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "2px solid transparent", transition: "all 0.15s" },
  tabActive: { color: "#c8a96e", borderBottom: "2px solid #c8a96e" },
  badge: { background: "#c8a96e", color: "#1a1a0f", borderRadius: 10, padding: "1px 6px", fontSize: 10, marginLeft: 6, fontWeight: "bold" },
  actionRow: { padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, borderBottom: "1px solid #2a2a1e" },
  filterRow: { display: "flex", gap: 5, flexWrap: "wrap" },
  filterBtn: { padding: "4px 9px", borderRadius: 20, border: "1px solid", fontSize: 11, cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.15s" },
  addBtn: { background: "#c8a96e", color: "#1a1a0f", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: "bold", cursor: "pointer", letterSpacing: "0.04em", whiteSpace: "nowrap" },
  formCard: { margin: "14px 24px", background: "#1e1e14", border: "1px solid #3a3a28", borderRadius: 10, padding: 18 },
  formTitle: { fontFamily: "Georgia, serif", color: "#c8a96e", fontSize: 16, marginBottom: 14, letterSpacing: "0.05em" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 10, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase" },
  input: { background: "#2a2a18", border: "1px solid #3a3a28", borderRadius: 6, color: "#e8e0d0", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" },
  saveBtn: { marginTop: 14, background: "#c8a96e", color: "#1a1a0f", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, fontWeight: "bold", cursor: "pointer", width: "100%", letterSpacing: "0.06em" },
  friendPicker: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 },
  friendChip: { padding: "5px 10px", borderRadius: 16, border: "1px solid", fontSize: 12, cursor: "pointer", transition: "all 0.15s" },
  summaryStrip: { display: "flex", justifyContent: "space-between", padding: "8px 24px", fontSize: 12, color: "#888", borderBottom: "1px solid #2a2a1e" },
  empty: { textAlign: "center", padding: "56px 24px" },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: "#aaa", fontSize: 15, marginBottom: 6 },
  emptyHint: { color: "#555", fontSize: 12 },
  list: { padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8 },
  card: { background: "#1e1e14", border: "1px solid #2e2e1e", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 },
  catIcon: { fontSize: 20, flexShrink: 0, width: 28, textAlign: "center" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline",
