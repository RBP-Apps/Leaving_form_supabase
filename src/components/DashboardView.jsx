import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  UserCheck, 
  Award, 
  Megaphone, 
  TrendingUp,
  ArrowRight,
  Sun,
  Coffee,
  CheckCircle
} from 'lucide-react';
import supabase from '../utils/supabase';

const DashboardView = ({ user, setActiveTab }) => {
  const userName = user?.emp_name;
  const [gender, setGender] = useState(user?.gender || user?.Gender || '');

  useEffect(() => {
    if (user?.gender || user?.Gender) {
      setGender(user.gender || user.Gender);
      return;
    }
    const fetchGender = async () => {
      if (!user) return;
      try {
        let query = supabase.from("joining").select("gender");
        if (user.employee_id) {
          query = query.eq("rbp_joining_id", user.employee_id);
        } else if (user.emp_name) {
          query = query.ilike("name_as_per_aadhar", `%${user.emp_name.trim()}%`);
        }
        const { data } = await query.maybeSingle();
        if (data?.gender) {
          setGender(data.gender);
        }
      } catch (err) {
        console.error("Error fetching gender:", err);
      }
    };
    fetchGender();
  }, [user]);

  const shiftTime = gender?.toLowerCase() === 'female' ? '09:30 AM - 06:00 PM' : '09:30 AM - 06:30 PM';

  // Get dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 17) return <Sun className="h-6 w-6 text-amber-500 animate-spin-slow" />;
    return <Coffee className="h-6 w-6 text-indigo-400" />;
  };

  const stats = [
    {
      title: 'Attendance Rate',
      value: '96.4%',
      desc: '22 Present | 1 Absent | 1 Leave',
      icon: <UserCheck className="h-6 w-6 text-emerald-600" />,
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      progress: 96.4,
    },
    {
      title: 'Remaining Leaves',
      value: '12 Days',
      desc: 'Earned: 5 | Casual: 4 | Medical: 3',
      icon: <Calendar className="h-6 w-6 text-blue-600" />,
      bg: 'bg-blue-50 text-blue-700 border-blue-100',
      progress: 60,
    },
    {
      title: 'Work Hours (Month)',
      value: '176 Hrs',
      desc: 'Target: 180 Hrs | 97.7% Met',
      icon: <Clock className="h-6 w-6 text-purple-600" />,
      bg: 'bg-purple-50 text-purple-700 border-purple-100',
      progress: 97.7,
    },
  ];

  const announcements = [
    {
      id: 1,
      title: 'RBP Employee Feedback Portal Launch',
      content: 'We are launching the new feedback and suggestion module for all personnel next Monday.',
      date: 'May 22, 2026',
      tag: 'New Feature',
      tagBg: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 2,
      title: 'Mandatory Security Compliance Training',
      content: 'All workers must complete the online workspace compliance safety module by May 30.',
      date: 'May 20, 2026',
      tag: 'Important',
      tagBg: 'bg-rose-100 text-rose-800',
    },
  ];

  const activities = [
    { time: '09:30 AM', action: 'Clocked In', desc: 'Checked in via Web Terminal', date: 'Today' },
    { time: '06:30 PM', action: 'Clocked Out', desc: 'Shift completed successfully', date: 'Yesterday' },
    { time: '09:28 AM', action: 'Clocked In', desc: 'Checked in via Mobile App', date: 'Yesterday' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mr-6 -mt-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute left-1/3 bottom-0 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getGreetingIcon()}
              <span className="text-sm font-semibold tracking-wide uppercase text-blue-100">
                {getGreeting()}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, <span className="text-red-400">{userName}</span>!
            </h1>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Always standard, always safe. Monitor your personal profiles, manage leaves, record your daily rosters, or submit necessary declarations seamlessly.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('Profile')}
            className="flex items-center justify-center gap-2 self-start md:self-auto bg-white text-blue-600 hover:bg-blue-50 px-5 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
          >
            <span>View Profile</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Roster & Quick Actions Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Roster Status */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Shift & Roster Details
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Active
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase block">Shift Time</span>
                <span className="text-base font-bold text-gray-800 mt-1 block">{shiftTime}</span>
                <span className="text-xs text-gray-400 mt-0.5 block">General Day Roster</span>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase block">Work Station</span>
                <span className="text-base font-bold text-gray-800 mt-1 block">
                  {user?.work_location || 'RBP HQ Office'}
                </span>
                <span className="text-xs text-gray-400 mt-0.5 block">Location Certified</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
            <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 px-4 rounded-xl shadow-sm transition-all text-center">
              Web Check-In
            </button>
            <button className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-3 px-4 rounded-xl transition-all text-center">
              Break Roster
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Quick Navigation
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => setActiveTab('My Attendance')}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/50 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-gray-800 text-sm block">Check Attendance Log</span>
                  <span className="text-xs text-gray-400">View punch details</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </button>

            <button 
              onClick={() => setActiveTab('Leave')}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/50 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-gray-800 text-sm block">Apply for Leaves</span>
                  <span className="text-xs text-gray-400">Request vacation or sick off</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </button>

            <button 
              onClick={() => setActiveTab('Resignation')}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-red-100 hover:bg-red-50/50 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-gray-800 text-sm block">Resignation Form</span>
                  <span className="text-xs text-gray-400">Submit leaving application</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-semibold text-gray-400 block">{stat.title}</span>
                <span className="text-2xl font-black text-gray-800 mt-2 block tracking-tight">{stat.value}</span>
              </div>
              <div className={`p-3 rounded-xl border ${stat.bg}`}>
                {stat.icon}
              </div>
            </div>
            
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    stat.title.includes('Attendance') ? 'bg-emerald-500' :
                    stat.title.includes('Leaves') ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${stat.progress}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 mt-2 block font-medium">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Announcements & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News & Bulletins */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-500" />
            Corporate Bulletins & News
          </h3>
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:bg-gray-50 transition-all flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${ann.tagBg}`}>
                      {ann.tag}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{ann.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">{ann.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{ann.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Activity Log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            Punch-In History
          </h3>
          <div className="relative pl-4 border-l border-gray-100 flex-1 space-y-6 py-2">
            {activities.map((act, i) => (
              <div key={i} className="relative">
                {/* Timeline node */}
                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-100"></div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-600">{act.time}</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{act.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 mt-1">{act.action}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">{act.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
