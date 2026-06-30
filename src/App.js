import {
  FaBeer,
  FaBolt,
  FaCalendarAlt,
  FaChartPie,
  FaCocktail,
  FaCoffee,
  FaEuroSign,
  FaFileInvoiceDollar,
  FaGlassCheers,
  FaPlus,
  FaReceipt,
  FaSearch,
  FaSignOutAlt,
  FaTint,
  FaTrash,
  FaUserFriends,
  FaUtensils,
  FaWineGlassAlt,
} from "react-icons/fa";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const supabaseUrl = "https://mhlkmokxltyjduqiwesi.supabase.co";
const supabaseAnonKey = "sb_publishable_Q1mKLr0SAGugLgUOEqUtoQ_jwA-suTz";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STORAGE_KEY = "lalchamista-bills";
const FRIENDS_KEY = "lalchamista-friends";

const categories = [
  "Coffee",
  "Cocktails",
  "Beers",
  "Wine",
  "Bar",
  "Food",
  "Water",
  "Bill",
  "Electricity Bill",
] as const;

type Category = (typeof categories)[number];
type FilterValue = "All" | Category;

type Bill = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  note?: string;
  friends?: string[];
};

type BillForm = {
  date: string;
  description: string;
  category: Category;
  amount: string;
  note: string;
  friends: string[];
};

type CategoryMeta = {
  accent: string;
  soft: string;
  icon: JSX.Element;
};

const categoryMeta: Record<Category, CategoryMeta> = {
  Coffee: {
    accent: "#c6925b",
    soft: "rgba(198, 146, 91, 0.16)",
    icon: <FaCoffee />,
  },
  Cocktails: {
    accent: "#ff8b6a",
    soft: "rgba(255, 139, 106, 0.16)",
    icon: <FaCocktail />,
  },
  Beers: {
    accent: "#f4b942",
    soft: "rgba(244, 185, 66, 0.16)",
    icon: <FaBeer />,
  },
  Wine: {
    accent: "#b85677",
    soft: "rgba(184, 86, 119, 0.18)",
    icon: <FaWineGlassAlt />,
  },
  Bar: {
    accent: "#d9944c",
    soft: "rgba(217, 148, 76, 0.16)",
    icon: <FaGlassCheers />,
  },
  Food: {
    accent: "#79b36a",
    soft: "rgba(121, 179, 106, 0.16)",
    icon: <FaUtensils />,
  },
  Water: {
    accent: "#64b5f6",
    soft: "rgba(100, 181, 246, 0.16)",
    icon: <FaTint />,
  },
  Bill: {
    accent: "#b8b2a4",
    soft: "rgba(184, 178, 164, 0.14)",
    icon: <FaReceipt />,
  },
  "Electricity Bill": {
    accent: "#ffd166",
    soft: "rgba(255, 209, 102, 0.16)",
    icon: <FaBolt />,
  },
};

const emptyForm: BillForm = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  category: "Coffee",
  amount: "",
  note: "",
  friends: [],
};

function normaliseCategory(category?: string): Category {
  if (!category) return "Bill";

  const lower = category.toLowerCase().trim();

  if (lower === "beer") return "Beers";
  if (lower === "aperitivo") return "Bar";
  if (lower === "water bill") return "Water";
  if (lower === "electricity") return "Electricity Bill";
  if (lower === "other") return "Bill";

  const match = categories.find((item) => item.toLowerCase() === lower);
  return match ?? "Bill";
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function safeId(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || Date.now().toString()
  );
}

function readLocalBills(): Bill[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Bill[];
  } catch {
    return [];
  }
}

function readLocalFriends(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

function writeLocalBills(bills: Bill[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

function writeLocalFriends(friends: string[]) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [bills, setBills] = useState<Bill[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [form, setForm] = useState<BillForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("All");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bills" | "friends">("bills");
  const [newFriend, setNewFriend] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session?.user) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setBills([]);
          setFriends([]);
          setLoading(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const filteredBills = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();

    return bills.filter((bill) => {
      const category = normaliseCategory(bill.category);
      const matchesFilter = filter === "All" || category === filter;
      const matchesSearch =
        !lowerSearch ||
        bill.description.toLowerCase().includes(lowerSearch) ||
        (bill.note || "").toLowerCase().includes(lowerSearch) ||
        category.toLowerCase().includes(lowerSearch) ||
        (bill.friends || []).some((friend) =>
          friend.toLowerCase().includes(lowerSearch)
        );

      return matchesFilter && matchesSearch;
    });
  }, [bills, filter, search]);

  const totals = useMemo(() => {
    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const filteredTotal = filteredBills.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
    const utilities = bills
      .filter((bill) => {
        const category = normaliseCategory(bill.category);
        return category === "Water" || category === "Electricity Bill";
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
    const barTotal = bills
      .filter((bill) => normaliseCategory(bill.category) === "Bar")
      .reduce((sum, bill) => sum + bill.amount, 0);

    return { total, filteredTotal, utilities, barTotal };
  }, [bills, filteredBills]);

  async function signUp() {
    if (!email || !password) {
      setAuthMessage("Enter email and password first.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signUp({ email, password });

    setAuthBusy(false);
    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage(
        "Account created. Check your email if confirmation is required, then login."
      );
      setAuthMode("login");
    }
  }

  async function signIn() {
    if (!email || !password) {
      setAuthMessage("Enter email and password first.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setAuthBusy(false);
    if (error) setAuthMessage(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function loadData() {
    if (!user) return;
    setLoading(true);

    try {
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select("data")
        .order("id", { ascending: false });

      if (billsError) throw billsError;

      const { data: friendsData, error: friendsError } = await supabase
        .from("friends")
        .select("data")
        .order("id", { ascending: true });

      if (friendsError) throw friendsError;

      const loadedBills = (billsData || [])
        .map((row: { data: Bill }) => row.data)
        .filter(Boolean);
      const loadedFriends = (friendsData || [])
        .map((row: { data: string }) => row.data)
        .filter(Boolean);

      setBills(loadedBills);
      setFriends(loadedFriends);
      writeLocalBills(loadedBills);
      writeLocalFriends(loadedFriends);
    } catch (error) {
      console.log("Supabase load error:", error);
      setBills(readLocalBills());
      setFriends(readLocalFriends());
    } finally {
      setLoading(false);
    }
  }

  async function saveBills(updated: Bill[]) {
    if (!user) return;

    setBills(updated);
    writeLocalBills(updated);

    try {
      await supabase.from("bills").delete().neq("id", "");

      if (updated.length > 0) {
        const rows = updated.map((bill) => ({
          id: bill.id,
          data: bill,
        }));

        const { error } = await supabase.from("bills").insert(rows);
        if (error) throw error;
      }
    } catch (error) {
      console.log("Supabase save bills error:", error);
      alert(
        "Saved on this device, but online save failed. Check Supabase settings."
      );
    }
  }

  async function saveFriends(updated: string[]) {
    if (!user) return;

    const uniqueFriends = Array.from(
      new Set(updated.map((friend) => friend.trim()).filter(Boolean))
    );

    setFriends(uniqueFriends);
    writeLocalFriends(uniqueFriends);

    try {
      await supabase.from("friends").delete().neq("id", "");

      if (uniqueFriends.length > 0) {
        const rows = uniqueFriends.map((friend) => ({
          id: safeId(friend),
          data: friend,
        }));

        const { error } = await supabase.from("friends").insert(rows);
        if (error) throw error;
      }
    } catch (error) {
      console.log("Supabase save friends error:", error);
      alert(
        "Saved on this device, but online friends save failed. Check Supabase settings."
      );
    }
  }

  function addBill() {
    const amount = Number(form.amount.replace(",", "."));

    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const newBill: Bill = {
      id: Date.now().toString(),
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      amount,
      note: form.note.trim(),
      friends: form.friends,
    };

    saveBills([newBill, ...bills]);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    setShowForm(false);
  }

  function deleteBill(id: string) {
    saveBills(bills.filter((bill) => bill.id !== id));
    setDeleteId(null);
  }

  function addFriend() {
    const name = newFriend.trim();
    const alreadyExists = friends.some(
      (friend) => friend.toLowerCase() === name.toLowerCase()
    );

    if (!name || alreadyExists) return;

    saveFriends([...friends, name]);
    setNewFriend("");
  }

  function removeFriend(name: string) {
    saveFriends(friends.filter((friend) => friend !== name));
  }

  function toggleFriendInForm(name: string) {
    const selected = form.friends.includes(name);
    setForm({
      ...form,
      friends: selected
        ? form.friends.filter((friend) => friend !== name)
        : [...form.friends, name],
    });
  }

  if (!user) {
    const isLogin = authMode === "login";

    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">L</div>
          <p className="eyebrow">Lalchamista</p>
          <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="auth-copy">
            A clean professional bill tracker for coffee, bar, friends and
            utility expenses.
          </p>

          <label className="field-label">Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="field-label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                isLogin ? signIn() : signUp();
              }
            }}
          />

          {authMessage && <div className="notice">{authMessage}</div>}

          <button
            className="primary-button wide"
            onClick={isLogin ? signIn : signUp}
            disabled={authBusy}
          >
            {authBusy ? "Please wait…" : isLogin ? "Login" : "Create account"}
          </button>

          <button
            className="ghost-button wide"
            onClick={() => {
              setAuthMessage("");
              setAuthMode(isLogin ? "signup" : "login");
            }}
          >
            {isLogin ? "Create a new account" : "I already have an account"}
          </button>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="loading-page">
        <div className="spinner" />
        <p>Loading your bills…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="logo-circle">L</div>
          <div>
            <p className="eyebrow">Caffè · Bar</p>
            <h1>Lalchamista</h1>
            <p className="subtitle">Professional bill tracker</p>
          </div>
        </div>

        <div className="top-actions">
          <div className="total-card">
            <span>Total spent</span>
            <strong>{formatEuro(totals.total)}</strong>
          </div>
          <button className="logout-button" onClick={signOut}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      <section className="dashboard-grid">
        <article className="metric-card gold">
          <div className="metric-icon">
            <FaEuroSign />
          </div>
          <span>Total</span>
          <strong>{formatEuro(totals.total)}</strong>
        </article>
        <article className="metric-card blue">
          <div className="metric-icon">
            <FaTint />
          </div>
          <span>Utilities</span>
          <strong>{formatEuro(totals.utilities)}</strong>
        </article>
        <article className="metric-card amber">
          <div className="metric-icon">
            <FaGlassCheers />
          </div>
          <span>Bar</span>
          <strong>{formatEuro(totals.barTotal)}</strong>
        </article>
        <article className="metric-card green">
          <div className="metric-icon">
            <FaUserFriends />
          </div>
          <span>Friends</span>
          <strong>{friends.length}</strong>
        </article>
      </section>

      <nav className="tabs">
        <button
          className={activeTab === "bills" ? "tab active" : "tab"}
          onClick={() => setActiveTab("bills")}
        >
          <FaReceipt /> Bills
        </button>
        <button
          className={activeTab === "friends" ? "tab active" : "tab"}
          onClick={() => setActiveTab("friends")}
        >
          <FaUserFriends /> Friends
          {friends.length > 0 && (
            <span className="tab-badge">{friends.length}</span>
          )}
        </button>
      </nav>

      {activeTab === "bills" && (
        <section className="content-card">
          <div className="toolbar">
            <div className="search-box">
              <FaSearch />
              <input
                type="search"
                placeholder="Search bills, notes, friends…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button
              className="primary-button"
              onClick={() => setShowForm((value) => !value)}
            >
              {showForm ? (
                "Close"
              ) : (
                <>
                  <FaPlus /> Add bill
                </>
              )}
            </button>
          </div>

          <div className="filter-row">
            <button
              className={
                filter === "All" ? "filter-pill active" : "filter-pill"
              }
              onClick={() => setFilter("All")}
            >
              <FaChartPie /> All
            </button>

            {categories.map((category) => {
              const meta = categoryMeta[category];
              const active = filter === category;

              return (
                <button
                  key={category}
                  className={active ? "filter-pill active" : "filter-pill"}
                  onClick={() => setFilter(category)}
                  style={{
                    borderColor: meta.accent,
                    color: active ? "#17140f" : meta.accent,
                    background: active ? meta.accent : meta.soft,
                  }}
                >
                  {meta.icon} {category}
                </button>
              );
            })}
          </div>

          {showForm && (
            <section className="form-panel">
              <div className="section-heading">
                <h2>New bill</h2>
                <p>Add date, category, amount and optional friends.</p>
              </div>

              <div className="form-grid">
                <div>
                  <label className="field-label">Date</label>
                  <div className="icon-input">
                    <FaCalendarAlt />
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) =>
                        setForm({ ...form, date: event.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Category</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category: event.target.value as Category,
                      })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="span-two">
                  <label className="field-label">Description</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Coffee beans, beers, water bill…"
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Amount (€)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Note</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Optional detail"
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                  />
                </div>
              </div>

              {friends.length > 0 && (
                <div className="friend-picker-wrap">
                  <label className="field-label">With friends</label>
                  <div className="friend-picker">
                    {friends.map((friend) => {
                      const selected = form.friends.includes(friend);
                      return (
                        <button
                          key={friend}
                          className={
                            selected ? "friend-chip selected" : "friend-chip"
                          }
                          onClick={() => toggleFriendInForm(friend)}
                        >
                          {friend[0].toUpperCase()} {friend}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                className="primary-button wide"
                onClick={addBill}
                disabled={!form.description.trim() || !form.amount}
              >
                Save bill
              </button>
            </section>
          )}

          <div className="list-summary">
            <span>
              {filter === "All" ? "All categories" : filter} ·{" "}
              {filteredBills.length} bill
              {filteredBills.length !== 1 ? "s" : ""}
            </span>
            <strong>{formatEuro(totals.filteredTotal)}</strong>
          </div>

          {filteredBills.length === 0 ? (
            <div className="empty-state">
              <FaFileInvoiceDollar />
              <h3>No bills found</h3>
              <p>Add your first bill or change the filter/search.</p>
            </div>
          ) : (
            <div className="bill-list">
              {filteredBills.map((bill) => {
                const category = normaliseCategory(bill.category);
                const meta = categoryMeta[category];

                return (
                  <article className="bill-card" key={bill.id}>
                    <div
                      className="bill-icon"
                      style={{ color: meta.accent, background: meta.soft }}
                    >
                      {meta.icon}
                    </div>

                    <div className="bill-main">
                      <div className="bill-topline">
                        <h3>{bill.description}</h3>
                        <strong style={{ color: meta.accent }}>
                          {formatEuro(bill.amount)}
                        </strong>
                      </div>
                      <div className="bill-meta">
                        <span style={{ color: meta.accent }}>{category}</span>
                        <span>·</span>
                        <span>{formatDate(bill.date)}</span>
                        {bill.note && (
                          <>
                            <span>·</span>
                            <span>{bill.note}</span>
                          </>
                        )}
                        {bill.friends && bill.friends.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="friend-text">
                              <FaUserFriends /> {bill.friends.join(", ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {deleteId === bill.id ? (
                      <div className="delete-confirm">
                        <button onClick={() => deleteBill(bill.id)}>
                          Delete
                        </button>
                        <button onClick={() => setDeleteId(null)}>Keep</button>
                      </div>
                    ) : (
                      <button
                        className="icon-button danger"
                        onClick={() => setDeleteId(bill.id)}
                        aria-label="Delete bill"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "friends" && (
        <section className="content-card">
          <div className="section-heading">
            <h2>Friends</h2>
            <p>Add friends here, then tag them when you save a bill.</p>
          </div>

          <div className="friend-add-row">
            <input
              className="input"
              type="text"
              placeholder="Friend's name…"
              value={newFriend}
              onChange={(event) => setNewFriend(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addFriend()}
            />
            <button
              className="primary-button"
              onClick={addFriend}
              disabled={!newFriend.trim()}
            >
              <FaPlus /> Add
            </button>
          </div>

          {friends.length === 0 ? (
            <div className="empty-state">
              <FaUserFriends />
              <h3>No friends yet</h3>
              <p>Add names to track bills with friends.</p>
            </div>
          ) : (
            <div className="friends-list">
              {friends.map((friend) => {
                const friendBills = bills.filter((bill) =>
                  bill.friends?.includes(friend)
                );
                const friendTotal = friendBills.reduce(
                  (sum, bill) => sum + bill.amount,
                  0
                );

                return (
                  <article className="friend-card" key={friend}>
                    <div className="friend-avatar">
                      {friend[0].toUpperCase()}
                    </div>
                    <div>
                      <h3>{friend}</h3>
                      <p>
                        {friendBills.length} bill
                        {friendBills.length !== 1 ? "s" : ""}
                        {friendBills.length > 0 &&
                          ` · ${formatEuro(friendTotal)}`}
                      </p>
                    </div>
                    <button
                      className="icon-button danger"
                      onClick={() => removeFriend(friend)}
                      aria-label={`Remove ${friend}`}
                    >
                      <FaTrash />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
