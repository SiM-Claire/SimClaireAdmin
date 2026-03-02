"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Settings2, 
  Users, 
  LogOut, 
  Globe, 
  Activity,Tag
} from "lucide-react";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // localStorage.removeItem("adminToken");
    router.push("/login");
  };

  const menuItems = [
    { name: "Analytics", icon: <LayoutDashboard size={20} />, path: "/admin/analytics" },
    { name: "Pricing & Types", icon: <Settings2 size={20} />, path: "/admin/pricing" },
    { name: "Promo Codes & Offers", icon: <Tag size={20} />, path: "/admin/promocodes" },
    // { name: "Active Users & Orders", icon: <Users size={20} />, path: "/admin/users" },
    // { name: "Global Coverage", icon: <Globe size={20} />, path: "/admin/coverage" }, // Extra feature: Manage countries
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex fixed h-full z-10">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-[#ec5b13]" /> SiM Admin
          </h2>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link 
                key={item.name} 
                href={item.path}
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

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 relative min-h-screen">
        {children}
      </main>

    </div>
  );
}