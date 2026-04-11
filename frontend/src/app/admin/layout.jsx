"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Settings2, Users, LogOut, 
  Landmark, Tag, Menu, X, Building2, Activity,Smartphone, Terminal,FileCode
} from "lucide-react";
import Image from "next/image";
export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 🌟 NEW: Loading state to prevent flashing the dashboard before redirecting
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 🌟 Route Guard Logic
  useEffect(() => {
    // If they are already on the login page, stop checking and let them render it
    if (pathname === "/admin/login") {
      setIsCheckingAuth(false);
      return;
    }

    // If they are trying to access a protected route, check for the token
    const adminToken = localStorage.getItem("adminToken");
    
    if (!adminToken) {
      router.push("/admin/login"); // Kick to login
    } else {
      setIsCheckingAuth(false); // Valid token found, let them see the dashboard
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/admin/login");
  };

  const menuItems = [
    { name: "Analytics", icon: <LayoutDashboard size={20} />, path: "/admin/analytics" },
    { name: "Pricing & Types", icon: <Settings2 size={20} />, path: "/admin/pricing" },
    { name: "Promo Codes & Offers", icon: <Tag size={20} />, path: "/admin/promocodes" },
    { name: "User History", icon: <Users size={20} />, path: "/admin/users" },
    { name: "Tax Management", icon: <Landmark size={20} />, path: "/admin/tax" },
    { name: "Enterprise", icon: <Building2 size={20} />, path: "/admin/enterprise" },
    { name: "Devices", icon: <Smartphone size={20} />, path: "/admin/devices" },
    { name: "User Logs", icon: <Terminal size={20} />, path: "/admin/logs" },
    { name: "Api Docs", icon: <FileCode size={20} />, path: "/admin/api-docs" },
  ];

  const handleNavClick = () => setIsMobileMenuOpen(false);

  // 🌟 Wait while checking auth to prevent UI flickering
  if (isCheckingAuth) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#ec5b13] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // 🌟 If on the login page, ONLY render the page content. No sidebar.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Otherwise, render the full protected Admin Dashboard Layout
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Activity className="text-[#ec5b13]" size={24} /> 
          <span>SiM Claire </span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-slate-500 hover:text-[#ec5b13] transition-colors cursor-pointer outline-none"
        >
          <Menu size={26} />
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
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
            <Image src="/logo2.png"
            width={40}
            height={40}
            alt="logo"/> SiM Claire
          </h2>
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
      <main className="flex-1 md:ml-64 relative min-h-screen pt-16 md:pt-0">
        {children}
      </main>

    </div>
  );
}