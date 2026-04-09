'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Edit2, Trash2, Power, PowerOff, Globe, 
  AlertCircle, CheckCircle2, Banknote, Percent, Search, Filter, 
  Infinity,
} from 'lucide-react';

// 🌟 Import your destination data
import { allDestinations } from '@/data/destinationData';
import { useRouter } from "next/navigation";

export default function TaxManagementCMS() {
  const router = useRouter()
  const adminToken = localStorage.getItem("adminToken");
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTaxData = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/tax-status`, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
      setCountries(res.data.data || res.data || []);
      setLoading(false);
    } catch (err) {
      router.push("/admin/login")
      setError('Failed to load tax configurations.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, []);

  const handleToggle = async (countryCode, currentStatus) => {
    const enteredPassword = window.prompt("Enter admin PIN to toggle this country's tax status. This cannot be undone:");
    
    if (enteredPassword !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
      alert("Incorrect PIN. Toggle cancelled.");
      return; // Stop execution entirely
    }
    try {
      setCountries(countries.map(c => 
        c.countryCode === countryCode ? { ...c, active: !currentStatus } : c
      ));
      
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/toggle-country`, { 
        countryCode, 
        isActive: !currentStatus 
      }, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
    } catch (err) {
      fetchTaxData();
      alert("Failed to toggle status.");
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    const enteredPassword = window.prompt("Enter admin PIN to update this country's tax rules. This cannot be undone:");
    
    if (enteredPassword !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
      alert("Incorrect PIN. Update cancelled.");
      return; // Stop execution entirely
    }


    const payload = {
      countryCode: editingCountry.countryCode,
      countryName: editingCountry.countryName,
      taxRate: Number(editingCountry.taxRate),
      thresholdAmount: editingCountry.threshold ? Number(editingCountry.threshold) : null,
      isEu: editingCountry.isEu,
      currency: editingCountry.thresholdCurrency,
      requiresTaxFromFirstSale: editingCountry.requiresTaxFromFirstSale,
      isActive: editingCountry.active
    };

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/update-tax-country`, payload, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
      
      setCountries((prevCountries) => {
        return prevCountries.map((country) => {
          if (country.countryCode === payload.countryCode) {
            
            // Recalculate percentage locally so UI updates instantly without refresh
            const newThreshold = editingCountry.threshold ? Number(editingCountry.threshold) : null;
            const newPercentage = newThreshold ? Math.round((country.rollingTotal / newThreshold) * 100) : 0;

            return { 
              ...country, 
              ...payload, 
              active: editingCountry.active,
              threshold: newThreshold,
              thresholdCurrency: editingCountry.thresholdCurrency,
              taxRate: Number(editingCountry.taxRate),
              percentageUsed: newPercentage // Update the progress bar instantly
            };
          }
          return country;
        });
      });      
      setIsEditModalOpen(false);
      setEditingCountry(null);
    } catch (err) {
      alert("Failed to update country rules.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter and Search Logic
  const filteredCountries = countries.filter(country => {
    const matchesSearch = 
      country.countryName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      country.countryCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ? true : 
      statusFilter === 'active' ? country.active : 
      !country.active;

    return matchesSearch && matchesStatus;
  });

  // Premium Progress Bar Color Logic
  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-400';
    return 'bg-emerald-500';
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading tax data...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax & Threshold Management</h1>
          <p className="text-sm text-slate-500">Monitor and update sales thresholds to maintain compliance.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search country..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand w-full sm:w-64"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand appearance-none cursor-pointer w-full sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4">Country</th>
                <th className="p-4">Tax Rate</th>
                <th className="p-4 w-72">Sales Threshold Limit</th>
                <th className="p-4">1st Sale Tax</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCountries.map((country) => {
                
                // 🌟 NEW: Find the matching region from the imported data
                const matchedDest = allDestinations.find(
                  (dest) => dest.isoCode === country.countryCode || dest.destinationID === country.countryCode
                );
                const regionName = matchedDest?.region || "Global";

                return (
                  <tr 
                    key={country.countryCode} 
                    className={`transition-all duration-200 ${country.active ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-60 grayscale-[30%]'}`}
                  >
                    {/* 🌟 UPDATED: Display Name, Code, EU Badge, and Region */}
                    <td className="p-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Globe size={18} className={country.active ? "text-brand" : "text-slate-400"} />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="font-bold">{country.countryName}</span> 
                          <span className="text-slate-400 ml-1">({country.countryCode})</span>
                          {country.isEu && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">EU</span>}
                        </div>
                        <span className="ml-2 text-[10px] bg-brand text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{regionName}</span>
                      </div>
                    </td>

                    <td className="p-4 text-slate-600 font-medium">
                      {country.taxRate}%
                    </td>
                    
                    <td className="p-4">
                      {country.threshold ? (
                        <div className="flex flex-col w-full max-w-[240px]">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="font-bold text-slate-800 text-sm leading-none">
                              {new Intl.NumberFormat().format(country.rollingTotal || 0)} <span className="text-slate-500 text-xs font-medium">{country.thresholdCurrency}</span>
                            </span>
                            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider leading-none">
                               of {new Intl.NumberFormat().format(country.threshold)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden relative">
                            <div 
                              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${getProgressBarColor(country.percentageUsed || 0)}`}
                              style={{ width: `${Math.min(country.percentageUsed || 0, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] font-bold text-slate-400">
                              {country.percentageUsed >= 90 ? (
                                 <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Approaching Limit {country.percentageUsed}%</span>
                              ) : `${country.percentageUsed || 0}% Used`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Infinity size={18} className="text-brand" />
                          <span className="italic text-xs font-medium">No Threshold Limit</span>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      {country.requiresTaxFromFirstSale ? (
                        <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold border border-orange-100">
                          <AlertCircle size={12} /> Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold border border-emerald-100">
                          <CheckCircle2 size={12} /> Exempt
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleToggle(country.countryCode, country.active)}
                        className={`p-1.5 rounded-md transition-colors ${country.active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        title={country.active ? 'Disable Country' : 'Enable Country'}
                      >
                        {country.active ? <PowerOff size={18} /> : <Power size={18} />}
                      </button>
                      <button 
                        onClick={() => { setEditingCountry(country); setIsEditModalOpen(true); }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit Rules"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredCountries.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">No countries match your search.</td>
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
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Edit Rules: {editingCountry.countryName}
              </h2>
            </div>
            
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
                <div className="relative">
                  <Percent size={16} className="absolute left-3 top-4 text-slate-400" />
                  <input 
                    type="number" step="0.01" required
                    value={editingCountry.taxRate}
                    onChange={(e) => setEditingCountry({...editingCountry, taxRate: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Threshold Amount ({editingCountry.thresholdCurrency || 'Local Currency'})
                </label>
                <div className="relative">
                  <Banknote size={16} className="absolute left-3 top-4 text-slate-400" />
                  <input 
                    type="number" step="0.01"
                    value={editingCountry.threshold || ''}
                    onChange={(e) => setEditingCountry({...editingCountry, threshold: e.target.value})}
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
                  type="checkbox" id="active"
                  checked={editingCountry.active}
                  onChange={(e) => setEditingCountry({...editingCountry, active: e.target.checked})}
                  className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
                />
                <label htmlFor="active" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Country is Active (Allow Sales)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-black transition-colors disabled:opacity-70 cursor-pointer"
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