"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  RefreshCw,
  Globe,
  Server,
  ListFilter,
  CheckCircle2,
  X,
  Bug,
  TrendingUp,
  Zap,
  Cpu,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

const TABS = [
  { key: "overview", label: "Overview", icon: <Gauge size={16} /> },
  { key: "activity", label: "Activity Feed", icon: <Activity size={16} /> },
  { key: "errors", label: "Errors", icon: <Bug size={16} /> },
  {
    key: "security",
    label: "Security Events",
    icon: <ShieldAlert size={16} />,
  },
];

const FILTERS = [
  { label: "All Time", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

// ---------- Helpers ----------
// The list endpoints may wrap rows differently; dig out the first array we find.
const toRows = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  const candidates = [
    d?.data, d?.rows, d?.items, d?.results, d?.logs, d?.events, d?.errors,
    d?.data?.data, d?.data?.rows, d?.data?.items, d?.data?.results,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  // Last resort: first array-valued property anywhere in data/data.data
  for (const obj of [d, d?.data]) {
    if (obj && typeof obj === "object") {
      const arr = Object.values(obj).find((v) => Array.isArray(v));
      if (arr) return arr;
    }
  }
  return [];
};

const toMeta = (res) => res?.data?.meta ?? res?.data?.data?.meta ?? null;

const formatTime = (d) => {
  if (!d) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(d));
};

const severityBadge = (sev) => {
  switch ((sev || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "ERROR":
      return "bg-red-100 text-red-700 border-red-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "WARNING":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "LOW":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const methodBadge = (m) => {
  switch (m) {
    case "GET":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "POST":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "PUT":
    case "PATCH":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "DELETE":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const statusBadge = (code) => {
  if (!code) return "bg-slate-100 text-slate-500 border-slate-200";
  if (code >= 200 && code < 300)
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (code >= 300 && code < 400)
    return "bg-blue-100 text-blue-700 border-blue-200";
  if (code >= 400 && code < 500)
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (code >= 500) return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const titleCase = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function MonitoringDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState("all");

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const client = useCallback(
    (extra = {}) => ({
      headers: { Authorization: `Bearer ${getToken()}` },
      ...extra,
    }),
    [],
  );

  const onAuthError = (err) => {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      router.push("/admin/login");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Server className="text-[#ec5b13]" /> System Monitoring
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Server errors, request activity, and suspicious-activity detection.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border-r border-slate-100 last:border-0 ${
                  filter === f.value
                    ? "bg-[#077770] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          filter={filter}
          client={client}
          onAuthError={onAuthError}
        />
      )}
      {tab === "activity" && (
        <ActivityTab
          filter={filter}
          client={client}
          onAuthError={onAuthError}
        />
      )}
      {tab === "errors" && (
        <ErrorsTab filter={filter} client={client} onAuthError={onAuthError} />
      )}
      {tab === "security" && (
        <SecurityTab
          filter={filter}
          client={client}
          onAuthError={onAuthError}
        />
      )}
    </div>
  );
}

// ======================================================================
// OVERVIEW
// ======================================================================
function OverviewTab({ filter, client, onAuthError }) {
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, hl] = await Promise.all([
        axios.get(
          `${API}/admin/monitoring/overview?filter=${filter}`,
          client(),
        ),
        axios.get(`${API}/admin/monitoring/health`, client()),
      ]);
      setOverview(ov.data?.data ?? ov.data ?? null);
      setHealth(hl.data?.data ?? hl.data ?? null);
    } catch (err) {
      onAuthError(err);
      console.error("overview load failed", err);
    } finally {
      setLoading(false);
    }
  }, [filter, client]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !overview) return <Loader label="Loading system overview…" />;

  // The overview payload shape can vary; render it defensively.
  const sections =
    overview && typeof overview === "object" ? Object.entries(overview) : [];
  const dropped = Number(health?.dropped ?? health?.buffer?.dropped ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RefreshButton onClick={load} loading={loading} />
      </div>

      {/* Writer health banner */}
      {health && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            dropped > 0
              ? "bg-red-50 border-red-200"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          {dropped > 0 ? (
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
          ) : (
            <CheckCircle2
              className="text-emerald-600 shrink-0 mt-0.5"
              size={20}
            />
          )}
          <div className="text-sm">
            <p
              className={`font-bold ${dropped > 0 ? "text-red-800" : "text-emerald-800"}`}
            >
              {dropped > 0
                ? `Activity feed has gaps — ${dropped} row(s) dropped. Data is NOT complete.`
                : "Monitoring writer healthy — no dropped rows."}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {Object.entries(health)
                .filter(([, v]) => typeof v !== "object")
                .map(([k, v]) => `${k}: ${v}`)
                .join("  ·  ")}
            </p>
          </div>
        </div>
      )}

      {/* Generic, defensive rendering of the overview payload */}
      {sections.length === 0 ? (
        <EmptyState
          icon={<Gauge className="w-10 h-10 text-slate-300" />}
          text="No overview data available."
        />
      ) : (
        sections.map(([key, value]) => (
          <OverviewSection key={key} title={titleCase(key)} value={value} />
        ))
      )}
    </div>
  );
}

function OverviewSection({ title, value }) {
  // Number / string => single stat
  if (value === null || typeof value !== "object") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={title} value={String(value ?? "—")} />
      </div>
    );
  }

  // Array => compact table
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const cols =
      typeof value[0] === "object" ? Object.keys(value[0]) : ["value"];
    return (
      <Panel
        title={title}
        icon={<TrendingUp size={16} className="text-[#077770]" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                {cols.map((c) => (
                  <th key={c} className="py-2 pr-6">
                    {titleCase(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {value.map((row, i) => (
                <tr key={i} className="text-slate-700">
                  {cols.map((c) => (
                    <td key={c} className="py-2 pr-6 font-mono text-xs">
                      {typeof row === "object"
                        ? String(row[c] ?? "—")
                        : String(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  }

  // Object => grid of stat cards
  const entries = Object.entries(value);
  return (
    <Panel title={title} icon={<Cpu size={16} className="text-[#077770]" />}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {entries.map(([k, v]) => (
          <StatCard
            key={k}
            title={titleCase(k)}
            value={typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
            small
          />
        ))}
      </div>
    </Panel>
  );
}

// ======================================================================
// ACTIVITY FEED
// ======================================================================
function ActivityTab({ filter, client, onAuthError }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: "50",
      });
      if (query) params.set("search", query);
      const res = await axios.get(
        `${API}/admin/monitoring/activity?${params}`,
        client(),
      );
      setRows(toRows(res));
      setMeta(toMeta(res));
    } catch (err) {
      onAuthError(err);
      console.error("activity load failed", err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, query, client]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  return (
    <div className="space-y-4">
      <Toolbar
        search={search}
        setSearch={setSearch}
        onSubmit={() => setQuery(search)}
        onRefresh={load}
        loading={loading}
        placeholder="Search actor, route, request id…"
      />

      <TableShell
        loading={loading}
        empty={rows.length === 0}
        emptyIcon={<Activity className="w-10 h-10 text-slate-300" />}
        emptyText="No activity logged for this period."
        head={
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
            <th className="p-4 pl-6">Actor</th>
            <th className="p-4">Route</th>
            <th className="p-4 text-center">Status</th>
            <th className="p-4 text-center">Duration</th>
            <th className="p-4">IP</th>
            <th className="p-4 pr-6 text-right">Time</th>
          </tr>
        }
        colSpan={6}
      >
        {rows.map((r, i) => (
          <tr
            key={r.id || r.request_id || i}
            className="hover:bg-slate-50/50 transition-colors"
          >
            <td className="p-4 pl-6">
              <div className="font-semibold text-slate-900 text-sm">
                {r.actor_email || r.actor_type || "—"}
              </div>
              <div className="text-[11px] text-slate-400">
                {r.action || r.actor_type || ""}
              </div>
            </td>
            <td className="p-4">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 border rounded text-[10px] font-bold ${methodBadge(r.method)}`}
                >
                  {r.method || "—"}
                </span>
                <span
                  className="font-mono text-xs text-slate-600 truncate max-w-[260px]"
                  title={r.route}
                >
                  {r.route || "—"}
                </span>
              </div>
            </td>
            <td className="p-4 text-center">
              <span
                className={`px-2.5 py-1 border rounded-full text-[11px] font-bold ${statusBadge(r.status_code)}`}
              >
                {r.status_code || "—"}
              </span>
            </td>
            <td className="p-4 text-center font-mono text-xs text-slate-600">
              {r.duration_ms != null ? `${r.duration_ms} ms` : "—"}
            </td>
            <td className="p-4 font-mono text-xs text-slate-600 flex items-center gap-1.5">
              <Globe size={12} className="text-slate-400" />
              {r.ip_address || "—"}
            </td>
            <td className="p-4 pr-6 text-right text-xs font-semibold text-slate-700">
              {formatTime(r.created_at || r.timestamp)}
            </td>
          </tr>
        ))}
      </TableShell>

      <Pagination
        meta={meta}
        page={page}
        setPage={setPage}
        count={rows.length}
      />
    </div>
  );
}

// ======================================================================
// ERRORS
// ======================================================================
function ErrorsTab({ filter, client, onAuthError }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [resolved, setResolved] = useState(""); // "", "true", "false"
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: "50",
      });
      if (query) params.set("search", query);
      if (severity) params.set("severity", severity);
      if (resolved) params.set("is_resolved", resolved);
      const res = await axios.get(
        `${API}/admin/monitoring/errors?${params}`,
        client(),
      );
      setRows(toRows(res));
      setMeta(toMeta(res));
    } catch (err) {
      onAuthError(err);
      console.error("errors load failed", err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, query, severity, resolved, client]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [filter, query, severity, resolved]);

  return (
    <div className="space-y-4">
      <Toolbar
        search={search}
        setSearch={setSearch}
        onSubmit={() => setQuery(search)}
        onRefresh={load}
        loading={loading}
        placeholder="Search message, route, reference, SQL…"
      >
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer outline-none"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="ERROR">Error</option>
          <option value="WARNING">Warning</option>
        </select>
        <select
          value={resolved}
          onChange={(e) => setResolved(e.target.value)}
          className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer outline-none"
        >
          <option value="">All</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
      </Toolbar>

      <TableShell
        loading={loading}
        empty={rows.length === 0}
        emptyIcon={<Bug className="w-10 h-10 text-slate-300" />}
        emptyText="No errors logged for this period."
        head={
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
            <th className="p-4 pl-6">Severity</th>
            <th className="p-4">Error</th>
            <th className="p-4">Route</th>
            <th className="p-4 text-center">Status</th>
            <th className="p-4 text-center">Resolved</th>
            <th className="p-4 pr-6 text-right">Time</th>
          </tr>
        }
        colSpan={6}
      >
        {rows.map((r, i) => {
          const ref = r.error_ref || r.reference || r.id;
          const isResolved = r.is_resolved === 1 || r.is_resolved === true;
          return (
            <tr
              key={ref || i}
              onClick={() => setSelected(r)}
              className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
            >
              <td className="p-4 pl-6">
                <span
                  className={`px-2.5 py-1 border rounded-full text-[10px] font-bold ${severityBadge(r.severity)}`}
                >
                  {r.severity || "—"}
                </span>
              </td>
              <td className="p-4">
                <div
                  className="font-semibold text-slate-900 text-sm truncate max-w-[260px]"
                  title={r.error_message || r.message}
                >
                  {r.error_name ||
                    r.error_message ||
                    r.message ||
                    "Unknown error"}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate max-w-[260px]">
                  {ref}
                </div>
              </td>
              <td className="p-4">
                <span
                  className="font-mono text-xs text-slate-600 truncate max-w-[200px] inline-block"
                  title={r.route}
                >
                  {r.route || "—"}
                </span>
              </td>
              <td className="p-4 text-center">
                <span
                  className={`px-2.5 py-1 border rounded-full text-[11px] font-bold ${statusBadge(r.status_code)}`}
                >
                  {r.status_code || "—"}
                </span>
              </td>
              <td className="p-4 text-center">
                {isResolved ? (
                  <CheckCircle2
                    size={18}
                    className="text-emerald-500 mx-auto"
                  />
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    OPEN
                  </span>
                )}
              </td>
              <td className="p-4 pr-6 text-right text-xs font-semibold text-slate-700">
                <span className="flex items-center justify-end gap-1.5">
                  {formatTime(r.created_at || r.timestamp)}
                  <Eye
                    size={13}
                    className="text-slate-300 group-hover:text-[#077770]"
                  />
                </span>
              </td>
            </tr>
          );
        })}
      </TableShell>

      <Pagination
        meta={meta}
        page={page}
        setPage={setPage}
        count={rows.length}
      />

      {selected && (
        <ErrorDetailModal
          row={selected}
          client={client}
          onAuthError={onAuthError}
          onClose={() => setSelected(null)}
          onResolved={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ErrorDetailModal({ row, client, onAuthError, onClose, onResolved }) {
  const ref = row.error_ref || row.reference || row.id;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API}/admin/monitoring/errors/${ref}`,
          client(),
        );
        if (active) setDetail(res.data?.data ?? res.data ?? row);
      } catch (err) {
        onAuthError(err);
        if (active) setDetail(row);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ref]);

  const resolve = async () => {
    setResolving(true);
    try {
      await axios.patch(
        `${API}/admin/monitoring/errors/${ref}/resolve`,
        { note },
        client(),
      );
      onResolved();
    } catch (err) {
      onAuthError(err);
      console.error("resolve failed", err);
      alert("Failed to resolve this error.");
    } finally {
      setResolving(false);
    }
  };

  const d = detail || row;
  const isResolved = d.is_resolved === 1 || d.is_resolved === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-1 border rounded-full text-[10px] font-bold ${severityBadge(d.severity)}`}
              >
                {d.severity || "—"}
              </span>
              <span
                className={`px-2.5 py-1 border rounded-full text-[11px] font-bold ${statusBadge(d.status_code)}`}
              >
                {d.status_code || "—"}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 truncate">
              {d.error_name || "Error Detail"}
            </h3>
            <p className="font-mono text-[11px] text-slate-400 truncate">
              {ref}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <Loader label="Loading error detail…" />
          ) : (
            <>
              <Field
                label="Message"
                value={d.error_message || d.message}
                mono
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Route" value={d.route} mono />
                <Field label="Method" value={d.method} />
                <Field label="Actor" value={d.actor_email || d.actor_type} />
                <Field label="IP Address" value={d.ip_address} mono />
                <Field label="Request ID" value={d.request_id} mono />
                <Field
                  label="SQL Code"
                  value={d.sql_code || d.sql_message}
                  mono
                />
                <Field
                  label="Occurred"
                  value={formatTime(d.created_at || d.timestamp)}
                />
                <Field label="Resolved" value={isResolved ? "Yes" : "No"} />
              </div>
              {d.stack && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Stack Trace
                  </p>
                  <pre className="bg-slate-900 text-slate-100 text-[11px] p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-words max-h-64">
                    {d.stack}
                  </pre>
                </div>
              )}
              {d.request_body && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Request Body (redacted)
                  </p>
                  <pre className="bg-slate-100 text-slate-700 text-[11px] p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-words max-h-48">
                    {typeof d.request_body === "string"
                      ? d.request_body
                      : JSON.stringify(d.request_body, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {!isResolved && !loading && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex flex-col sm:flex-row gap-3">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Resolution note (optional)"
              className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-[#077770]"
            />
            <button
              onClick={resolve}
              disabled={resolving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#077770] text-white font-bold text-sm rounded-xl hover:bg-[#06605a] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resolving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Mark Resolved
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================================
// SECURITY EVENTS
// ======================================================================
function SecurityTab({ filter, client, onAuthError }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [ackState, setAckState] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: "50",
      });
      if (query) params.set("search", query);
      if (ackState) params.set("is_acknowledged", ackState);
      const res = await axios.get(
        `${API}/admin/monitoring/security-events?${params}`,
        client(),
      );
      setRows(toRows(res));
      setMeta(toMeta(res));
    } catch (err) {
      onAuthError(err);
      console.error("security load failed", err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, query, ackState, client]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [filter, query, ackState]);

  const acknowledge = async (id) => {
    setBusyId(id);
    try {
      await axios.patch(
        `${API}/admin/monitoring/security-events/${id}/acknowledge`,
        {},
        client(),
      );
      load();
    } catch (err) {
      onAuthError(err);
      console.error("acknowledge failed", err);
      alert("Failed to acknowledge this event.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar
        search={search}
        setSearch={setSearch}
        onSubmit={() => setQuery(search)}
        onRefresh={load}
        loading={loading}
        placeholder="Search event type, actor, IP…"
      >
        <select
          value={ackState}
          onChange={(e) => setAckState(e.target.value)}
          className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer outline-none"
        >
          <option value="">All</option>
          <option value="false">Unacknowledged</option>
          <option value="true">Acknowledged</option>
        </select>
      </Toolbar>

      <TableShell
        loading={loading}
        empty={rows.length === 0}
        emptyIcon={<ShieldAlert className="w-10 h-10 text-slate-300" />}
        emptyText="No security events detected. All quiet."
        head={
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
            <th className="p-4 pl-6">Event</th>
            <th className="p-4 text-center">Severity</th>
            <th className="p-4 text-center">Count</th>
            <th className="p-4">Actor / IP</th>
            <th className="p-4 pr-6 text-right">Last Seen</th>
            <th className="p-4 pr-6 text-right">Action</th>
          </tr>
        }
        colSpan={6}
      >
        {rows.map((r, i) => {
          const id = r.id || r.event_id || i;
          const acked = r.is_acknowledged === 1 || r.is_acknowledged === true;
          return (
            <tr key={id} className="hover:bg-slate-50/50 transition-colors">
              <td className="p-4 pl-6">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Zap size={13} className="text-[#ec5b13]" />
                  {r.event_type || "—"}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                  {r.description || r.detail || ""}
                </div>
              </td>
              <td className="p-4 text-center">
                <span
                  className={`px-2.5 py-1 border rounded-full text-[10px] font-bold ${severityBadge(r.severity)}`}
                >
                  {r.severity || "—"}
                </span>
              </td>
              <td className="p-4 text-center">
                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold font-mono">
                  {r.occurrence_count ?? 1}
                </span>
              </td>
              <td className="p-4">
                <div className="text-xs text-slate-700">
                  {r.actor_email || r.actor_type || "—"}
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Globe size={11} />
                  {r.ip_address || "—"}
                </div>
              </td>
              <td className="p-4 pr-6 text-right text-xs font-semibold text-slate-700">
                {formatTime(r.last_seen_at || r.updated_at || r.created_at)}
              </td>
              <td className="p-4 pr-6 text-right">
                {acked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 size={14} /> Acked
                  </span>
                ) : (
                  <button
                    onClick={() => acknowledge(id)}
                    disabled={busyId === id}
                    className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {busyId === id ? "…" : "Acknowledge"}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </TableShell>

      <Pagination
        meta={meta}
        page={page}
        setPage={setPage}
        count={rows.length}
      />
    </div>
  );
}

// ======================================================================
// Shared UI pieces
// ======================================================================
function Loader({ label }) {
  return (
    <div className="p-12 text-center text-slate-400">
      <Activity className="w-8 h-8 animate-pulse mx-auto mb-3 text-[#077770]" />
      {label}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="p-12 text-center text-slate-500 font-medium flex flex-col items-center bg-white rounded-2xl border border-slate-200">
      <div className="mb-3">{icon}</div>
      {text}
    </div>
  );
}

function RefreshButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
      title="Refresh"
    >
      <RefreshCw
        size={18}
        className={loading ? "animate-spin text-[#077770]" : ""}
      />
    </button>
  );
}

function Toolbar({
  search,
  setSearch,
  onSubmit,
  onRefresh,
  loading,
  placeholder,
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white border border-slate-200 rounded-2xl p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100"
      >
        <Search size={16} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none text-slate-700"
        />
      </form>
      {children}
      <button
        onClick={onSubmit}
        className="px-4 py-2 bg-[#077770] text-white text-xs font-bold rounded-xl hover:bg-[#06605a] transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <ListFilter size={14} /> Apply
      </button>
      <RefreshButton onClick={onRefresh} loading={loading} />
    </div>
  );
}

function TableShell({
  loading,
  empty,
  emptyIcon,
  emptyText,
  head,
  colSpan,
  children,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>{head}</thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {loading && empty ? (
              <tr>
                <td colSpan={colSpan} className="p-0">
                  <Loader label="Loading…" />
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={colSpan}>
                  <div className="p-12 text-center text-slate-500 font-medium flex flex-col items-center">
                    <div className="mb-3">{emptyIcon}</div>
                    {emptyText}
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pagination({ meta, page, setPage, count }) {
  const totalPages = meta?.total_pages ?? 1;
  const total = meta?.total ?? count;
  const hasNext = meta?.has_next_page ?? page < totalPages;
  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-xs text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-800">{count}</span>
        {total ? (
          <>
            {" "}
            of <span className="font-bold text-slate-800">{total}</span>
          </>
        ) : null}{" "}
        · Page {page}
        {totalPages > 1 ? ` / ${totalPages}` : ""}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, small }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1 truncate">
        {title}
      </p>
      <p
        className={`font-extrabold text-slate-900 ${small ? "text-lg" : "text-2xl"} truncate`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p
        className={`text-sm text-slate-800 break-words ${mono ? "font-mono text-xs" : "font-semibold"}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}
