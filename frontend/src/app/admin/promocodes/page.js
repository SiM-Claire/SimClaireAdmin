"use client";

import { useState, useEffect, Fragment } from "react"; // 🌟 ADDED Fragment HERE
import { Tag, Plus, Trash2, Calendar, AlertCircle, Percent, DollarSign, X, ChevronDown, ChevronUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";

// --- Validation Schema ---
const promoSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").toUpperCase().trim(),
  discount_type: z.enum(["percentage", "flat"]),
  discount_value: z.coerce.number().min(0.1, "Value must be greater than 0"),
  max_discount: z.coerce.number().optional().or(z.literal("")),
  min_order_amount: z.coerce.number().optional().or(z.literal("")),
  usage_limit: z.coerce.number().min(1, "Must be at least 1"),
  user_usage_limit: z.coerce.number().min(1, "Must be at least 1"),
  valid_from: z.string().min(1, "Start date is required"),
  valid_until: z.string().min(1, "End date is required"),
  country_code: z.string().optional(),
  sim_type: z.coerce.number().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export default function AdminPromoCodes() {
  const adminToken = localStorage.getItem("adminToken");
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  
  // Tracks which promo code's details are expanded
  const [expandedRowId, setExpandedRowId] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      discount_type: "percentage",
      is_active: true,
      usage_limit: 500,
      user_usage_limit: 1,
    }
  });

  const selectedDiscountType = watch("discount_type");

  // --- 1. Fetch Existing Data ---
  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/promocode`, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
      // console.log(res.data)
      setPromoCodes(res.data.data)
      setLoading(false)
    } catch (err) {
      console.error("Failed to fetch promo codes", err);
      setLoading(false);
    }
  };

  // --- 2. Add Promo Code ---
  const onSubmit = async (data) => {
    setActionError("");
    
    // Clean up empty optional fields for the backend
    const payload = { ...data };
    if (!payload.max_discount) payload.max_discount = null;
    if (!payload.min_order_amount) payload.min_order_amount = null;
    if (!payload.country_code) payload.country_code = null;
    if (!payload.sim_type) payload.sim_type = null;

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/promocode`, payload, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
      // console.log(res.data)
      
      // Update UI with new code
      setPromoCodes(prev => [{ ...payload, id: res.data?.data?.id || Math.random() }, ...prev]);
      closeModal();
      
    } catch (err) {
      console.error("Backend Error:", err);
      setActionError(err.response?.data?.message || "Failed to create promo code.");
    }
  };

  // --- 3. Delete Promo Code ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this promo code? This cannot be undone.")) return;

    try {
      
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admin/promocode/${id}`, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
      setPromoCodes(prev => prev.filter(code => code.id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Failed to delete promo code.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  // Helper to format Date for table
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Toggle Row Expansion
  const toggleRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading Admin...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Tag className="text-[#ec5b13]" /> Promo Codes & Offers
            </h1>
            <p className="text-slate-500 mt-1">Create and manage discount codes for your customers.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all cursor-pointer shadow-md flex items-center gap-2"
          >
            <Plus size={18} /> Add Promo Code
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs uppercase tracking-wider">
                  <th className="p-5 font-semibold">Code</th>
                  <th className="p-5 font-semibold">Discount</th>
                  <th className="p-5 font-semibold">Used Count</th>
                  <th className="p-5 font-semibold">Validity</th>
                  <th className="p-5 font-semibold">Status</th>
                  <th className="p-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {promoCodes.length === 0 ? (
                  <tr><td colSpan="6" className="text-center p-8 text-gray-500">No promo codes found.</td></tr>
                ) : promoCodes.map((promo) => (
                  <Fragment key={promo.id}> {/* 🌟 CHANGED THIS TO Fragment 🌟 */}
                    {/* Main Row */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            {promo.code}
                          </span>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex items-center gap-1.5">
                          {promo.discount_type === "percentage" ? (
                            <span className="flex items-center text-[#ec5b13] font-bold bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                              {promo.discount_value}% OFF
                            </span>
                          ) : (
                            <span className="flex items-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                              ${promo.discount_value} OFF
                            </span>
                          )}
                        </div>
                        {promo.min_order_amount && <p className="text-xs text-gray-500 mt-1">Min. order: ${promo.min_order_amount}</p>}
                      </td>

                      <td className="p-5">
                        <p className="text-sm font-bold text-slate-700">{promo.used_count || 0} / {promo.usage_limit}</p>
                      </td>

                      <td className="p-5">
                        <div className="flex items-center gap-1.5 text-sm text-slate-700">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{formatDate(promo.valid_from)} - {formatDate(promo.valid_until)}</span>
                        </div>
                      </td>

                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${promo.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${promo.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                          {promo.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="p-5 flex justify-end gap-2">
                        <button 
                          onClick={() => toggleRow(promo.id)}
                          className="p-2 text-gray-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-sm font-medium"
                          title="View Details"
                        >
                          Details {expandedRowId === promo.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button 
                          onClick={() => handleDelete(promo.id)} 
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Code"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedRowId === promo.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="6" className="p-0 border-b border-gray-100">
                          <div className="p-6 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Discount Type</p>
                                <p className="font-bold text-slate-800 capitalize">{promo.discount_type}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Max Discount</p>
                                <p className="font-bold text-slate-800">{promo.max_discount ? `$${promo.max_discount}` : "No Limit"}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Min Order Amt</p>
                                <p className="font-bold text-slate-800">{promo.min_order_amount ? `$${promo.min_order_amount}` : "None"}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Per User Limit</p>
                                <p className="font-bold text-slate-800">{promo.user_usage_limit} Uses</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Valid From</p>
                                <p className="font-bold text-slate-800">{new Date(promo.valid_from).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Valid Until</p>
                                <p className="font-bold text-slate-800">{new Date(promo.valid_until).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Country Restrict</p>
                                <p className="font-bold text-slate-800">{promo.country_code || "Global (All)"}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SIM Type Restrict</p>
                                <p className="font-bold text-slate-800">{promo.sim_type || "All SIMs"}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment> /* 🌟 CLOSING FRAGMENT 🌟 */
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- ADD PROMO CODE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          
          <form 
            onSubmit={handleSubmit(onSubmit)} 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Create New Promo Code</h2>
                <p className="text-sm text-slate-500 mt-1">Configure discount rules and limits.</p>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {actionError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {actionError}
                </div>
              )}

              {/* 1. Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Promo Code <span className="text-red-500">*</span></label>
                  <input
                    {...register("code")}
                    placeholder="e.g. SUMMER20"
                    className="w-full px-4 py-2.5 font-mono uppercase bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] focus:ring-1 focus:ring-[#ec5b13] transition-all"
                  />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Discount Type</label>
                  <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${selectedDiscountType === 'percentage' ? 'bg-white shadow-sm text-slate-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                      <input type="radio" value="percentage" {...register("discount_type")} className="hidden" />
                      <Percent size={14}/> Percentage
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${selectedDiscountType === 'flat' ? 'bg-white shadow-sm text-slate-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                      <input type="radio" value="flat" {...register("discount_type")} className="hidden" />
                      <DollarSign size={14}/> Flat Amount
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Values & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Discount Value <span className="text-red-500">*</span></label>
                  <input
                    {...register("discount_value")}
                    type="number" step="0.01"
                    placeholder={selectedDiscountType === 'percentage' ? '20' : '10.00'}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Max Discount ($)</label>
                  <input
                    {...register("max_discount")}
                    type="number" step="0.01" placeholder="Optional"
                    disabled={selectedDiscountType === 'flat'}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] disabled:opacity-50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Min Order ($)</label>
                  <input
                    {...register("min_order_amount")}
                    type="number" step="0.01" placeholder="Optional"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* 3. Dates & Usage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Valid From <span className="text-red-500">*</span></label>
                  <input
                    {...register("valid_from")}
                    type="datetime-local"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Valid Until <span className="text-red-500">*</span></label>
                  <input
                    {...register("valid_until")}
                    type="datetime-local"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Total Usage Limit</label>
                  <input
                    {...register("usage_limit")}
                    type="number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Per-User Limit</label>
                  <input
                    {...register("user_usage_limit")}
                    type="number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* 4. Filters & Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Specific Country (Optional)</label>
                  <input
                    {...register("country_code")}
                    placeholder="e.g. US, JPN"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Specific SIM Type (Optional)</label>
                  <input
                    {...register("sim_type")}
                    type="number" placeholder="e.g. 1"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#ec5b13] transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register("is_active")} className="w-5 h-5 text-[#ec5b13] accent-[#ec5b13] rounded border-gray-300 focus:ring-[#ec5b13]" />
                  <span className="text-sm font-bold text-slate-700">Active Status</span>
                </label>
              </div>

            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
              <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-[#ec5b13] hover:bg-[#d94a0e] text-white rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-orange-500/20">
                {isSubmitting ? "Creating..." : "Save Promo Code"}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}