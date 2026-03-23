'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Edit2, Trash2, Power, PowerOff, Globe, 
  AlertCircle, CheckCircle2, DollarSign, Percent 
} from 'lucide-react';

export default function TaxManagementCMS() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all countries on mount
  const fetchTaxData = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/tax-status`);
      // Assuming your API returns an array directly or inside a 'data' object
      setCountries(res.data.data || res.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load tax configurations.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, []);

  // Handle Enable/Disable Toggle
  const handleToggle = async (countryCode, currentStatus) => {
    try {
      // Optimistic UI update
      setCountries(countries.map(c => 
        c.countryCode === countryCode ? { ...c, isActive: !currentStatus } : c
      ));
      
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/toggle-country`, { 
        countryCode, 
        isActive: !currentStatus 
      });
    } catch (err) {
      // Revert on failure
      fetchTaxData();
      alert("Failed to toggle status.");
    }
  };

  // Handle Delete
  const handleDelete = async (countryCode) => {
    if (!window.confirm(`Are you sure you want to delete tax rules for ${countryCode}?`)) return;
    
    try {
      setCountries(countries.filter(c => c.countryCode !== countryCode));
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admin/delete-tax-country/${countryCode}`);
    } catch (err) {
      fetchTaxData();
      alert("Failed to delete country.");
    }
  };

  // Handle Update Submit
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    const payload = {
      countryCode: editingCountry.countryCode,
      taxRate: Number(editingCountry.taxRate),
      thresholdAmount: editingCountry.thresholdAmount ? Number(editingCountry.thresholdAmount) : null,
      requiresTaxFromFirstSale: editingCountry.requiresTaxFromFirstSale,
      isActive: editingCountry.isActive
    };

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/update-tax-country`, payload);
      
      // Update local state
      setCountries(countries.map(c => 
        c.countryCode === payload.countryCode ? { ...c, ...payload } : c
      ));
      
      setIsEditModalOpen(false);
      setEditingCountry(null);
    } catch (err) {
      alert("Failed to update country rules.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading tax data...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax & Threshold Management</h1>
          <p className="text-sm text-slate-500">Monitor and update sales thresholds to maintain compliance.</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4">Country</th>
                <th className="p-4">Tax Rate</th>
                <th className="p-4">Sales Threshold</th>
                <th className="p-4">1st Sale Tax</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {countries.map((country) => (
                <tr key={country.countryCode} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900 flex items-center gap-2">
                    <Globe size={16} className="text-slate-400" />
                    {country.countryName} ({country.countryCode})
                  </td>
                  <td className="p-4 text-slate-600">
                    {country.taxRate}%
                  </td>
                  <td className="p-4 text-slate-600">
                    {country.thresholdAmount 
                      ? `${new Intl.NumberFormat().format(country.thresholdAmount)} ${country.currency}`
                      : <span className="text-slate-400 italic">No Threshold</span>
                    }
                  </td>
                  <td className="p-4">
                    {country.requiresTaxFromFirstSale ? (
                      <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold">
                        <AlertCircle size={12} /> Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
                        <CheckCircle2 size={12} /> Exempt
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                      country.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {country.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4 flex items-center justify-end gap-3">
                    <button 
                      onClick={() => handleToggle(country.countryCode, country.isActive)}
                      className={`p-1.5 rounded-md transition-colors ${country.isActive ? 'text-orange-500 hover:bg-orange-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      title={country.isActive ? 'Disable Country' : 'Enable Country'}
                    >
                      {country.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>
                    <button 
                      onClick={() => { setEditingCountry(country); setIsEditModalOpen(true); }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit Rules"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(country.countryCode)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Country"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {countries.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No countries configured yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingCountry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                Edit Rules: {editingCountry.countryName}
              </h2>
            </div>
            
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
                <div className="relative">
                  <Percent size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="number" step="0.01" required
                    value={editingCountry.taxRate}
                    onChange={(e) => setEditingCountry({...editingCountry, taxRate: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Threshold Amount ({editingCountry.currency})</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="number" step="0.01"
                    value={editingCountry.thresholdAmount || ''}
                    onChange={(e) => setEditingCountry({...editingCountry, thresholdAmount: e.target.value})}
                    placeholder="Leave blank for no threshold"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">If blank, sales will process indefinitely.</p>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" id="firstSale"
                  checked={editingCountry.requiresTaxFromFirstSale}
                  onChange={(e) => setEditingCountry({...editingCountry, requiresTaxFromFirstSale: e.target.checked})}
                  className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
                />
                <label htmlFor="firstSale" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Requires Tax from First Sale
                </label>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" id="isActive"
                  checked={editingCountry.isActive}
                  onChange={(e) => setEditingCountry({...editingCountry, isActive: e.target.checked})}
                  className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Country is Active (Allow Sales)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-black transition-colors disabled:opacity-70"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}