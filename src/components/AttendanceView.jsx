import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Moon,
  ChevronRight,
  TrendingUp,
  Clock,
  Fingerprint,
  Smartphone,
  Coffee,
  LogOut,
  MapPin,
  ExternalLink,
  Image as ImageIcon,
  Eye,
  ChevronDown,
  X,
  Database,
  Loader2
} from 'lucide-react';
import supabase from '../utils/supabase';
import toast from 'react-hot-toast';

// Helper Functions
const calculateDuration = (inTime, outTime) => {
  if (!inTime || !outTime) return "N/A";
  try {
    const [inHours, inMinutes] = inTime.split(":").map(Number);
    const [outHours, outMinutes] = outTime.split(":").map(Number);
    let totalMinutes = outHours * 60 + outMinutes - (inHours * 60 + inMinutes);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} hrs`;
  } catch (error) {
    return "N/A";
  }
};

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case "present":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Present
        </span>
      );
    case "absent":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-150 shadow-sm">
          <XCircle className="w-3.5 h-3.5" />
          Absent
        </span>
      );
    case "late":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-150 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5" />
          Late Punch
        </span>
      );
    case "half day":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-150 shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          Half Day
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-150 shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          Partial
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-slate-50 text-slate-700 border border-slate-150 shadow-sm">
          <Moon className="w-3.5 h-3.5" />
          {status || "Holiday"}
        </span>
      );
  }
};

const processBiometricAttendance = (data) => {
  if (!data) return [];
  const grouped = {};
  data.forEach(item => {
    if (!item.employee_id || !item.attendance_date) return;
    const empId = item.employee_id.toString().trim().toUpperCase();
    const attDate = item.attendance_date.toString().trim().split(" ")[0].split("T")[0];
    const key = `${empId}_${attDate}`;
    if (!grouped[key]) {
      grouped[key] = {
        item,
        empId,
        attDate,
        inTimes: [],
        outTimes: [],
        records: []
      };
    }
    grouped[key].records.push(item);
    if (item.in_time) grouped[key].inTimes.push(item.in_time);
    if (item.out_time) grouped[key].outTimes.push(item.out_time);
  });

  return Object.values(grouped).map(({ item, empId, attDate, inTimes, outTimes, records }) => {
    const allTimes = [];
    inTimes.forEach(t => { if (t && !allTimes.includes(t)) allTimes.push(t); });
    outTimes.forEach(t => { if (t && !allTimes.includes(t)) allTimes.push(t); });
    allTimes.sort((a, b) => a.localeCompare(b));

    let finalIn = null;
    let finalOut = null;

    if (allTimes.length === 1) {
      if (inTimes.length > 0) {
        finalIn = inTimes[0];
      } else if (outTimes.length > 0) {
        finalOut = outTimes[0];
      } else {
        finalIn = allTimes[0];
      }
    } else if (allTimes.length > 1) {
      finalIn = allTimes[0];
      finalOut = allTimes[allTimes.length - 1];
    }

    const isLate = item.late_calculation && parseFloat(item.late_calculation) < 0;

    return {
      type: "biometric",
      employee: item.employee_name,
      empIdCode: empId,
      employeeId: empId,
      date: attDate,
      year: item.year?.toString(),
      monthName: item.month_name,
      day: item.day_name,
      inTime: finalIn,
      outTime: finalOut,
      location: "Head Office",
      records: records,
      status: finalIn && finalOut
        ? (isLate ? "Late" : "Present")
        : finalIn || finalOut
          ? "Half Day"
          : "Absent",
      workingHour: item.working_hour,
      lateCalculation: item.late_calculation,
      lateCountsMorning: item.late_counts_morning,
      lateCountsEvening: item.late_counts_evening,
    };
  });
};

const AttendanceView = ({ user }) => {
  // Existing/New States
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showTodayData, setShowTodayData] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'biometric', 'field'

  const [biometricRecords, setBiometricRecords] = useState([]);
  const [fieldRecords, setFieldRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});


  // Generate dynamic list of last 6 months
  const months = useMemo(() => {
    const list = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      list.push(`${monthName} ${year}`);
      date.setMonth(date.getMonth() - 1);
    }
    return list;
  }, []);

  // Initialize selected month
  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  const fetchAttendance = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Biometric Punch for current user
      let bioQuery = supabase
        .from("offline_biometric_punch")
        .select("*")
        .order("attendance_date", { ascending: false });

      if (user.employee_id) {
        bioQuery = bioQuery.eq("employee_id", user.employee_id);
      } else {
        bioQuery = bioQuery.ilike("employee_name", `%${user.emp_name.trim()}%`);
      }

      // 2. Fetch Field Staff Attendance for current user
      let fieldQuery = supabase
        .from("attendance")
        .select("*")
        .order("date", { ascending: false })
        .order("time", { ascending: true });

      if (user.employee_id) {
        fieldQuery = fieldQuery.eq("employee_code", user.employee_id);
      } else {
        fieldQuery = fieldQuery.ilike("person_name", `%${user.emp_name.trim()}%`);
      }

      const [bioRes, fieldRes] = await Promise.all([bioQuery, fieldQuery]);

      if (bioRes.error) throw bioRes.error;
      if (fieldRes.error) throw fieldRes.error;

      // Process Biometric
      const processedBio = processBiometricAttendance(bioRes.data);

      // Process Field
      const processedFieldData = {};
      (fieldRes.data || []).forEach((rec) => {
        const key = `${rec.person_name}_${rec.date}`;
        if (!processedFieldData[key]) {
          processedFieldData[key] = {
            type: "field",
            employee: rec.person_name,
            empCode: rec.employee_code || rec.person_name,
            date: rec.date,
            records: [],
            inTime: null,
            midEntries: [],
            outTime: null,
            location: rec.address,
            city: rec.address?.split(",").slice(-3, -2)[0]?.trim() || "Unknown",
            images: rec.images,
            mapLink: rec.map_link,
            lat: rec.latitude,
            lng: rec.longitude,
            status: "Partial",
          };
        }

        processedFieldData[key].records.push(rec);

        if (rec.status === "IN" && !processedFieldData[key].inTime) {
          processedFieldData[key].inTime = rec.time;
        }
        if (rec.status === "OUT") {
          processedFieldData[key].outTime = rec.time;
        }
        if (rec.status === "MID") {
          processedFieldData[key].midEntries.push(rec.time);
        }
        if (rec.images) processedFieldData[key].images = rec.images;
        if (rec.map_link) processedFieldData[key].mapLink = rec.map_link;
        if (rec.address) processedFieldData[key].location = rec.address;
      });

      Object.values(processedFieldData).forEach((group) => {
        const hasIn = group.inTime !== null;
        const hasMid = group.midEntries.length > 0;
        const hasOut = group.outTime !== null;
        const entryCount = [hasIn, hasMid, hasOut].filter(Boolean).length;

        if (hasIn && hasMid && hasOut) {
          group.status = "Present";
        } else if (!hasIn && !hasMid && !hasOut) {
          group.status = "Absent";
        } else if (entryCount === 2) {
          group.status = "Half Day";
        } else {
          group.status = "Partial";
        }
      });

      setBiometricRecords(processedBio);
      setFieldRecords(Object.values(processedFieldData));
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user]);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filterByDate = useCallback((list) => {
    let result = [...list];
    if (showTodayData) {
      const todayDate = getTodayDate();
      result = result.filter((item) => item.date === todayDate);
    } else {
      if (startDate) {
        result = result.filter((item) => item.date >= startDate);
      }
      if (endDate) {
        result = result.filter((item) => item.date <= endDate);
      }
    }
    return result;
  }, [showTodayData, startDate, endDate]);

  const filterBySelectedMonth = useCallback((records) => {
    if (!selectedMonth) return records;
    const [monthName, yearStr] = selectedMonth.split(" ");
    const monthIndex = new Date(`${monthName} 1, ${yearStr}`).getMonth() + 1;
    const yearMonthPrefix = `${yearStr}-${monthIndex.toString().padStart(2, "0")}`;
    return records.filter((item) => item.date.startsWith(yearMonthPrefix));
  }, [selectedMonth]);

  // Merge, Tab, and Filter Data
  const filteredRecords = useMemo(() => {
    let records = [];
    if (activeTab === "all") {
      records = [...biometricRecords, ...fieldRecords];
    } else if (activeTab === "biometric") {
      records = biometricRecords;
    } else if (activeTab === "field") {
      records = fieldRecords;
    }

    if (showTodayData || startDate || endDate) {
      records = filterByDate(records);
    } else {
      records = filterBySelectedMonth(records);
    }

    // Sort by Date Descending
    records.sort((a, b) => b.date.localeCompare(a.date));
    return records;
  }, [activeTab, biometricRecords, fieldRecords, showTodayData, startDate, endDate, filterByDate, filterBySelectedMonth]);

  // Compute Dynamic Metrics
  const stats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalHours = 0;

    filteredRecords.forEach((rec) => {
      if (rec.status === "Present") {
        presentCount++;
      } else if (rec.status === "Late") {
        lateCount++;
        presentCount++;
      } else if (rec.status === "Half Day" || rec.status === "Partial") {
        halfDayCount++;
      } else if (rec.status === "Absent") {
        absentCount++;
      }

      if (rec.inTime && rec.outTime) {
        const durationStr = calculateDuration(rec.inTime, rec.outTime);
        if (durationStr !== "N/A") {
          const [h, m] = durationStr.split(" ")[0].split(":").map(Number);
          totalHours += h + m / 60;
        }
      }
    });

    return {
      present: presentCount,
      late: lateCount,
      halfDay: halfDayCount,
      absent: absentCount,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  }, [filteredRecords]);

  const toggleRowExpand = (index) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setShowTodayData(false);
    if (months.length > 0) {
      setSelectedMonth(months[0]);
    }
  };



  return (
    <div className="space-y-6">
      {/* Upper Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 block uppercase">Present Days</span>
            <span className="text-lg font-black text-gray-800 tracking-tight mt-0.5">
              {loading ? "--" : `${stats.present} Days`}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 block uppercase">Late Punching</span>
            <span className="text-lg font-black text-gray-800 tracking-tight mt-0.5">
              {loading ? "--" : `${stats.late} Times`}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 block uppercase">Half/Partial Days</span>
            <span className="text-lg font-black text-gray-800 tracking-tight mt-0.5">
              {loading ? "--" : `${stats.halfDay} Days`}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 block uppercase">Total Work Hours</span>
            <span className="text-lg font-black text-gray-800 tracking-tight mt-0.5">
              {loading ? "--" : `${stats.totalHours} hrs`}
            </span>
          </div>
        </div>
      </div>


      {/* Filters Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">

          {/* Dynamic Month Selector */}
          <div className="w-48">
            <label className="text-xs font-bold text-gray-500 block mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Select Month
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={showTodayData}
                className={`w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer ${showTodayData ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {months.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Date Picker Fields */}
          <div className="w-40">
            <label className="text-xs font-bold text-gray-500 block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> From Date
            </label>
            <input
              type="date"
              className={`w-full py-2 px-3 text-xs font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700 ${showTodayData ? "opacity-50 cursor-not-allowed" : ""
                }`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={showTodayData}
            />
          </div>

          <div className="w-40">
            <label className="text-xs font-bold text-gray-500 block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> To Date
            </label>
            <input
              type="date"
              className={`w-full py-2 px-3 text-xs font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700 ${showTodayData ? "opacity-50 cursor-not-allowed" : ""
                }`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={showTodayData}
            />
          </div>

          {/* Today Button */}
          <button
            onClick={() => setShowTodayData(!showTodayData)}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${showTodayData
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
          >
            <Calendar className="w-4 h-4" />
            Today's Logs
          </button>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>


        </div>
      </div>

      {/* Main Table Wrapper */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Attendance Record Sheets
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Review clock in, clock out, and total work hours per roster shift.
            </p>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-white">
                <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">S.No.</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 whitespace-nowrap">Date & Day</th>
                  <th className="px-6 py-4">Clock In</th>
                  <th className="px-6 py-4">Clock Out</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Punch Source</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 justify-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-gray-400 text-xs font-bold">Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center text-red-500 font-bold">
                      Error loading records: {error}
                    </td>
                  </tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((row, idx) => (
                    <React.Fragment key={`${row.type}_${row.date}_${idx}`}>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${row.type === "biometric"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                            {row.type === "biometric" ? "Biometric" : "Field Staff"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-bold text-gray-800">{row.date}</span>
                            <span className="text-xs text-gray-400 block font-medium mt-0.5">{row.day}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{row.inTime || "--:--"}</td>
                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{row.outTime || "--:--"}</td>
                        <td className="px-6 py-4 text-gray-800">{calculateDuration(row.inTime, row.outTime)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                          {row.type === "biometric" ? "Office Biometric" : "Field Device"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(row.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 max-w-[150px] truncate">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-600" title={row.location}>
                              {row.location || "Head Office"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.type === "field" && (
                            <button
                              onClick={() => toggleRowExpand(idx)}
                              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedRows[idx] ? "rotate-180 text-blue-600" : ""
                                }`} />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Field Visited Details Expanded Row */}
                      {expandedRows[idx] && row.type === "field" && (
                        <tr className="bg-gray-50/40">
                          <td colSpan="10" className="px-6 py-5 border-t border-b border-gray-100">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                  Field Visits Log details
                                </h4>
                                <span className="text-xs text-gray-400 font-semibold ml-auto">{row.date}</span>
                              </div>

                              {/* Timeline display */}
                              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                {row.records?.map((rec, recIdx) => (
                                  <div key={recIdx} className="relative pl-6 space-y-2">
                                    {/* Dot */}
                                    <div className={`absolute left-[-11px] top-1.5 w-2 h-2 rounded-full ring-4 ring-white ${rec.status === "IN" ? "bg-emerald-500" : rec.status === "OUT" ? "bg-rose-500" : "bg-amber-500"
                                      }`} />

                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md text-white ${rec.status === "IN" ? "bg-emerald-600" : rec.status === "OUT" ? "bg-rose-600" : "bg-amber-600"
                                            }`}>
                                            Punch {rec.status}
                                          </span>
                                          <span className="text-xs font-bold text-gray-800">{rec.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-gray-400" />
                                          {rec.address || "No Address logged"}
                                        </p>
                                      </div>

                                      {/* Action Links & Images */}
                                      <div className="flex items-center gap-3">
                                        {rec.images && (
                                          <a
                                            href={rec.images}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                          >
                                            <ImageIcon className="w-3.5 h-3.5" /> View Photo
                                          </a>
                                        )}
                                        {rec.map_link && (
                                          <a
                                            href={rec.map_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" /> View Map
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 justify-center">
                        <Database className="w-10 h-10 text-gray-300" />
                        <p className="text-gray-400 text-xs font-bold">No attendance records found for this period.</p>
                        <button onClick={clearFilters} className="text-blue-600 text-xs font-bold hover:underline mt-1">
                          Reset filters to view again
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


    </div>
  );
};

export default AttendanceView;
