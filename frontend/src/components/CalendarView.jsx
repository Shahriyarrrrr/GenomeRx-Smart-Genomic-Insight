import React, { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, Clock, MapPin, Users as UsersIcon } from "lucide-react";

/** Local helpers copied to match your app’s look */
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
function Forbidden({ theme }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className={cardClass(theme)}>
        <div className="flex items-center gap-3 text-amber-600">
          <CalendarIcon className="w-5 h-5" />
          <div className="font-semibold">Forbidden</div>
        </div>
        <p className={`${theme==="dark" ? "text-slate-300" : "text-slate-600"} mt-2`}>
          You don't have permission to view this page.
        </p>
      </div>
    </div>
  );
}

/** Utilities */
const ROLES_CAN_USE = new Set(["Admin", "Doctor", "Researcher"]);
const fmtYMD = (d) => d.toISOString().slice(0,10);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Event modal */
function EventModal({ theme, users, initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [date, setDate] = useState(initial?.date || fmtYMD(new Date()));
  const [timeStart, setTimeStart] = useState(initial?.timeStart || "");
  const [timeEnd, setTimeEnd] = useState(initial?.timeEnd || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [attendees, setAttendees] = useState(initial?.attendees || []);
  const [desc, setDesc] = useState(initial?.description || "");
  const [err, setErr] = useState("");

  const toggleAttendee = (email) => {
    setAttendees((a) => a.includes(email) ? a.filter(e => e !== email) : [...a, email]);
  };

  const save = () => {
    setErr("");
    if (!title.trim()) { setErr("Title is required"); return; }
    if (!date) { setErr("Date is required"); return; }
    onSave({
      id: initial?.id,
      title: title.trim(),
      date,
      timeStart,
      timeEnd,
      location: location.trim(),
      attendees,
      description: desc.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className={`${cardClass(theme)} w-full max-w-xl`}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{initial ? "Edit Event" : "New Event"}</div>
          <button onClick={onClose}
            className={`text-sm px-2 py-1 rounded-md ${theme==="dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"}`}>
            Close
          </button>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 ${theme==="dark"?"bg-slate-950 border-slate-700":""}`} />
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 ${theme==="dark"?"bg-slate-950 border-slate-700":""}`} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Start</label>
              <input type="time" value={timeStart} onChange={(e)=>setTimeStart(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 ${theme==="dark"?"bg-slate-950 border-slate-700":""}`} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">End</label>
              <input type="time" value={timeEnd} onChange={(e)=>setTimeEnd(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 ${theme==="dark"?"bg-slate-950 border-slate-700":""}`} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Location</label>
            <input value={location} onChange={(e)=>setLocation(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 ${theme==="dark"?"bg-slate-950 border-slate-700":""}`} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Attendees (toggle)</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button key={u.email} type="button" onClick={()=>toggleAttendee(u.email)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    attendees.includes(u.email)
                      ? (theme==="dark" ? "bg-indigo-900/40 text-indigo-200 border-indigo-800" : "bg-indigo-50 text-indigo-700 border-indigo-200")
                      : (theme==="dark" ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50")
                  }`}>
                  {u.name || u.email}
                </button>
              ))}
              {users.length===0 && <div className="text-xs opacity-70">No users available</div>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea rows={3} value={desc} onChange={(e)=>setDesc(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 ${theme==="dark"?"bg-slate-950 border-slate-700":""}`} />
          </div>

          {err && <div className="text-sm text-rose-500">{err}</div>}

          <div className="flex gap-2">
            <button onClick={save} className="rounded-xl bg-slate-900 text-white py-2 px-4">{initial ? "Update" : "Create Event"}</button>
            <button onClick={onClose} className={`rounded-xl border px-4 ${theme==="dark"?"border-slate-700 hover:bg-slate-800":"hover:bg-slate-50"}`}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Month grid cell */
function DayCell({ theme, day, isOtherMonth, events, onAdd, onEdit }) {
  const ymd = fmtYMD(day);
  return (
    <div className={`min-h-[110px] border p-2 rounded-md ${theme==="dark"?"border-slate-800":"border-slate-200"} ${isOtherMonth ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium">{day.getDate()}</div>
        <button title="New event" onClick={() => onAdd(ymd)}
          className={`rounded-md p-1 ${theme==="dark"?"hover:bg-slate-800":"hover:bg-slate-100"}`}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {events.slice(0,3).map(ev => (
          <button key={ev.id} onClick={() => onEdit(ev)}
            className={`w-full text-left text-[11px] px-2 py-1 rounded ${theme==="dark"?"bg-slate-800 hover:bg-slate-700":"bg-slate-100 hover:bg-slate-200"}`}>
            <span className="font-medium">{ev.title}</span>
            {ev.timeStart && <span className="ml-1 opacity-70">({ev.timeStart}{ev.timeEnd?`–${ev.timeEnd}`:""})</span>}
          </button>
        ))}
        {events.length > 3 && <div className="text-[11px] opacity-60">+{events.length - 3} more</div>}
      </div>
    </div>
  );
}

/** Main Calendar view */
export default function CalendarView({ theme, users = [], currentUser, user, events, setEvents }) {
  const me = currentUser || user; // support either prop
  if (!me || !ROLES_CAN_USE.has(me.role)) return <Forbidden theme={theme} />;

  const [cursor, setCursor] = useState(() => new Date());
  const [modal, setModal] = useState(null); // {initial?, open:true}

  // Build month grid (Sun..Sat)
  const { days, monthStart, monthEnd } = useMemo(() => {
    const mStart = startOfMonth(cursor);
    const mEnd = endOfMonth(cursor);
    const gridStart = addDays(mStart, -((mStart.getDay()+7)%7)); // start from Sunday
    const total = 42; // 6 rows x 7 days
    const list = Array.from({ length: total }, (_, i) => addDays(gridStart, i));
    return { days: list, monthStart: mStart, monthEnd: mEnd };
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = {};
    (events || []).forEach(ev => {
      map[ev.date] ||= [];
      map[ev.date].push(ev);
    });
    return map;
  }, [events]);

  const upsertEvent = (payload) => {
    if (payload.id) {
      setEvents(prev => prev.map(e => e.id === payload.id ? { ...e, ...payload, updatedAt: new Date().toISOString() } : e));
    } else {
      const now = new Date().toISOString();
      setEvents(prev => [
        { ...payload, id: String(Date.now()), createdAt: now, updatedAt: now, createdBy: me.email },
        ...prev
      ]);
    }
  };
  const removeEvent = (id) => setEvents(prev => prev.filter(e => e.id !== id));

  const openNewForDay = (ymd) => setModal({ initial: { date: ymd }, open: true });
  const openEdit = (ev) => setModal({ initial: ev, open: true });

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  // Sidebar agenda (upcoming 10)
  const upcoming = useMemo(() => {
    const today = fmtYMD(new Date());
    return [...(events || [])]
      .filter(e => e.date >= today)
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [events]);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className={cardClass(theme, "p-4 lg:p-6") + " lg:col-span-2"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <div className="font-semibold">Calendar</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className={`px-2 py-1 rounded-md border ${theme==="dark"?"border-slate-700 hover:bg-slate-800":"hover:bg-slate-50"}`}>
              ←
            </button>
            <div className="text-sm font-medium">{monthLabel}</div>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className={`px-2 py-1 rounded-md border ${theme==="dark"?"border-slate-700 hover:bg-slate-800":"hover:bg-slate-50"}`}>
              →
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className={`text-xs font-medium text-center py-1 rounded ${theme==="dark"?"bg-slate-800":"bg-slate-100"}`}>{d}</div>
          ))}
          {days.map((day, i) => {
            const isOther = day < monthStart || day > monthEnd;
            const ymd = fmtYMD(day);
            const todays = eventsByDay[ymd] || [];
            return (
              <DayCell
                key={i}
                theme={theme}
                day={day}
                isOtherMonth={isOther}
                events={todays}
                onAdd={openNewForDay}
                onEdit={openEdit}
              />
            );
          })}
        </div>
      </div>

      <div className={cardClass(theme, "p-4 lg:p-6")}>
        <div className="font-semibold">Upcoming</div>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 && (
            <div className={`${theme==="dark"?"text-slate-400":"text-slate-500"} text-sm`}>No upcoming events.</div>
          )}
          {upcoming.map(ev => (
            <div key={ev.id} className={subCardClass(theme, "p-3")}>
              <div className="font-medium">{ev.title}</div>
              <div className={`text-xs mt-1 ${theme==="dark"?"text-slate-300":"text-slate-600"}`}>
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {ev.date}{ev.timeStart ? ` · ${ev.timeStart}${ev.timeEnd?`–${ev.timeEnd}`:""}`:""}
              </div>
              {ev.location && (
                <div className={`text-xs mt-1 ${theme==="dark"?"text-slate-300":"text-slate-600"}`}>
                  <MapPin className="w-3.5 h-3.5 inline mr-1" /> {ev.location}
                </div>
              )}
              {ev.attendees?.length > 0 && (
                <div className={`text-xs mt-1 ${theme==="dark"?"text-slate-300":"text-slate-600"}`}>
                  <UsersIcon className="w-3.5 h-3.5 inline mr-1" /> {ev.attendees.length} attendee(s)
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button onClick={()=>openEdit(ev)}
                  className={`rounded-md border px-2 py-1 text-xs ${theme==="dark"?"border-slate-700 hover:bg-slate-800":"hover:bg-slate-50"}`}>
                  <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                </button>
                <button onClick={()=>removeEvent(ev.id)}
                  className={`rounded-md border px-2 py-1 text-xs ${theme==="dark"?"border-slate-700 hover:bg-slate-800":"hover:bg-slate-50"}`}>
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Simple table of all events */}
        {events?.length > 0 && (
          <div className={subCardClass(theme, "p-0 mt-4 overflow-hidden")}>
            <div className={`p-3 border-b ${theme==="dark"?"bg-slate-800 border-slate-700":"bg-slate-50"}`}>
              <div className="font-semibold text-sm">All Events</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={tableHeadClass(theme)}>
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Title</th>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Attendees</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...events].sort((a,b)=>a.date.localeCompare(b.date)).map(ev => (
                    <tr key={ev.id} className={`border-b ${theme==="dark"?"border-slate-800":"border-slate-200"}`}>
                      <td className="p-2">{ev.date}</td>
                      <td className="p-2">{ev.title}</td>
                      <td className="p-2">{ev.timeStart || ev.timeEnd ? `${ev.timeStart || ""}${ev.timeEnd?`–${ev.timeEnd}`:""}` : "—"}</td>
                      <td className="p-2">{ev.location || "—"}</td>
                      <td className="p-2">{ev.attendees?.length ? ev.attendees.length : "—"}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button onClick={()=>openEdit(ev)}
                            className={`rounded-md border px-2 py-1 text-xs ${theme==="dark"?"border-slate-700 hover:bg-slate-800":"hover:bg-slate-50"}`}>
                            <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                          </button>
                          <button onClick={()=>removeEvent(ev.id)}
                            className={`rounded-md border px-2 py-1 text-xs ${theme==="dark"?"border-slate-700 hover:bg-slate-800":"hover:bg-slate-50"}`}>
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {events.length===0 && (
                    <tr><td colSpan={6} className="p-3 opacity-70">No events.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal?.open && (
        <EventModal
          theme={theme}
          users={users.filter(u => u.active !== false)}
          initial={modal.initial}
          onClose={()=>setModal(null)}
          onSave={(payload)=>{ upsertEvent(payload); setModal(null); }}
        />
      )}
    </div>
  );
}
