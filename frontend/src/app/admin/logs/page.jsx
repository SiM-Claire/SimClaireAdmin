"use client"

import { useState, useEffect } from "react";
import axios from "axios";
import { Terminal, Clock, Globe, ShieldAlert, Activity, RefreshCw, Smartphone, Monitor, Download } from "lucide-react";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limit, setLimit] = useState(50); // Default limit

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem("adminToken") : null;

  const fetchLogs = async (currentLimit) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/security/user-sessions?limit=${currentLimit}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      // Handle the data array based on your backend structure
      setLogs(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Error fetching logs", err);
      // alert("Failed to load security logs.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when the limit changes
  useEffect(() => {
    fetchLogs(limit);
  }, [limit]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchLogs(limit);
  };

  // 🌟 NEW: CSV Export Logic
  const exportToCSV = () => {
    if (logs.length === 0) return;

    // 1. Define the CSV Headers
    const headers = [
      "ID", 
      "Full Name", 
      "Email", 
      "IP Address", 
      "Last Method", 
      "Last Route", 
      "Status Code", 
      "Total Requests", 
      "User Agent", 
      "Last Used At", 
      "Created At"
    ];

    // 2. Map the log data to CSV rows
    const csvRows = logs.map(log => {
      return [
        log.id || "",
        `"${log.full_name || ""}"`, // Wrap in quotes in case of commas in names
        log.email || "",
        log.ip_address || "",
        log.last_method || "",
        log.last_route || "",
        log.last_status_code || "",
        log.request_count || 0,
        `"${(log.user_agent || "").replace(/"/g, '""')}"`, // Wrap in quotes and escape internal quotes
        log.last_used_at || "",
        log.created_at || ""
      ].join(",");
    });

    // 3. Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // 4. Create a Blob and trigger the browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Name the file dynamically based on today's date
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `SiM_Claire_Security_Logs_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format timestamps cleanly
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
  };

  // Helper to color-code HTTP methods
  const getMethodBadge = (method) => {
    switch (method) {
      case 'GET': return "bg-blue-100 text-blue-700 border-blue-200";
      case 'POST': return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case 'PUT': return "bg-amber-100 text-amber-700 border-amber-200";
      case 'DELETE': return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Helper to color-code HTTP Status Codes
  const getStatusBadge = (code) => {
    if (!code) return "bg-slate-100 text-slate-500";
    if (code >= 200 && code < 300) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (code >= 400 && code < 500) return "bg-amber-100 text-amber-700 border-amber-200"; 
    if (code >= 500) return "bg-red-100 text-red-700 border-red-200"; 
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  // Helper to detect basic device type from User-Agent
  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <Globe size={14} className="text-slate-400" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone size={14} className="text-slate-500" />;
    }
    return <Monitor size={14} className="text-slate-500" />;
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="text-brand" /> Security Logs & Activity
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time monitoring of user API requests and sessions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 🌟 NEW: CSV Export Button */}
          <button 
            onClick={exportToCSV}
            disabled={isLoading || logs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-opacity-90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin text-brand" : ""} />
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                <th className="p-4 pl-6">User Identity</th>
                <th className="p-4">Route Activity</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Requests</th>
                <th className="p-4">Network Info</th>
                <th className="p-4 pr-6 text-right">Last Used</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400">
                    <Activity className="w-8 h-8 animate-pulse mx-auto mb-3 text-brand" />
                    Fetching latest security logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500 font-medium flex flex-col items-center">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mb-3" />
                    No user session logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-slate-50/50 transition-colors group">
                    
                    {/* User Identity */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand/10 text-brand font-bold rounded-full flex items-center justify-center shrink-0 text-xs">
                          {log.full_name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-[120px]">
                          <div className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{log.full_name || "Unknown"}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{log.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Route Activity */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-bold tracking-wider ${getMethodBadge(log.last_method)}`}>
                          {log.last_method || "N/A"}
                        </span>
                        <span className="font-mono text-xs text-slate-600 truncate max-w-[200px]" title={log.last_route}>
                          {log.last_route || "Unknown Route"}
                        </span>
                      </div>
                    </td>

                    {/* Status Code */}
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 border rounded-full text-[11px] font-bold ${getStatusBadge(log.last_status_code)}`}>
                        {log.last_status_code || "---"}
                      </span>
                    </td>

                    {/* Requests Count */}
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold font-mono">
                        {log.request_count || 0}
                      </span>
                    </td>

                    {/* Network Info (IP & Device) */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="font-mono text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          {getDeviceIcon(log.user_agent)} {log.ip_address || "Unknown IP"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]" title={log.user_agent}>
                          {log.user_agent ? log.user_agent.split(" ")[0] : "Unknown Client"}
                        </div>
                      </div>
                    </td>

                    {/* Timestamps */}
                    <td className="p-4 pr-6 text-right">
                      <div className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        {formatTime(log.last_used_at)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Created: {formatTime(log.created_at)}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination / Limit Controls */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between mt-auto">
          <p className="text-xs text-slate-500 font-medium">
            Showing latest <span className="font-bold text-slate-800">{logs.length}</span> logs.
          </p>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Limit:</span>
            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              {[25, 50, 100, 200].map((num) => (
                <button
                  key={num}
                  onClick={() => setLimit(num)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border-r border-slate-100 last:border-0 ${
                    limit === num 
                      ? "bg-brand text-white" 
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}