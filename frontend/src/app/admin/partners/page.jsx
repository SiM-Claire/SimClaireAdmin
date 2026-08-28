"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, Edit, CheckCircle, XCircle, Clock, 
  Users, FileText, Download, Globe2 
} from "lucide-react";
import axios from "axios";

export default function AdminPartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Partner Form State
  const [newPartner, setNewPartner] = useState({ email: "", partner_name: "", status: "PENDING" });

  // Safe admin token
  const adminToken = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  // Global Partner Export States
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportAllFromDate, setExportAllFromDate] = useState("");
  const [exportAllToDate, setExportAllToDate] = useState("");

  const handleExportAllPartnerSalesCSV = async () => {
    setIsExportingAll(true);
    try {
      if (!adminToken) {
        router.push("/admin/login");
        return;
      }

      const queryParams = {};
      if (exportAllFromDate) queryParams.from_date = exportAllFromDate;
      if (exportAllToDate) queryParams.to_date = exportAllToDate;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/reports/partner-sales/export`, 
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: queryParams,
          responseType: "blob",
        }
      );

      let fileName = `admin-partner-sales-export-${new Date().toISOString().split("T")[0]}.csv`;
      const contentDisposition = response.headers["content-disposition"];
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          fileName = matches[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Global Export failed:", err);
      alert("Failed to export all partner sales CSV. Please try again.");
    } finally {
      setIsExportingAll(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/partners`, {
        headers: {
          Authorization: `Bearer ${adminToken}` 
        }
      });
      
      if (res.data.status === 200) {
        setPartners(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch partners", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/partners`, newPartner, {
        headers: {
          Authorization: `Bearer ${adminToken}` 
        }
      });

      if (res.data.status === 201) {
        setIsModalOpen(false);
        setNewPartner({ email: "", partner_name: "", status: "PENDING" });
        fetchPartners();
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error creating partner";
      alert(errorMessage);
    }
  };

  const handleStatusChange = async (partnerId, newStatus) => {
    if (!confirm(`Change status to ${newStatus}?`)) return;
    try {
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/admin/partners/${partnerId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${adminToken}` 
          }
        }
      );

      if (res.data.status === 200) {
        fetchPartners();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error updating status";
      alert(errorMessage);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE": return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max"><CheckCircle size={14} /> Active</span>;
      case "PENDING": return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max"><Clock size={14} /> Pending</span>;
      case "SUSPENDED": return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max"><XCircle size={14} /> Suspended</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Partner Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage partner accounts, regional coverage, and catalog distribution.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#077770] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#065f59] transition-colors w-max cursor-pointer">
          <Plus size={18} /> Add New Partner
        </button>
      </div>

      {/* GLOBAL EXPORT CSV CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 py-4 my-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-full lg:w-130 h-max shrink-0">
        <div className="flex items-center gap-2 px-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">From</span>
            <input 
              type="date" 
              value={exportAllFromDate} 
              onChange={(e) => setExportAllFromDate(e.target.value)} 
              className="text-sm text-slate-700 bg-transparent outline-none font-medium cursor-pointer" 
            />
          </div>
          <span className="text-slate-300">-</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">To</span>
            <input 
              type="date" 
              value={exportAllToDate} 
              onChange={(e) => setExportAllToDate(e.target.value)} 
              min={exportAllFromDate} 
              className="text-sm text-slate-700 bg-transparent outline-none font-medium cursor-pointer" 
            />
          </div>
        </div>

        <button 
          onClick={handleExportAllPartnerSalesCSV} 
          disabled={isExportingAll} 
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#077770] text-white rounded-lg font-bold text-sm transition-all hover:bg-[#065f59] disabled:opacity-50 shadow-sm w-full sm:w-auto cursor-pointer"
        >
          {isExportingAll ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download size={16} />
          )}
          {isExportingAll ? "Exporting..." : "Export All Sales"}
        </button>
      </div>

      {/* PARTNER LIST TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <tr>
                <th className="p-4 font-bold">ID</th>
                <th className="p-4 font-bold">Partner Name</th>
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-medium">Loading partners...</td></tr>
              ) : partners.map(p => (
                <tr key={p.partner_access_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-slate-500 font-mono">#{p.partner_access_id}</td>
                  <td className="p-4 font-extrabold text-slate-800">
                    <Link 
                      href={`/admin/partners/${p.partner_access_id}/release`}
                      className="hover:text-[#077770] transition-colors"
                      title="Open Multi-Country Release Manager"
                    >
                      {p.partner_name}
                    </Link>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{p.email}</td>
                  <td className="p-4">{getStatusBadge(p.status)}</td>
                  
                  {/* Actions */}
                  <td className="p-4 flex gap-2 justify-end items-center flex-wrap">
                    <select
                      value=""
                      onChange={(e) => handleStatusChange(p.partner_access_id, e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-600 outline-none cursor-pointer hover:border-slate-300"
                    >
                      <option value="" disabled>Status...</option>
                      <option value="ACTIVE">Set Active</option>
                      <option value="PENDING">Set Pending</option>
                      <option value="SUSPENDED">Suspend</option>
                    </select>

                    {/* NEW: Multi-Country Release Center */}
                    <Link
                      href={`/admin/partners/${p.partner_access_id}/release`}
                      className="bg-teal-50 text-[#077770] border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 transition-colors"
                      title="Multi-Country Batch Release & Report"
                    >
                      <Globe2 size={14} /> Release Plans
                    </Link>

                    <Link
                      href={`/admin/partners/${p.partner_access_id}/profile`}
                      className="bg-orange-50 text-[#ec5b13] border border-orange-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-orange-100 transition-colors"
                      title="View Partner Profile"
                    >
                      <FileText size={14} /> Profile
                    </Link>

                    <Link
                      href={`/admin/partners/${p.partner_access_id}/customers`}
                      className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                      title="View End Customers"
                    >
                      <Users size={14} /> Customers
                    </Link>

                    <Link
                      href={`/admin/partners/${p.partner_access_id}`}
                      className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
                      title="Manage Individual Country Plans"
                    >
                      <Edit size={14} /> Per-Plan
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-slate-900 mb-4">Invite New Partner</h2>
            <form onSubmit={handleCreatePartner} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Company / Partner Name</label>
                <input required type="text" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#077770] focus:ring-2 focus:ring-[#077770]/20 font-medium" value={newPartner.partner_name} onChange={e => setNewPartner({ ...newPartner, partner_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Primary Email</label>
                <input required type="email" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#077770] focus:ring-2 focus:ring-[#077770]/20 font-medium" value={newPartner.email} onChange={e => setNewPartner({ ...newPartner, email: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#077770] text-white font-bold rounded-xl hover:bg-[#065f59] transition-colors shadow-sm">Create Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}