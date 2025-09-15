import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Upload as UploadIcon,
  Stethoscope,
  ShieldCheck,
  LogOut,
  History as HistoryIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  AlertTriangle,
  Activity,
  Microscope,
  Search,
  Download as DownloadIcon,
  FilePlus,
  FileInput,
  Sun,
  Moon,
  ListTodo,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Calendar as CalendarIcon,
  MessageSquare, // NEW
} from "lucide-react";

// NEW: step 1 components
import CalendarView from "./components/CalendarView";
import ChatView from "./components/ChatView";

/* =========================
   Backend wiring (FastAPI)
   ========================= */

// prefer local FastAPI whenever the UI itself is loaded from localhost/127.0.0.1
const API_BASE = (() => {
  const isLocalUI = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (isLocalUI) return "http://127.0.0.1:8000";

  // otherwise honor Vite env (e.g. docker/prod), but still fall back to localhost
  const envBase = (import.meta?.env?.VITE_API_BASE ?? "").trim();
  return envBase || "http://127.0.0.1:8000";
})();

console.log("GenomeRx API_BASE =>", API_BASE);

// helper to safely join paths without double slashes
const join = (base, path) => `${base.replace(/\/+$/, "")}${path}`;

// central JSON fetch (optional, but keeps error messages consistent)
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Accept: "application/json", ...(opts.headers || {}) } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

async function sendToBackend(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(join(API_BASE, "/api/v1/predict"), {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Backend error ${res.status}`);
  }
  return res.json();
}

/* =========================
   Simple helpers for theme + notes + tasks
   ========================= */
const THEME_PREFIX = "genomerx_theme_";
const NOTES_LS_KEY = "genomerx_notes_v1";
const TASKS_LS_KEY = "genomerx_tasks_v1";
// NEW:
const CALENDAR_LS_KEY = "genomerx_calendar_v1";
const CHAT_LS_KEY = "genomerx_chat_v1";

function useLocalJson(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

// card class helpers (dark-safe)
function cardClass(theme, pad = "p-6", round = "rounded-2xl") {
  return `${round} border ${pad} ${
    theme === "dark" ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white"
  }`;
}
function subCardClass(theme, pad = "p-4") {
  return cardClass(theme, pad, "rounded-xl");
}
function tableHeadClass(theme) {
  return theme === "dark" ? "bg-slate-800" : "bg-slate-50";
}
function pill(theme, ok) {
  return `text-xs px-2 py-1 rounded-full ${
    ok ? (theme === "dark" ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")
       : (theme === "dark" ? "bg-rose-900/40 text-rose-300" : "bg-rose-50 text-rose-700")
  }`;
}

/* =============================================
   GenomeRx UI (React + Tailwind)
   - Auth + RBAC (localStorage)
   - Upload → FastAPI backend
   - Per-user Theme, Profile, Notes/Tags
   - NEW: Task List / To-Do (localStorage)
   ============================================= */

const LS_KEY = "genomerx_users_v1";

export default function App() {
  // load/save users to localStorage; seed one Admin user on first run
  const [users, setUsers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return [
      { email: "admin@genomerx.local", password: "Admin@123", name: "Admin", role: "Admin", active: true },
    ];
  });
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(users));
  }, [users]);

  const [user, setUser] = useState(null); // {name, role, email}
  const [route, setRoute] = useState("login");
  const [predictions, setPredictions] = useState([]); // local session history
  const [current, setCurrent] = useState(null); // current prediction result

  // notes/tags store (shared across screens, persisted)
  const [notesMap, setNotesMap] = useLocalJson(NOTES_LS_KEY, {}); // { [id]: { notes, tags[] } }

  // NEW: tasks store
  const [tasks, setTasks] = useLocalJson(TASKS_LS_KEY, []); // array of task objects

  // NEW: calendar + chat stores
  const [events, setEvents] = useLocalJson(CALENDAR_LS_KEY, []); // array of event objects
  const [chatState, setChatState] = useLocalJson(CHAT_LS_KEY, {
    channels: [{ id: "general", name: "General", type: "Channel" }],
    messages: [], // {id, channelId, text, ts, user:{email,name,role}}
  });

  const handleLogout = () => {
    setUser(null);
    setRoute("login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {user && route !== "login" ? (
        <AppShell
          user={user}
          route={route}
          onNavigate={setRoute}
          onLogout={handleLogout}
          users={users}
          setUsers={setUsers}
        >
          <MainRouter
            route={route}
            user={user}
            setUser={setUser}
            predictions={predictions}
            setPredictions={setPredictions}
            current={current}
            setCurrent={setCurrent}
            onNavigate={setRoute}
            users={users}
            setUsers={setUsers}
            notesMap={notesMap}
            setNotesMap={setNotesMap}
            tasks={tasks}
            setTasks={setTasks}
            // NEW props
            events={events}
            setEvents={setEvents}
            chatState={chatState}
            setChatState={setChatState}
          />
        </AppShell>
      ) : (
        <Auth
          users={users}
          setUsers={setUsers}
          onLogin={(u) => {
            setUser(u);
            setRoute("dashboard");
          }}
        />
      )}
    </div>
  );
}

// --------------------------- Layout ---------------------------
function AppShell({ user, route, onNavigate, onLogout, children, users, setUsers }) {
  // per-user theme
  const themeKey = `${THEME_PREFIX}${user.email}`;
  const [theme, setTheme] = useState(() => localStorage.getItem(themeKey) || "light");
  useEffect(() => {
    localStorage.setItem(themeKey, theme);
    // add/remove a 'dark' class on <html> (harmless even if Tailwind isn't dark-configured)
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, themeKey]);

  const nav = [
    { key: "dashboard", label: "Dashboard", icon: Stethoscope },
    { key: "upload", label: "Upload Genome", icon: UploadIcon },
    { key: "history", label: "History", icon: HistoryIcon },
    { key: "tasks", label: "Tasks", icon: ListTodo },
    // NEW (inserted right after "tasks")
    { key: "calendar", label: "Calendar", icon: CalendarIcon, roles: ["Admin", "Doctor", "Researcher"] },
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "profile", label: "My Profile", icon: UserIcon },
    { key: "admin", label: "Admin", icon: SettingsIcon, role: "Admin" },
  ];

  return (
    <div className={`flex min-h-screen ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50"}`}>
      <aside className={`w-64 hidden md:flex md:flex-col border-r ${theme==="dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className={`p-4 border-b ${theme==="dark" ? "border-slate-800" : ""}`}>
          <div className="text-xl font-bold">GenomeRx</div>
          <div className={`text-xs ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Smart Genomic Insight</div>
        </div>
        <nav className="p-2 space-y-1">
          {nav
            // UPDATED filter: supports `role` (single) or `roles` (array)
            .filter((n) =>
              (!n.role && !n.roles) ||
              (n.role && n.role === user.role) ||
              (n.roles && n.roles.includes(user.role))
            )
            .map((n) => (
              <button
                key={n.key}
                onClick={() => onNavigate(n.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left
                  ${theme==="dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"}
                  ${route === n.key ? (theme==="dark" ? "bg-slate-800 font-semibold" : "bg-slate-100 font-semibold") : ""}`}
              >
                <n.icon className="w-4 h-4" />
                <span>{n.label}</span>
              </button>
            ))}
        </nav>
        <div className="mt-auto p-4 space-y-3">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="w-4 h-4" />
            <div>
              <div className="font-medium">{user.name}</div>
              <div className={`text-xs ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>{user.role}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 justify-center rounded-xl bg-slate-900 text-white py-2 hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className={`sticky top-0 z-10 backdrop-blur border-b px-4 py-2 flex items-center justify-between
          ${theme==="dark" ? "bg-slate-900/70 border-slate-800" : "bg-white/70"}`}>
          <div className="flex items-center gap-2 md:hidden">
            <div className="text-lg font-bold">GenomeRx</div>
          </div>
          <div className={`flex items-center gap-3 text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-500"}`}>
            <ShieldCheck className="w-4 h-4" /> TLS Active · 99% Uptime · v0.2
          </div>
          <div className="hidden md:flex"><ThemeToggle theme={theme} setTheme={setTheme} /></div>
        </header>
        <main className="p-4 md:p-6">
          {/* inject theme into children via render prop */}
          {React.cloneElement(children, { theme })}
        </main>
      </div>
    </div>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}
      title="Toggle theme"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="text-sm">{theme === "dark" ? "Light" : "Dark"} theme</span>
    </button>
  );
}

function MainRouter({
  route,
  user,
  setUser,
  predictions,
  setPredictions,
  current,
  setCurrent,
  onNavigate,
  users,
  setUsers,
  theme,
  notesMap,
  setNotesMap,
  tasks,
  setTasks,
  // NEW props
  events,
  setEvents,
  chatState,
  setChatState,
}) {
  switch (route) {
    case "dashboard":
      return <Dashboard theme={theme} user={user} predictions={predictions} onNavigate={onNavigate} />;
    case "upload":
      return (
        <UploadFlow
          theme={theme}
          onComplete={(res) => {
            setCurrent(res);
            setPredictions([res, ...predictions]);
          }}
          notesMap={notesMap}
          setNotesMap={setNotesMap}
        />
      );
    case "history":
      return <HistoryView theme={theme} notesMap={notesMap} setNotesMap={setNotesMap} />;
    case "tasks":
      return <TasksView theme={theme} users={users} currentUser={user} tasks={tasks} setTasks={setTasks} />;
    // NEW routes
    case "calendar":
      return (["Admin", "Doctor", "Researcher"].includes(user.role)
        ? <CalendarView theme={theme} users={users} currentUser={user} events={events} setEvents={setEvents} />
        : <Forbidden theme={theme} />
      );
    case "chat":
      return <ChatView theme={theme} users={users} currentUser={user} chatState={chatState} setChatState={setChatState} />;
    case "profile":
      return <ProfileView theme={theme} user={user} setUser={setUser} users={users} setUsers={setUsers} />;
    case "admin":
      return user.role === "Admin" ? (
        <AdminView theme={theme} items={predictions} users={users} setUsers={setUsers} currentUser={user} />
      ) : (
        <Forbidden theme={theme} />
      );
    default:
      return <Dashboard theme={theme} user={user} predictions={predictions} onNavigate={onNavigate} />;
  }
}

function Forbidden({ theme }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className={cardClass(theme)}>
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <div className="font-semibold">Forbidden</div>
        </div>
        <p className={`${theme==="dark" ? "text-slate-300" : "text-slate-600"} mt-2`}>You don't have permission to view this page.</p>
      </div>
    </div>
  );
}

/* --------------------------- Auth (Login + Register) --------------------------- */
function Auth({ users, setUsers, onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {mode === "login" ? (
          <Login users={users} onLogin={onLogin} onGoRegister={() => setMode("register")} />
        ) : (
          <Register users={users} setUsers={setUsers} onGoLogin={() => setMode("login")} />
        )}
      </motion.div>
    </div>
  );
}

function Login({ users, onLogin, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState("Doctor");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const locked = lockedUntil && Date.now() < lockedUntil;

  const submit = (e) => {
    e.preventDefault();
    if (locked) return;
    const found = users.find((u) => u.email === email && u.password === pass);
    if (!found) {
      setError("Invalid email or password");
      setAttempts((a) => a + 1);
      if (attempts + 1 >= 3) setLockedUntil(Date.now() + 60 * 60 * 1000);
      return;
    }
    if (found.active === false) {
      setError("This account is deactivated. Contact admin.");
      return;
    }
    onLogin({ name: found.name, role: found.role, email: found.email });
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-slate-600">
        <Microscope className="w-5 h-5" />
        <h1 className="text-xl font-bold">GenomeRx Login</h1>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" required className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label className="text-sm font-medium">Login as</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 bg-white">
            <option>Doctor</option>
            <option>Researcher</option>
            <option>Lab Staff</option>
            <option>Admin</option>
          </select>
        </div>
        {locked && (
          <div className="text-sm text-amber-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Account locked for 1 hour after 3 failed attempts.
          </div>
        )}
        {error && !locked && <div className="text-sm text-rose-600">{error}</div>}
        <button disabled={locked} className="w-full rounded-xl bg-slate-900 text-white py-2 hover:bg-slate-800 disabled:opacity-50">Sign in</button>
      </form>
      <div className="mt-3 text-sm text-slate-600">
        New here? <button onClick={onGoRegister} className="text-slate-900 underline">Create an account</button>
      </div>
    </div>
  );
}

function Register({ users, setUsers, onGoLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState("Doctor");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (users.some((u) => u.email === email)) {
      setError("Email already exists");
      return;
    }
    if (pass.length < 6) {
      setError("Password must be ≥ 6 characters");
      return;
    }
    const u = { name, email, password: pass, role, active: true };
    setUsers([...users, u]);
    setOk("Account created. You can sign in now.");
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-slate-600">
        <FilePlus className="w-5 h-5" />
        <h1 className="text-xl font-bold">Create Account</h1>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" required className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label className="text-sm font-medium">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 bg-white">
            <option>Doctor</option>
            <option>Researcher</option>
            <option>Lab Staff</option>
            <option>Admin</option>
          </select>
        </div>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {ok && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2">{ok}</div>}
        <button className="w-full rounded-xl bg-slate-900 text-white py-2 hover:bg-slate-800">Create account</button>
      </form>
      <div className="mt-3 text-sm text-slate-600">
        Already have an account? <button onClick={onGoLogin} className="text-slate-900 underline">Sign in</button>
      </div>
    </div>
  );
}

/* --------------------------- Profile --------------------------- */
function ProfileView({ theme, user, setUser, users, setUsers }) {
  const [name, setName] = useState(user.name || "");
  // change password fields
  const [cur, setCur] = useState("");
  const [npw, setNpw] = useState("");
  const [cpw, setCpw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const saveName = (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!name.trim()) { setErr("Name is required"); return; }
    setUsers(prev => prev.map(u => u.email === user.email ? { ...u, name: name.trim() } : u));
    setUser(prev => ({ ...prev, name: name.trim() }));
    setMsg("Profile updated.");
  };

  const changePassword = (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    const me = users.find(u => u.email === user.email);
    if (!me || me.password !== cur) { setErr("Current password is incorrect"); return; }
    if (npw.length < 6) { setErr("New password must be ≥ 6 characters"); return; }
    if (npw !== cpw) { setErr("New passwords do not match"); return; }
    setUsers(prev => prev.map(u => u.email === user.email ? { ...u, password: npw } : u));
    setMsg("Password changed.");
    setCur(""); setNpw(""); setCpw("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className={cardClass(theme)}>
        <div className="font-semibold mb-3">My Profile</div>
        <form onSubmit={saveName} className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Full Name</label>
            <input className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input disabled className={`w-full rounded-xl border px-3 py-2 opacity-70 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} value={user.email} />
          </div>
          <button className="rounded-xl bg-slate-900 text-white py-2 px-4">Save</button>
        </form>
      </div>

      <div className={cardClass(theme)}>
        <div className="font-semibold mb-3">Change Password</div>
        <form onSubmit={changePassword} className="grid md:grid-cols-3 gap-3">
          <input placeholder="Current password" type="password" value={cur} onChange={(e)=>setCur(e.target.value)} className={`rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
          <input placeholder="New password" type="password" value={npw} onChange={(e)=>setNpw(e.target.value)} className={`rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
          <input placeholder="Confirm new password" type="password" value={cpw} onChange={(e)=>setCpw(e.target.value)} className={`rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
          <div className="md:col-span-3">
            <button className="rounded-xl bg-slate-900 text-white py-2 px-4">Update Password</button>
          </div>
        </form>
        {err && <div className="mt-2 text-sm text-rose-500">{err}</div>}
        {msg && <div className="mt-2 text-sm text-emerald-400">{msg}</div>}
      </div>
    </div>
  );
}

/* --------------------------- Dashboard --------------------------- */
function Dashboard({ theme, user, predictions, onNavigate }) {
  const recent = predictions.slice(0, 5);
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard theme={theme} icon={Activity} label="Analyses Today" value={predictions.filter((p) => isToday(p.date)).length || 0} />
        <StatCard theme={theme} icon={ShieldCheck} label="Avg Confidence" value={`${avgConfidence(predictions)}%`} />
        <StatCard theme={theme} icon={Microscope} label="Models" value="RF, SVM" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className={cardClass(theme, "p-4") + " lg:col-span-2"}>
          <div className="flex items-center gap-2">
            <UploadIcon className="w-4 h-4" />
            <div className="font-semibold">Recent Predictions</div>
          </div>
          <div className="mt-3 divide-y divide-slate-200/70 dark:divide-slate-800/70">
            {recent.length === 0 && <div className={`${theme==="dark" ? "text-slate-300" : "text-slate-500"} text-sm p-3`}>No analyses yet. Upload a genome to begin.</div>}
            {recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">
                    {r.pathogen} · <span className={`${theme==="dark" ? "text-slate-400" : "text-slate-500"} text-sm`}>{formatDate(r.date)}</span>
                  </div>
                  <div className={`${theme==="dark" ? "text-slate-300" : "text-slate-600"} text-sm`}>Top antibiotics: {r.recommendations.map((a) => a.name).join(", ")}</div>
                </div>
                <span className={pill(theme, !r.mdr)}>{r.mdr ? "MDR Warning" : "OK"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cardClass(theme, "p-4")}>
          <div className="font-semibold">Quick Actions</div>
          <div className="mt-3 grid gap-2">
            <button onClick={() => onNavigate("upload")} className={`rounded-xl border px-3 py-2 text-left ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>Upload Genome</button>
            <button onClick={() => onNavigate("history")} className={`rounded-xl border px-3 py-2 text-left ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>View History</button>
            <button onClick={() => onNavigate("tasks")} className={`rounded-xl border px-3 py-2 text-left ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>Tasks</button>
            {user.role === "Admin" && (
              <button onClick={() => onNavigate("admin")} className={`rounded-xl border px-3 py-2 text-left ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>Admin Panel</button>
            )}
          </div>
          <div className={`mt-6 text-xs ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>• Predictions complete &lt; 30s for &lt;1MB files.<br />• TLS, RBAC enabled.</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ theme, icon: Icon, label, value }) {
  return (
    <div className={cardClass(theme, "p-4")}>
      <div className={`flex items-center gap-2 text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-500"}`}>
        <Icon className="w-4 h-4" />
        <div>{label}</div>
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

/* --------------------------- Upload & Prediction --------------------------- */
function UploadFlow({ theme, onComplete, notesMap, setNotesMap }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("idle"); // idle | uploading | predicting | done
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);

  const onFile = (f) => {
    setError("");
    if (!f) return;
    if (!/\.(fasta|fa|csv|pdf)$/i.test(f.name)) {
      setError("Invalid format. Use FASTA/CSV/PDF");
      setFile(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File too large (>5MB)");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const start = async () => {
    if (!file) return;
    try {
      setResult(null);
      setStage("uploading");
      await fakeProgress(600, setProgress); // quick visual

      setStage("predicting");
      // keep progress pulsing while we wait for the backend
      let pct = 15;
      setProgress(pct);
      const timer = setInterval(() => {
        pct = Math.min(95, pct + 5);
        setProgress(pct);
      }, 250);

      const payload = await sendToBackend(file);

      clearInterval(timer);
      setProgress(100);
      setResult(payload);
      setStage("done");
      onComplete && onComplete(payload);
    } catch (e) {
      console.error(e);
      setError(e.message || "Prediction failed");
      setStage("idle");
      setProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className={cardClass(theme)}>
        <div className="flex items-center gap-2">
          <UploadIcon className="w-4 h-4" />
          <div className="font-semibold">Upload Genome (FASTA/CSV/PDF)</div>
        </div>

        {/* Drag & drop zone */}
        <div
          className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center ${drag ? (theme==="dark" ? "bg-slate-800" : "bg-slate-50") : ""} ${theme==="dark" ? "border-slate-700" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            onFile(f);
          }}
        >
          <FileInput className="w-5 h-5 inline-block mr-2" /> Drag & drop file here
          <div className={`text-xs mt-1 ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>or choose manually</div>
          <div className="mt-3">
            <input
              type="file"
              accept=".fasta,.fa,.csv,.pdf"
              onChange={(e) => onFile(e.target.files?.[0])}
              className={`block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:px-4 file:py-2 file:hover:bg-slate-800 ${theme==="dark" ? "text-slate-200" : ""}`}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={start} disabled={!file || stage === "predicting"} className="rounded-xl bg-slate-900 text-white py-2 px-4 disabled:opacity-50">
            Start Analysis
          </button>
          {file && <div className={`text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>Selected: <span className="font-medium">{file.name}</span></div>}
        </div>

        {error && <div className="mt-2 text-sm text-rose-500">{error}</div>}
        <StageProgress stage={stage} progress={progress} />
      </div>

      {stage === "done" && result && (
        <ResultsCard theme={theme} result={result} notesMap={notesMap} setNotesMap={setNotesMap} />
      )}
    </div>
  );
}

function StageProgress({ stage, progress }) {
  const steps = [
    { key: "uploading", label: "Uploading" },
    { key: "predicting", label: "AMR Prediction" },
  ];
  if (stage === "idle") return null;
  return (
    <div className="mt-4">
      <div className="flex gap-2 text-sm">
        {steps.map((s) => (
          <div key={s.key} className={`px-3 py-1 rounded-full border ${stage === s.key ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600"}`}>{s.label}</div>
        ))}
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 mt-3 overflow-hidden">
        <div className="h-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function ResultsCard({ theme, result, notesMap, setNotesMap }) {
  const reportRef = useRef(null);

  const id = `${result.fileName}|${result.date}`;
  const entry = notesMap[id] || { notes: "", tags: [] };
  const [notesOpen, setNotesOpen] = useState(false);

  const downloadPDF = () => {
    // Simple print to PDF flow for the demo
    const printContents = reportRef.current?.innerHTML;
    const w = window.open("", "", "width=800,height=900");
    w.document.write(`<!doctype html><html><head><title>GenomeRx Report</title><style>body{font-family:ui-sans-serif,system-ui; padding:24px} h1{font-size:20px} table{border-collapse:collapse;width:100%} td,th{border:1px solid #e5e7eb;padding:8px;font-size:12px} .pill{padding:2px 8px;border-radius:9999px;font-size:11px;display:inline-block}</style></head><body>${printContents}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className={cardClass(theme)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4" />
          <div className="font-semibold">Prediction Results</div>
        </div>
        <div className="flex items-center gap-2">
          {/* tags preview */}
          {entry.tags?.length > 0 && (
            <div className="hidden md:flex flex-wrap gap-1 mr-2">
              {entry.tags.map((t, i) => (
                <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${theme==="dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>{t}</span>
              ))}
            </div>
          )}
          <button onClick={()=>setNotesOpen(true)} className={`rounded-xl border px-3 py-1.5 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>Notes / Tags</button>
          <button onClick={downloadPDF} className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>
            <DownloadIcon className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2">
          <div className={subCardClass(theme)}>
            <div className={`text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>Pathogen</div>
            <div className="text-xl font-bold">{result.pathogen}</div>
            <div className={`text-sm ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Genome: {result.fileName} · {formatDate(result.date)}</div>
            {result.mdr && (
              <div className="mt-2 text-sm text-rose-400 bg-rose-900/30 rounded-lg p-2 inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Multi-drug resistance detected
              </div>
            )}
          </div>
          <div className={subCardClass(theme, "p-4 mt-4")}>
            <div className="font-semibold mb-2">Confidence by Antibiotic</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.antibiotics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="susceptible" name="Susceptible %" />
                  <Bar dataKey="resistant" name="Resistant %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className={subCardClass(theme)}>
            <div className="font-semibold">Top Recommendations</div>
            <ul className="mt-2 space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="font-medium">{r.name}</span>
                  <span className={`text-xs ${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>{r.confidence}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={subCardClass(theme)}>
            <div className="font-semibold">Matched Resistance Genes</div>
            <div className={`mt-2 text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>{result.genes.length ? result.genes.join(", ") : "None detected"}</div>
          </div>
        </div>
      </div>

      <div className={subCardClass(theme, "p-0 mt-6 overflow-hidden")} ref={reportRef}>
        <div className={`p-4 border-b ${theme==="dark" ? "bg-slate-800 border-slate-700" : "bg-slate-50"}`}>
          <div className="font-semibold">Clinical Report</div>
          <div className={`text-xs ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Generated: {formatDate(result.date)} · Patient ID: PID-{String(result.pid).padStart(5, "0")}</div>
        </div>
        <div className="p-4 text-sm">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className={`${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Pathogen</div>
              <div className="font-medium">{result.pathogen}</div>
            </div>
            <div>
              <div className={`${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Genome File</div>
              <div className="font-medium">{result.fileName}</div>
            </div>
            <div>
              <div className={`${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Summary</div>
              <div className="font-medium">{result.mdr ? "MDR detected; avoid listed resistant antibiotics" : "Susceptibility observed; see top-3 recommendations."}</div>
            </div>
            <div>
              <div className={`${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Genes</div>
              <div className="font-medium">{result.genes.length ? result.genes.join(", ") : "—"}</div>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead className={tableHeadClass(theme)}>
                <tr>
                  <th className="text-left p-2">Antibiotic</th>
                  <th className="text-left p-2">Prediction</th>
                  <th className="text-left p-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.antibiotics.map((a, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="p-2">{a.name}</td>
                    <td className="p-2">{a.susceptible > a.resistant ? "Susceptible" : "Resistant"}</td>
                    <td className="p-2">{Math.max(a.susceptible, a.resistant)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`mt-3 text-xs ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>This report was generated by GenomeRx (local dev build).</div>
        </div>
      </div>

      {notesOpen && (
        <NotesModal
          theme={theme}
          initial={entry}
          onClose={()=>setNotesOpen(false)}
          onSave={(val)=>{
            setNotesMap(prev => ({ ...prev, [id]: val }));
            setNotesOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------- Notes Modal --------------------------- */
function NotesModal({ theme, initial, onSave, onClose }) {
  const [notes, setNotes] = useState(initial?.notes || "");
  const [tagsInput, setTagsInput] = useState((initial?.tags || []).join(", "));

  const save = () => {
    const tags = Array.from(new Set(tagsInput.split(",").map(t => t.trim()).filter(Boolean)));
    onSave({ notes: notes.trim(), tags });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className={`${cardClass(theme)} w-full max-w-lg`}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Notes & Tags</div>
          <button onClick={onClose} className={`text-sm px-2 py-1 rounded-md ${theme==="dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"}`}>Close</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Tags (comma-separated)</label>
            <input value={tagsInput} onChange={(e)=>setTagsInput(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="rounded-xl bg-slate-900 text-white py-2 px-4">Save</button>
            <button onClick={onClose} className={`rounded-xl border px-4 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- History (from API) --------------------------- */
function HistoryView({ theme, notesMap, setNotesMap }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // notes editor state for a row
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJSON(join(API_BASE, "/api/v1/history?limit=50"));
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setErr(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = items.filter(
    (i) =>
      i.pathogen.toLowerCase().includes(q.toLowerCase()) ||
      i.fileName.toLowerCase().includes(q.toLowerCase())
  );

  const rowId = (r) => `${r.fileName}|${r.date}`;
  const currentEntry = editId ? (notesMap[editId] || { notes:"", tags:[] }) : null;

  return (
    <div className={cardClass(theme)}>
      <div className="flex items-center justify-between">
        <div className="font-semibold">Prediction History</div>
        <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 ${theme==="dark" ? "border-slate-700" : ""}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pathogen or file"
            className={`outline-none text-sm ${theme==="dark" ? "bg-transparent" : ""}`}
          />
        </div>
      </div>

      {loading && <div className={`mt-4 text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>Loading history…</div>}
      {err && <div className="mt-4 text-sm text-rose-500">Failed to load history: {err}</div>}

      {!loading && !err && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={tableHeadClass(theme)}>
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Pathogen</th>
                <th className="text-left p-2">Genome</th>
                <th className="text-left p-2">Top 3</th>
                <th className="text-left p-2">Tags</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const id = rowId(r);
                const entry = notesMap[id] || { notes:"", tags:[] };
                return (
                  <tr key={`${r.fileName}-${r.date}-${i}`} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="p-2">{new Date(r.date).toLocaleString()}</td>
                    <td className="p-2">{r.pathogen}</td>
                    <td className="p-2">{r.fileName}</td>
                    <td className="p-2">{r.recommendations.map((a) => a.name).join(", ")}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {entry.tags?.map((t, j)=>(
                          <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full ${theme==="dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>{t}</span>
                        ))}
                        {(!entry.tags || entry.tags.length===0) && <span className={`${theme==="dark" ? "text-slate-400" : "text-slate-400"}`}>—</span>}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={pill(theme, !r.mdr)}>{r.mdr ? "MDR" : "OK"}</span>
                    </td>
                    <td className="p-2">
                      <button onClick={()=>setEditId(id)} className={`text-xs rounded-lg border px-2 py-1 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>Edit</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className={`p-4 ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editId && (
        <NotesModal
          theme={theme}
          initial={currentEntry}
          onClose={()=>setEditId(null)}
          onSave={(val)=>{
            setNotesMap(prev => ({ ...prev, [editId]: val }));
            setEditId(null);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------- NEW: Tasks (To-Do for Lab Staff) --------------------------- */

function TasksView({ theme, users, currentUser, tasks, setTasks }) {
  const labStaff = users.filter(u => u.role === "Lab Staff" && u.active !== false);
  const canAssign = currentUser.role !== "Lab Staff"; // Admin/Doctor/Researcher assign tasks
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState(currentUser.role === "Lab Staff" ? currentUser.email : "");
  const [statusFilter, setStatusFilter] = useState("");

  // filtered list by role:
  const visibleTasks = tasks.filter(t => {
    const roleGate = currentUser.role === "Lab Staff" ? t.assignee === currentUser.email : true; // lab staff see only their tasks
    const byAssignee = assigneeFilter ? t.assignee === assigneeFilter : true;
    const byStatus = statusFilter ? t.status === statusFilter : true;
    return roleGate && byAssignee && byStatus;
  });

  const canEditTask = (t) =>
    currentUser.role === "Admin" || (canAssign && t.createdBy === currentUser.email);

  const upsertTask = (task) => {
    if (task.id) {
      setTasks(prev => prev.map(x => (x.id === task.id ? { ...x, ...task, updatedAt: new Date().toISOString() } : x)));
    } else {
      const now = new Date().toISOString();
      setTasks(prev => [
        { ...task, id: String(Date.now()), createdAt: now, updatedAt: now, createdBy: currentUser.email },
        ...prev,
      ]);
    }
  };

  const removeTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateStatus = (id, status) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)));
  };

  const overdue = (t) => t.status !== "Done" && t.due && new Date(t.due) < new Date();

  return (
    <div className={cardClass(theme)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          <div className="font-semibold">
            {currentUser.role === "Lab Staff" ? "My Assigned Tasks" : "Lab Tasks"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAssign && (
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-1.5"
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className={`mt-4 grid md:grid-cols-3 gap-2 ${theme==="dark" ? "" : ""}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>Assignee</span>
          <select
            value={assigneeFilter}
            onChange={(e)=>setAssigneeFilter(e.target.value)}
            className={`rounded-xl border px-2 py-1 text-sm ${theme==="dark" ? "bg-slate-900 border-slate-700" : ""}`}
            disabled={currentUser.role === "Lab Staff"}
          >
            {currentUser.role === "Lab Staff" ? (
              <option value={currentUser.email}>Me</option>
            ) : (
              <>
                <option value="">All</option>
                {labStaff.map(ls => <option key={ls.email} value={ls.email}>{ls.name || ls.email}</option>)}
              </>
            )}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>Status</span>
          <select
            value={statusFilter}
            onChange={(e)=>setStatusFilter(e.target.value)}
            className={`rounded-xl border px-2 py-1 text-sm ${theme==="dark" ? "bg-slate-900 border-slate-700" : ""}`}
          >
            <option value="">All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Done</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className={tableHeadClass(theme)}>
            <tr>
              <th className="text-left p-2">Title</th>
              <th className="text-left p-2">Assignee</th>
              <th className="text-left p-2">Priority</th>
              <th className="text-left p-2">Due</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((t) => {
              const assignee = users.find(u => u.email === t.assignee);
              const priorityColor =
                t.priority === "High" ? "text-rose-600" :
                t.priority === "Medium" ? "text-amber-600" : "text-slate-500";
              const dueStr = t.due ? new Date(t.due).toLocaleDateString() : "—";
              return (
                <tr key={t.id} className="border-b border-slate-200 dark:border-slate-800">
                  <td className="p-2">
                    <div className="font-medium">{t.title}</div>
                    {t.description && <div className={`${theme==="dark" ? "text-slate-300" : "text-slate-600"}`}>{t.description}</div>}
                    <div className="text-[11px] opacity-70 mt-1">Created by {t.createdBy}</div>
                  </td>
                  <td className="p-2">{assignee?.name || assignee?.email || "—"}</td>
                  <td className={`p-2 ${priorityColor}`}>{t.priority}</td>
                  <td className="p-2">
                    <div className="inline-flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 opacity-70" /> {dueStr}
                    </div>
                    {overdue(t) && <div className="text-[11px] text-rose-500">Overdue</div>}
                  </td>
                  <td className="p-2">
                    {currentUser.role === "Lab Staff" ? (
                      <select
                        value={t.status}
                        onChange={(e)=>updateStatus(t.id, e.target.value)}
                        className={`rounded-lg border px-2 py-1 text-xs ${theme==="dark" ? "bg-slate-900 border-slate-700" : ""}`}
                      >
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Done</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        t.status === "Done"
                          ? (theme==="dark" ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-700")
                          : t.status === "In Progress"
                          ? (theme==="dark" ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700")
                          : (theme==="dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700")
                      }`}>{t.status}</span>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {canEditTask(t) && (
                        <>
                          <button
                            title="Edit"
                            onClick={()=>{ setEditing(t); setShowModal(true); }}
                            className={`rounded-md border px-2 py-1 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete"
                            onClick={()=>removeTask(t.id)}
                            className={`rounded-md border px-2 py-1 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {currentUser.role === "Lab Staff" && t.status !== "Done" && (
                        <button
                          title="Mark done"
                          onClick={()=>updateStatus(t.id, "Done")}
                          className="rounded-md bg-emerald-600 text-white px-2 py-1 text-xs hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5 inline-block mr-1" /> Done
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleTasks.length === 0 && (
              <tr>
                <td colSpan={6} className={`p-4 ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>No tasks.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TaskModal
          theme={theme}
          users={labStaff}
          initial={editing}
          onClose={()=>{ setShowModal(false); setEditing(null); }}
          onSave={(task)=>{
            upsertTask(task);
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TaskModal({ theme, users, initial, onSave, onClose }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [assignee, setAssignee] = useState(initial?.assignee || (users[0]?.email || ""));
  const [priority, setPriority] = useState(initial?.priority || "Medium");
  const [due, setDue] = useState(initial?.due ? initial.due.slice(0,10) : "");
  const [status, setStatus] = useState(initial?.status || "Pending");
  const [err, setErr] = useState("");

  const save = () => {
    setErr("");
    if (!title.trim()) { setErr("Title is required"); return; }
    if (!assignee) { setErr("Assignee is required"); return; }
    const payload = {
      id: initial?.id,
      title: title.trim(),
      description: description.trim(),
      assignee,
      priority,
      due: due ? new Date(due).toISOString() : "",
      status,
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className={`${cardClass(theme)} w-full max-w-lg`}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{initial ? "Edit Task" : "New Task"}</div>
          <button onClick={onClose} className={`text-sm px-2 py-1 rounded-md ${theme==="dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"}`}>Close</button>
        </div>
        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <textarea rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Assign to (Lab Staff)</label>
              <select value={assignee} onChange={(e)=>setAssignee(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`}>
                {users.length === 0 && <option value="">No Lab Staff available</option>}
                {users.map(u => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <select value={priority} onChange={(e)=>setPriority(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Due date</label>
              <input type="date" value={due} onChange={(e)=>setDue(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Status</label>
              <select value={status} onChange={(e)=>setStatus(e.target.value)} className={`w-full rounded-xl border px-3 py-2 ${theme==="dark" ? "bg-slate-950 border-slate-700" : ""}`}>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>
          </div>
          {err && <div className="text-sm text-rose-500">{err}</div>}
          <div className="flex gap-2">
            <button onClick={save} className="rounded-xl bg-slate-900 text-white py-2 px-4">{initial ? "Update" : "Create Task"}</button>
            <button onClick={onClose} className={`rounded-xl border px-4 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Admin --------------------------- */
function AdminView({ theme, items, users, setUsers, currentUser }) {
  const total = items.length;
  const mdr = items.filter((i) => i.mdr).length;
  const avg = avgConfidence(items);

  const [manageOpen, setManageOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const openManage = (u) => { setSelectedUser(u); setManageOpen(true); };
  const closeManage = () => { setManageOpen(false); setSelectedUser(null); };

  const resetPassword = (email) => {
    setUsers((prev) => prev.map(u => u.email === email ? { ...u, password: "Temp@123" } : u));
    alert("Password reset to Temp@123");
  };
  const toggleActive = (email) => {
    setUsers((prev) => prev.map(u => u.email === email ? { ...u, active: u.active === false ? true : false } : u));
  };

  const visibleUsers = users; // show all

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className={cardClass(theme, "p-6") + " lg:col-span-2"}>
        <div className="font-semibold">System Overview</div>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <StatCard theme={theme} icon={Activity} label="Total Analyses" value={total} />
          <StatCard theme={theme} icon={AlertTriangle} label="MDR Flags" value={mdr} />
          <StatCard theme={theme} icon={ShieldCheck} label="Avg Confidence" value={`${avg}%`} />
        </div>
        <div className={subCardClass(theme, "p-4 mt-4")}>
          <div className="font-semibold">Usage Trend</div>
          <div className={`text-sm mt-1 ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>Integrate real charts via API later.</div>
        </div>
      </div>

      <div className={cardClass(theme, "p-6")}>
        <div className="font-semibold">Users</div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 mt-2">
          {visibleUsers.map((u, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name || u.email}</div>
                <div className={`text-xs ${theme==="dark" ? "text-slate-400" : "text-slate-500"}`}>
                  {u.role} · {u.active === false ? "deactivated" : "active"}
                </div>
              </div>
              <button
                onClick={() => openManage(u)}
                className={`text-xs rounded-lg border px-2 py-1 ${theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}
              >
                Manage
              </button>
            </div>
          ))}
        </div>
      </div>

      {manageOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className={`${cardClass(theme)} w-full max-w-md`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Manage User</h3>
              <button onClick={closeManage} className={`text-sm px-2 py-1 rounded-md ${theme==="dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"}`}>Close</button>
            </div>
            <div className="space-y-2 text-sm">
              <div><b>Name:</b> {selectedUser?.name || selectedUser?.email}</div>
              <div><b>Email:</b> {selectedUser?.email}</div>
              <div><b>Role:</b> {selectedUser?.role}</div>
              <div><b>Status:</b> {selectedUser?.active === false ? "Deactivated" : "Active"}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => resetPassword(selectedUser.email)}
                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Reset Password
              </button>
              <button
                onClick={() => toggleActive(selectedUser.email)}
                className={`px-3 py-1.5 rounded-md border ${theme==="dark" ? "border-slate-700 bg-slate-900 hover:bg-slate-800" : "bg-white hover:bg-gray-50"}`}
              >
                {selectedUser?.active === false ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Helpers --------------------------- */
function fakeProgress(duration, set) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      set(p);
      if (p >= 100) return resolve();
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function isToday(iso) {
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}
function avgConfidence(items) {
  if (!items.length) return 0;
  const vals = items.map((i) => Math.max(...i.antibiotics.map((a) => a.susceptible)));
  return Math.round(vals.reduce((a, b) => a + b, 0) / items.length);
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}
