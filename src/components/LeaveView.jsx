import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Send,
  Plus,
  FileText,
  User,
  Shield,
  Briefcase,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  Paperclip,
  X
} from 'lucide-react';
import supabase from '../utils/supabase';

const LeaveView = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [hodNames, setHodNames] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    hodName: '',
    fromDate: '',
    toDate: '',
    reason: '',
    leaveType: '',
    supportDocument: null
  });

  const leaveTypes = ['Casual Leave'];

  // Fetch all necessary data
  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Fetch official joining details matching employee_id or name
      const userName = user.emp_name;
      let query = supabase.from("joining").select("*");
      if (user.employee_id) {
        query = query.eq("rbp_joining_id", user.employee_id);
      } else if (userName) {
        query = query.ilike("name_as_per_aadhar", `%${userName.trim()}%`);
      }

      const { data: joinData, error: joinError } = await query.maybeSingle();
      let empId = user.employee_id;
      let empName = user.emp_name;

      if (!joinError && joinData) {
        setProfile(joinData);
        empId = joinData.rbp_joining_id;
        empName = joinData.name_as_per_aadhar;
      }

      // 2. Fetch HOD names from master_hr
      const { data: hodData, error: hodError } = await supabase
        .from('master_hr')
        .select('hod_name')
        .order('hod_name', { ascending: true });
      
      if (!hodError && hodData) {
        const uniqueHods = [...new Set(hodData.map(h => h.hod_name?.trim()).filter(Boolean))];
        setHodNames(uniqueHods);
      } else {
        // Fallback standard HODs
        setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
      }

      // 3. Fetch Leave Applications from emp_leaving_holiday
      let leaveQuery = supabase.from('emp_leaving_holiday').select('*');
      if (empId) {
        leaveQuery = leaveQuery.eq('employee_id', empId);
      } else if (empName) {
        leaveQuery = leaveQuery.ilike('employee_name', `%${empName.trim()}%`);
      }

      const { data: leaves, error: leavesError } = await leaveQuery.order('created_at', { ascending: false });
      if (!leavesError && leaves) {
        setRequests(leaves);
      }
    } catch (err) {
      console.error("Error fetching leave data:", err);
      toast.error("Failed to load leave history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fromDate || !formData.toDate || !formData.reason || !formData.hodName || !formData.leaveType) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    const start = new Date(formData.fromDate);
    const end = new Date(formData.toDate);
    if (end < start) {
      toast.error('To Date cannot be before From Date');
      return;
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      setSubmitting(true);
      const empName = profile?.name_as_per_aadhar || user?.emp_name || 'Employee';
      const empId = profile?.rbp_joining_id || user?.employee_id || '';
      const designation = profile?.designation || '';

      // Upload file if selected
      let fileUrl = null;
      if (formData.supportDocument) {
        const file = formData.supportDocument;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${empId}_leave.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('emp_leave_img')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('emp_leave_img')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('emp_leaving_holiday')
        .insert([{
          employee_name: empName,
          employee_id: empId,
          designation: designation,
          hod_name: formData.hodName,
          from_date: formData.fromDate,
          to_date: formData.toDate,
          reason: formData.reason,
          leave_category: formData.leaveType,
          support_document: fileUrl,
          status: 'Pending'
        }]);

      if (error) throw error;

      toast.success('Casual Leave application submitted successfully! 🚀');
      
      // Reset form
      setFormData({
        hodName: '',
        fromDate: '',
        toDate: '',
        reason: '',
        leaveType: '',
        supportDocument: null
      });

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = null;

      // Refresh data list
      fetchData();
    } catch (err) {
      console.error("Error submitting leave application:", err);
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image or PDF file');
        e.target.value = null;
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        e.target.value = null;
        return;
      }

      setFormData(prev => ({
        ...prev,
        supportDocument: file
      }));
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-750 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Compute stats
  const totalApplied = requests.length;
  const approvedCount = requests.filter(r => r.status?.toLowerCase() === 'approved').length;
  const pendingCount = requests.filter(r => r.status?.toLowerCase() === 'pending').length;
  const rejectedCount = requests.filter(r => r.status?.toLowerCase() === 'rejected').length;

  const statCards = [
    {
      title: 'Total Applied CL',
      value: totalApplied,
      color: 'from-blue-500 to-indigo-600',
      icon: FileText,
      percentage: totalApplied > 0 ? 100 : 0
    },
    {
      title: 'Approved CL',
      value: approvedCount,
      color: 'from-emerald-500 to-teal-600',
      icon: CheckCircle,
      percentage: totalApplied > 0 ? Math.round((approvedCount / totalApplied) * 100) : 0
    },
    {
      title: 'Pending CL',
      value: pendingCount,
      color: 'from-amber-500 to-orange-600',
      icon: Clock,
      percentage: totalApplied > 0 ? Math.round((pendingCount / totalApplied) * 100) : 0
    },
    {
      title: 'Rejected CL',
      value: rejectedCount,
      color: 'from-rose-500 to-red-600',
      icon: XCircle,
      percentage: totalApplied > 0 ? Math.round((rejectedCount / totalApplied) * 100) : 0
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* 4 Premium Cards with Circular Rings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden bg-white rounded-3xl border border-gray-150 p-6 flex items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
            >
              {/* Card Gradient Header line */}
              <div className={`absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r ${card.color}`} />
              
              <div className="relative z-10 space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
                  {card.title}
                </span>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                  {loading ? (
                    <div className="h-8 w-12 bg-gray-100 animate-pulse rounded-lg mt-1" />
                  ) : (
                    card.value
                  )}
                </h2>
                <span className="text-[10px] text-gray-400 font-bold block">
                  {totalApplied > 0 ? `${card.percentage}% of total` : 'No requests yet'}
                </span>
              </div>

              {/* Progress Ring */}
              <div className="relative h-16 w-16 flex items-center justify-center z-10">
                <svg className="absolute h-full w-full -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    className="stroke-gray-100 fill-none"
                    strokeWidth="5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    className="fill-none stroke-blue-600 transition-all duration-500"
                    style={{
                      stroke: `url(#gradient-${i})`
                    }}
                    strokeWidth="5"
                    strokeDasharray={151}
                    strokeDashoffset={loading ? 151 : 151 - (151 * card.percentage) / 100}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id={`gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" className={`stop-${card.color.split(' ')[0].split('-')[1]}-500`} style={{ stopColor: card.color.includes('blue') ? '#3b82f6' : card.color.includes('emerald') ? '#10b981' : card.color.includes('amber') ? '#f59e0b' : '#f43f5e' }} />
                      <stop offset="100%" className={`stop-${card.color.split(' ')[1].split('-')[1]}-600`} style={{ stopColor: card.color.includes('blue') ? '#4f46e5' : card.color.includes('emerald') ? '#0d9488' : card.color.includes('amber') ? '#ea580c' : '#e11d48' }} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="p-2 rounded-full bg-gray-50 text-gray-600 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Side: Submit Request form */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-150 shadow-sm p-6 self-start space-y-5">
          <h3 className="text-base font-black text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Plus className="h-5 w-5 text-blue-600" />
            Apply Casual Leave (CL)
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Auto Prefilled User Fields */}
            <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-gray-400 uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" /> Name
                </span>
                <span className="font-bold text-gray-700">
                  {loading ? 'Loading...' : (profile?.name_as_per_aadhar || user?.emp_name || 'N/A')}
                </span>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-gray-400 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-500" /> Employee ID
                </span>
                <span className="font-bold text-gray-700">
                  {loading ? 'Loading...' : (profile?.rbp_joining_id || user?.employee_id || 'N/A')}
                </span>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-gray-400 uppercase flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> Designation
                </span>
                <span className="font-bold text-gray-700">
                  {loading ? 'Loading...' : (profile?.designation || 'Staff')}
                </span>
              </div>
            </div>

            {/* Leave Category Field */}
            <div>
              <label className="block text-xs font-bold text-gray-550 uppercase mb-1.5">
                Leave Category *
              </label>
              <select
                required
                value={formData.leaveType}
                onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type, index) => (
                  <option key={index} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* HOD Name Field */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                HOD Name *
              </label>
              <select
                required
                value={formData.hodName}
                onChange={(e) => setFormData(prev => ({ ...prev, hodName: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Select HOD</option>
                {hodNames.map((name, index) => (
                  <option key={index} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* From Date / To Date Picker */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  From Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.fromDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-2.5 px-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                  To Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.toDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, toDate: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-2.5 px-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* Leave Reason Text area */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                Reason *
              </label>
              <textarea
                required
                rows="4"
                placeholder="Brief reason for your Casual Leave application..."
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none shadow-inner"
              />
            </div>

            {/* Support Document File Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                Support Documents
              </label>
              <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-xl p-4 bg-gradient-to-r from-purple-50/20 to-indigo-50/20 hover:from-purple-50 hover:to-indigo-50 cursor-pointer transition-all flex flex-col items-center justify-center gap-2">
                <Paperclip className="h-6 w-6 text-purple-500" />
                <span className="text-xs font-bold text-gray-700">
                  {formData.supportDocument ? formData.supportDocument.name : 'Upload Supporting Documents'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formData.supportDocument ? `${(formData.supportDocument.size / 1024).toFixed(2)} KB` : 'Medical Certificate, Approval Letter etc. (Max 5MB)'}
                </span>
                <input
                  type="file"
                  name="supportDocument"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                />
              </label>
              {formData.supportDocument && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, supportDocument: null }))}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove file
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit CL Application
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Requests History */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-150 shadow-sm p-6 flex flex-col min-h-[450px]">
          <h3 className="text-base font-black text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
            <FileText className="h-5 w-5 text-indigo-600" />
            Applied CL History
          </h3>

          <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-4 scrollbar-thin">
            {loading ? (
              <div className="h-full flex items-center justify-center flex-col py-16">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                <span className="text-xs text-gray-400 font-bold">Loading leave history...</span>
              </div>
            ) : requests.length > 0 ? (
              requests.map((req) => (
                <div 
                  key={req.id} 
                  className="p-4 rounded-2xl bg-gray-50/70 border border-gray-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-gray-300 transition-colors shadow-sm"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-black text-gray-800">
                        {req.leave_category || 'Casual Leave'}
                      </span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-black border border-blue-200">
                        {req.total_days || 1} {req.total_days === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {formatDate(req.from_date)} — {formatDate(req.to_date)}
                    </p>

                    {req.reason && (
                      <p className="text-xs text-gray-400 italic font-medium truncate max-w-full">
                        "{req.reason}"
                      </p>
                    )}

                    {req.hod_name && (
                      <p className="text-[10px] text-gray-400 font-bold">
                        HOD: <span className="text-gray-600">{req.hod_name}</span>
                      </p>
                    )}

                    {req.support_document && (
                      <div className="mt-1">
                        {req.support_document.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                          <a
                            href={req.support_document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"
                          >
                            <Paperclip className="h-3 w-3" /> View PDF
                          </a>
                        ) : (
                          <button
                            onClick={() => setPreviewImage(req.support_document)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all cursor-pointer"
                          >
                            <Paperclip className="h-3 w-3" /> View Image
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 self-stretch sm:self-auto justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-150">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusStyle(req.status)}`}>
                      {getStatusIcon(req.status)}
                      {req.status || 'Pending'}
                    </span>
                    {req.created_at && (
                      <span className="text-[9px] text-gray-400 font-bold block sm:text-right">
                        Applied: {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">No Casual Leaves Applied</p>
                <p className="text-[10px] text-gray-400 mt-1">Submit the form on the left to apply for a Casual Leave</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Support Document Image Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[9999] p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 focus:outline-none bg-white/10 p-2 rounded-full transition-all"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewImage}
              alt="Supporting Document"
              className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={previewImage}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow transition-all flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              Open Original Document / Image
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveView;
