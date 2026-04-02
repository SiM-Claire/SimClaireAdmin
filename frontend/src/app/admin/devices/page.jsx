"use client"

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, Trash2, Smartphone, X, Loader2 } from "lucide-react";

const INITIAL_FORM_STATE = {
  brand_name: "",
  family_name: "",
  model_code: "",
  match_type: "exact",
  os: "iOS", // Defaulting to iOS
  min_os_version: "", // 🌟 Kept as empty string initially for better UX
  esim_supported: 1,
  active: 1,
  brand_active: 1,
  family_active: 1
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem("adminToken") : null;

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/device-phones`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setDevices(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Error fetching devices", err);
      alert("Failed to load devices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      // Keep input as string in state, only convert checkboxes instantly
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const openModal = (device = null) => {
    if (device) {
      setFormData({
        ...device,
        min_os_version: device.min_os_version || "" // Ensure nulls convert to empty string
      });
      setEditingId(device.id || device._id);
    } else {
      setFormData(INITIAL_FORM_STATE);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 🌟 Best Practice: Format data right before sending
    const payload = {
      ...formData,
      // Convert to float, or send 0 (or null) if it's left completely blank
      min_os_version: formData.min_os_version !== "" ? parseFloat(formData.min_os_version) : 0
    };

    try {
      if (editingId) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/admin/device-phones/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/device-phones`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
      }
      
      setIsModalOpen(false);
      fetchDevices();
    } catch (err) {
      console.error("Error saving device", err);
      alert("Failed to save device. Please check the inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this device?")) return;
    
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admin/device-phones/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchDevices();
    } catch (err) {
      console.error("Error deleting device", err);
      alert("Failed to delete device.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="text-brand" /> Device Compatibility
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage eSIM supported devices and rules</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-brand text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm cursor-pointer"
        >
          <Plus size={18} /> Add Device
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4">Brand</th>
                <th className="p-4">Family / Model</th>
                <th className="p-4">Match Type</th>
                <th className="p-4">OS / Min Ver.</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand" />
                    Loading devices...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">
                    No devices found. Add one to get started.
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id || device._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{device.brand_name}</td>
                    <td className="p-4">
                      <div>{device.family_name}</div>
                      <div className="text-xs text-slate-400">{device.model_code}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-mono">
                        {device.match_type}
                      </span>
                    </td>
                    <td className="p-4">
                      {device.os} 
                      {device.min_os_version > 0 && <span className="text-slate-400 ml-1">v{device.min_os_version}+</span>}
                    </td>
                    <td className="p-4 text-center">
                      {device.esim_supported === 1 
                        ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Supported</span>
                        : <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Unsupported</span>
                      }
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(device)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(device.id || device._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl my-auto flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? "Edit Device" : "Add New Device"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand Name</label>
                  <input type="text" name="brand_name" value={formData.brand_name} onChange={handleInputChange} required placeholder="e.g. Apple" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Family Name</label>
                  <input type="text" name="family_name" value={formData.family_name} onChange={handleInputChange} required placeholder="e.g. iPhone 15" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model Code</label>
                  <input type="text" name="model_code" value={formData.model_code} onChange={handleInputChange} required placeholder="e.g. iPhone" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Match Type</label>
                  <select name="match_type" value={formData.match_type} onChange={handleInputChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all bg-white cursor-pointer">
                    <option value="exact">Exact</option>
                    <option value="prefix">Prefix</option>
                  </select>
                </div>

                {/* 🌟 New OS Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operating System (OS)</label>
                  <select name="os" value={formData.os} onChange={handleInputChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all bg-white cursor-pointer">
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                  </select>
                </div>

                {/* 🌟 Min OS Version (Required ONLY if iOS is selected) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Min OS Version {formData.os !== "iOS" && <span className="text-slate-400 font-normal lowercase">(Optional)</span>}
                  </label>
                  <input 
                    type="text" 
                    name="min_os_version" 
                    value={formData.min_os_version} 
                    onChange={handleInputChange} 
                    required={formData.os === "iOS"} // React handles conditionally enforcing this!
                    placeholder="e.g. 17.0" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all" 
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="esim_supported" checked={formData.esim_supported === 1} onChange={handleInputChange} className="w-5 h-5 text-brand rounded focus:ring-brand accent-brand cursor-pointer" />
                  <span className="text-sm font-semibold text-slate-700">eSIM Supported</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="active" checked={formData.active === 1} onChange={handleInputChange} className="w-5 h-5 text-brand rounded focus:ring-brand accent-brand cursor-pointer" />
                  <span className="text-sm font-semibold text-slate-700">Device Active</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="brand_active" checked={formData.brand_active === 1} onChange={handleInputChange} className="w-5 h-5 text-brand rounded focus:ring-brand accent-brand cursor-pointer" />
                  <span className="text-sm font-semibold text-slate-700">Brand Active</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="family_active" checked={formData.family_active === 1} onChange={handleInputChange} className="w-5 h-5 text-brand rounded focus:ring-brand accent-brand cursor-pointer" />
                  <span className="text-sm font-semibold text-slate-700">Family Active</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Device"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}