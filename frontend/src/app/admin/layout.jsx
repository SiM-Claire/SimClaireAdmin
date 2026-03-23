"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Settings2, 
  Users, 
  LogOut, 
  Globe, 
  Activity,
  Landmark,
  Tag,
  Menu,
  X
} from "lucide-react";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // 🌟 State for mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    // localStorage.removeItem("adminToken");
    router.push("/login");
  };

  const menuItems = [
    { name: "Analytics", icon: <LayoutDashboard size={20} />, path: "/admin/analytics" },
    { name: "Pricing & Types", icon: <Settings2 size={20} />, path: "/admin/pricing" },
    { name: "Promo Codes & Offers", icon: <Tag size={20} />, path: "/admin/promocodes" },
    { name: "User History", icon: <Users size={20} />, path: "/admin/users" },
    { name: "Tax Management", icon: <Landmark size={20} />, path: "/admin/tax" },
    // { name: "Global Coverage", icon: <Globe size={20} />, path: "/admin/coverage" }, // Extra feature: Manage countries
  ];

  // Helper to close mobile menu on navigation
  const handleNavClick = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      
      {/* 🌟 Mobile Header (Visible only on small screens) 🌟 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Activity className="text-[#ec5b13]" size={24} /> 
          <span>SiM Admin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-slate-500 hover:text-[#ec5b13] transition-colors cursor-pointer outline-none"
        >
          <Menu size={26} />
        </button>
      </div>

      {/* 🌟 Mobile Backdrop Overlay 🌟 */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar (Responsive) */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-[#ec5b13]" /> SiM Admin
          </h2>
          {/* Close button for mobile inside the sidebar */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? "bg-[#3a7d71] text-white shadow-lg shadow-[#3a7d71]/20" 
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon} {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button 
            onClick={() => {
              handleNavClick();
              handleLogout();
            }}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut size={20} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      {/* 🌟 Added pt-16 on mobile to account for the fixed mobile header 🌟 */}
      <main className="flex-1 md:ml-64 relative min-h-screen pt-16 md:pt-0">
        {children}
      </main>

    </div>
  );
}