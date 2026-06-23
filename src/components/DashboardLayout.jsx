import React, { useState } from 'react';
import useAuthStore from '../store/authStore';
import DashboardView from './DashboardView';
import ProfileView from './ProfileView';
import AttendanceView from './AttendanceView';
import LeaveView from './LeaveView';
import LeavingForm from './LeavingForm';
import { 
  LayoutDashboard, 
  User, 
  UserCheck, 
  Calendar, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  UserCircle
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, view: 'Dashboard' },
    { name: 'Profile Page', icon: <User className="h-5 w-5" />, view: 'Profile' },
    { name: 'My Attendance', icon: <UserCheck className="h-5 w-5" />, view: 'My Attendance' },
    { name: 'Leave', icon: <Calendar className="h-5 w-5" />, view: 'Leave' },
    { name: 'Resignation', icon: <FileText className="h-5 w-5" />, view: 'Resignation' },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardView user={user} setActiveTab={setActiveTab} />;
      case 'Profile':
        return <ProfileView user={user} />;
      case 'My Attendance':
        return <AttendanceView user={user} />;
      case 'Leave':
        return <LeaveView user={user} />;
      case 'Resignation':
        return <LeavingForm isDashboard={true} />; // pass isDashboard flag to strip fullscreen outer wrappers
      default:
        return <DashboardView user={user} setActiveTab={setActiveTab} />;
    }
  };

  const userName = user?.emp_name || user?.sales_person_name || user?.user_name || 'Employee';
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 flex relative overflow-hidden font-sans">
      
      {/* 1. Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Left Sidebar (Responsive Drawer) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between transform transition-transform duration-300 ease-in-out border-r border-slate-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:h-screen lg:flex-shrink-0`
      }>
        {/* Sidebar Header / Logo */}
        <div>
          <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-md">
                <img src="/Logo.PNG" alt="RBP Logo" className="object-contain max-h-full max-w-full" />
              </div>
              <div>
                <h2 className="font-black text-sm tracking-wide text-white uppercase">RBP Employee</h2>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider">Portal System</span>
              </div>
            </div>
            {/* Mobile close button */}
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 mt-4">
            {menuItems.map((item) => {
              const isActive = activeTab === item.view;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveTab(item.view);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 text-left
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/35 translate-x-1' 
                      : 'text-slate-350 hover:bg-slate-800/50 hover:text-white'
                    }`}
                >
                  <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                    {item.icon}
                  </div>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/30">
          <div className="flex items-center justify-between gap-3 p-2 bg-slate-800/30 rounded-xl border border-slate-800/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">{userName}</p>
                <span className="text-[10px] text-slate-400 capitalize font-medium tracking-wide">
                  {user?.role || 'Staff Member'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={logout} 
              title="Logout from portal"
              className="p-2 rounded-lg bg-slate-800/40 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800/50 hover:border-red-900/30 transition-all active:scale-95 flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Main Page Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 relative z-30 shadow-sm shadow-gray-100/10">
          {/* Left panel header */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 rounded-xl bg-gray-50 border border-gray-150 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div>
              <h2 className="text-base md:text-lg font-black text-gray-800 tracking-tight">
                {menuItems.find(item => item.view === activeTab)?.name || activeTab}
              </h2>
              <span className="text-[10px] md:text-xs text-gray-400 font-semibold tracking-wide hidden sm:inline">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Right panel widgets */}
          <div className="flex items-center gap-3">
            {/* Simple notification bell */}
            <button className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 border border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-gray-100 hidden sm:block"></div>

            {/* Quick Greeting */}
            <div className="items-center gap-2.5 hidden sm:flex">
              <span className="text-xs text-gray-400 font-semibold text-right">
                Authorized: <span className="text-gray-800 font-bold block">{userName}</span>
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Main Body Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
          <div className="max-w-6xl mx-auto pb-8">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
