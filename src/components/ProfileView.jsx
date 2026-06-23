import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabase';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Shield, 
  Calendar, 
  Building, 
  Clock, 
  Award,
  Loader2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Download,
  FileText,
  CreditCard,
  AlertTriangle,
  Upload
} from 'lucide-react';

const ProfileView = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showSalary, setShowSalary] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userName = user.emp_name;
        if (!userName) {
          setLoading(false);
          return;
        }

        // Fetch official joining details matching employee_id or name
        let query = supabase.from("joining").select("*");
        if (user.employee_id) {
          query = query.eq("rbp_joining_id", user.employee_id);
        } else {
          query = query.ilike("name_as_per_aadhar", `%${userName.trim()}%`);
        }

        const { data: joinData, error: joinError } = await query.maybeSingle();

        if (!joinError && joinData) {
          setProfile(joinData);

          // Fetch enquiry details matching candidate_email, candidate_phone, or candidate_name
          const email = joinData.personal_email;
          const phone = joinData.mobile_number;
          const name = joinData.name_as_per_aadhar;

          let enquiryQuery = supabase.from("enquiry").select("*");
          if (email) {
            enquiryQuery = enquiryQuery.eq("candidate_email", email);
          } else if (phone) {
            enquiryQuery = enquiryQuery.eq("candidate_phone", phone);
          } else {
            enquiryQuery = enquiryQuery.ilike("candidate_name", `%${name.trim()}%`);
          }

          const { data: enqData } = await enquiryQuery.limit(1).maybeSingle();
          if (enqData) {
            setEnquiry(enqData);
          }
        } else {
          // Fallback: try finding in enquiry directly using username
          const { data: enqData } = await supabase
            .from("enquiry")
            .select("*")
            .ilike("candidate_name", `%${userName.trim()}%`)
            .limit(1)
            .maybeSingle();
          if (enqData) {
            setEnquiry(enqData);
          }
        }
      } catch (err) {
        console.error("Error fetching profile details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [user]);

  const handleDocumentUpload = async (e, columnName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size cannot exceed 5MB");
      return;
    }

    setUploadingDoc(columnName);
    try {
      const fileExt = file.name.split('.').pop();
      const employeeId = profile?.rbp_joining_id || user?.employee_id || 'unknown';
      const fileName = `${employeeId}_${columnName}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('joining')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Update Database
      const updateData = { [columnName]: filePath };

      if (!profile) {
        // If there's no record in joining table for this user yet, we insert one
        const insertData = {
          rbp_joining_id: user?.employee_id || null,
          name_as_per_aadhar: user?.emp_name || null,
          status: 'Active',
          [columnName]: filePath
        };
        const { data: newProfile, error: insertError } = await supabase
          .from('joining')
          .insert([insertData])
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else {
        // Update existing row
        let updateQuery = supabase.from('joining').update(updateData);
        if (profile.id) {
          updateQuery = updateQuery.eq('id', profile.id);
        } else {
          updateQuery = updateQuery.eq('rbp_joining_id', profile.rbp_joining_id || user.employee_id);
        }
        const { error: updateError } = await updateQuery;
        if (updateError) throw updateError;

        setProfile(prev => ({ ...prev, [columnName]: filePath }));
      }
      toast.success("Document uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(`Upload failed: ${err.message || err}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const renderDocumentCard = (title, subtitle, columnName, icon, colorClass, isEnquiry = false) => {
    const fileUrl = isEnquiry ? enquiry?.[columnName] : profile?.[columnName];
    const isUploading = uploadingDoc === columnName;

    return (
      <div className={`border border-gray-150 hover:border-blue-150 rounded-xl p-4 bg-slate-50/55 hover:bg-white transition-all flex flex-col justify-between hover:shadow-md group relative min-h-[180px] ${isUploading ? 'opacity-80 pointer-events-none' : ''}`}>
        
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-20 space-y-2">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Uploading...</span>
          </div>
        )}

        <div className="space-y-2">
          <div className={`h-10 w-10 ${colorClass} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">{title}</h4>
            <span className="text-xs text-gray-400 block mt-0.5">{subtitle}</span>
          </div>
        </div>

        {fileUrl ? (
          <div className="mt-4 space-y-2">
            <a
              href={getDocumentUrl(fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border border-slate-200 group-hover:border-blue-200 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
            >
              <Download className="h-3.5 w-3.5" /> View / Download
            </a>
            {!isEnquiry && (
              <label className="flex items-center justify-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors py-1 text-center justify-center w-full">
                <Upload className="h-3 w-3" /> Replace Document
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleDocumentUpload(e, columnName)}
                />
              </label>
            )}
          </div>
        ) : (
          <div className="mt-4">
            {!isEnquiry ? (
              <label className="flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-3 cursor-pointer bg-white hover:bg-blue-50/20 transition-all text-center">
                <Upload className="h-5 w-5 text-gray-400 group-hover:text-blue-500 mb-1" />
                <span className="text-[11px] font-extrabold text-blue-600">Upload File</span>
                <span className="text-[9px] text-gray-400 mt-0.5">Image / PDF up to 5MB</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleDocumentUpload(e, columnName)}
                />
              </label>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-lg p-4 bg-white text-center">
                <span className="text-xs font-bold text-gray-400">Not Uploaded</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">(Managed by HR)</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Dynamic user displays
  const fullName = profile?.name_as_per_aadhar || enquiry?.candidate_name || user?.emp_name || "Employee";
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const getDocumentUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    try {
      const { data } = supabase.storage.from('joining').getPublicUrl(path);
      return data?.publicUrl || path;
    } catch (e) {
      return path;
    }
  };

  const calculateServiceHistory = (joiningDate) => {
    if (!joiningDate) return "N/A";
    const join = new Date(joiningDate);
    const now = new Date();
    const diffTime = Math.abs(now - join);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths} Month${diffMonths > 1 ? 's' : ''}`;
    }
    const diffYears = (diffDays / 365).toFixed(1);
    return `${diffYears} Year${parseFloat(diffYears) > 1 ? 's' : ''}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const onboardingSteps = [
    { key: 'candidate_validated', label: 'Candidate Profile Validated' },
    { key: 'offer_letter_received', label: 'Offer Letter Received' },
    { key: 'salary_slip_resume_checked', label: 'Salary Slip & Resume Checked' },
    { key: 'welcome_meeting', label: 'Welcome Meeting Scheduled' },
    { key: 'joining_letter_issued', label: 'Official Joining Letter Issued' },
    { key: 'gmail_id_issued', label: 'Official Gmail ID Issued' },
    { key: 'biometric_access', label: 'Biometric Access Configured' },
    { key: 'company_directory_added', label: 'Added to Company Directory' },
    { key: 'attendance_registration', label: 'Attendance Registration Completed' },
    { key: 'pf_esic_completed', label: 'PF & ESIC Onboarding Completed' },
    { key: 'pf_registration', label: 'Provident Fund (PF) Registered' },
    { key: 'esic_registration', label: 'ESIC Benefits Registered' },
    { key: 'assets_assigned', label: 'Company Assets Assigned' },
  ];

  const hasSeparation = !!(profile?.leaving_date || profile?.leaving_reason);

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
    { id: 'Personal', label: 'Personal & Financial', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'Onboarding', label: 'Onboarding Status', icon: <CheckCircle className="h-4 w-4" /> },
    { id: 'Prejoining', label: 'Pre-Joining & Enquiry', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'Documents', label: 'Uploaded Documents', icon: <FileText className="h-4 w-4" /> },
  ];
  if (hasSeparation) {
    tabs.push({ id: 'Separation', label: 'Separation Details', icon: <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" /> });
  }

  // Count onboarding progress
  const completedStepsCount = onboardingSteps.filter(step => !!profile?.[step.key]).length;
  const totalStepsCount = onboardingSteps.length;
  const onboardingPercentage = Math.round((completedStepsCount / totalStepsCount) * 100);

  // Trust badge determination
  const getTrustBadge = () => {
    if (onboardingPercentage >= 90) return { label: 'Gold Star Employee', color: 'bg-emerald-500 text-white' };
    if (onboardingPercentage >= 50) return { label: 'Silver Star Employee', color: 'bg-blue-500 text-white' };
    return { label: 'Standard Account', color: 'bg-gray-500 text-white' };
  };
  const trustBadge = getTrustBadge();

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="text-sm font-semibold text-gray-500">Loading Profile Details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Hero Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 w-full relative">
          <div className="absolute right-6 top-6 bg-white/10 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-white/20">
            <Shield className="h-3.5 w-3.5 text-emerald-300" />
            <span>{profile?.status ? `${profile.status} Employee` : "Active Employee"}</span>
          </div>
        </div>
        
        <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end gap-5 -mt-12">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 text-white font-black text-3xl flex items-center justify-center border-4 border-white shadow-md relative z-10">
            {initials || "EE"}
          </div>
          
          <div className="flex-1 space-y-1">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">{fullName}</h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4">
              <span className="text-sm text-gray-500 font-semibold flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-gray-400" />
                {profile?.designation || enquiry?.applying_post || "Executive Associate"}
              </span>
              <span className="text-sm text-gray-500 font-semibold flex items-center gap-1.5">
                <Building className="h-4 w-4 text-gray-400" />
                {profile?.department || enquiry?.department || "Operations & Strategy"}
              </span>
              <span className="text-sm text-gray-500 font-semibold flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400" />
                {profile?.work_location || "Headquarters"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Elegant Inner Tab Selector */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar scroll-smooth gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Views */}
      <div className="transition-all duration-300">
        
        {/* Tab 1: Overview */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Official Information */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                  <Building className="h-5 w-5 text-blue-500" />
                  Official Employment Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Employee ID</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">
                      {profile?.rbp_joining_id || user?.employee_id || "N/A"}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Firm Associated</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">
                      {profile?.firm_name || enquiry?.company_name || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Date of Joining</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(profile?.date_of_joining)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Father's Name</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">
                      {profile?.father_name || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Designation Role</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">
                      {profile?.designation || enquiry?.applying_post || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Cost Center / Dept</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">
                      {profile?.department || enquiry?.department || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Attendance Type</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5 capitalize">
                      {profile?.attendance_type || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Employee Category</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5 capitalize">
                      {profile?.employee_category || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                  <Phone className="h-5 w-5 text-purple-500" />
                  Contact Details & References
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Contact Mobile</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {profile?.mobile_number || enquiry?.candidate_phone || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Personal Email</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {profile?.personal_email || enquiry?.candidate_email || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Official Email</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      {profile?.official_email_id || (user?.emp_name ? `${user.emp_name.replace(/\s+/g, '').toLowerCase()}@rbpenergy.com` : "N/A")}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Registered Work Hub</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {profile?.work_location || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              {/* Account Status */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Account Overview</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Privilege Role</span>
                    <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wide bg-blue-100 px-2.5 py-0.5 rounded">
                      {user?.access || "Staff"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Security Clearance</span>
                    <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide bg-emerald-100 px-2.5 py-0.5 rounded">
                      {user?.access?.toLowerCase() === 'admin' ? 'Level 3 (Admin)' : 'Level 1 (Standard)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Access Status</span>
                    <span className={`text-xs font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded
                      ${user?.access !== 'false' ? 'text-indigo-700 bg-indigo-100' : 'text-rose-700 bg-rose-100'}`}>
                      {user?.access !== 'false' ? 'Verified' : 'Deactivated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats Summary */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg">
                <div className="absolute right-0 bottom-0 opacity-10 translate-y-6 translate-x-6">
                  <Award className="h-36 w-36" />
                </div>
                
                <h4 className="text-sm font-semibold tracking-wider text-indigo-200 uppercase mb-4">Milestone Tracker</h4>
                
                <div className="space-y-4 relative z-10">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-200 block uppercase">Work History</span>
                    <span className="text-lg font-black block mt-0.5">
                      {profile?.date_of_joining ? calculateServiceHistory(profile.date_of_joining) : "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-indigo-200 block uppercase">Onboarding Checklist</span>
                    <span className="text-lg font-black block mt-0.5">{onboardingPercentage}% Completed</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-indigo-200 block uppercase">RBP Trust Badge</span>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded inline-block mt-1 ${trustBadge.color}`}>
                      ★ {trustBadge.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Personal & Financial */}
        {activeTab === 'Personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-3">
                <User className="h-5 w-5 text-indigo-500" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Date of Birth</span>
                  <span className="text-sm font-bold text-gray-800 block mt-0.5">{formatDate(profile?.date_of_birth) || formatDate(enquiry?.dob)}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Gender</span>
                  <span className="text-sm font-bold text-gray-800 block mt-0.5 capitalize">{profile?.gender || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Blood Group</span>
                  <span className="text-sm font-bold text-gray-800 block mt-0.5 uppercase">{profile?.blood_group || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Marital Status</span>
                  <span className="text-sm font-bold text-gray-800 block mt-0.5 capitalize">{enquiry?.marital_status || "N/A"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Current Address</span>
                  <span className="text-sm font-bold text-gray-800 block mt-0.5">{profile?.current_address || enquiry?.present_address || "N/A"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Aadhar Address</span>
                  <span className="text-sm font-bold text-gray-800 block mt-0.5">{profile?.aadhar_address || "N/A"}</span>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wide">Emergency Contact & Family</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Contact Person</span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5">{profile?.family_person_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Relationship</span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5 capitalize">{profile?.family_relationship || "N/A"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Emergency Mobile</span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {profile?.family_number || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial & Statutory */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-3">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                Financial & Statutory Details
              </h3>

              {/* Bank Account */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase">Bank Details</span>
                  <button
                    onClick={() => setShowBankDetails(!showBankDetails)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    {showBankDetails ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Mask
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Reveal Account
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                  <div>
                    <span className="text-xs font-semibold text-emerald-600/80 uppercase">Account Number</span>
                    <span className="text-sm font-black text-slate-800 block mt-0.5 tracking-wide">
                      {profile?.bank_account_number
                        ? (showBankDetails
                          ? profile.bank_account_number
                          : `••••••••${profile.bank_account_number.slice(-4)}`)
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-600/80 uppercase">IFSC Code</span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5 uppercase">{profile?.ifsc_code || "N/A"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs font-semibold text-emerald-600/80 uppercase">Branch Name</span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5">{profile?.branch_name || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Salary & Package */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase">Salary Package</span>
                  <button
                    onClick={() => setShowSalary(!showSalary)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    {showSalary ? (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Lock Salary
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" /> Show Salary
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Base Monthly CTC</span>
                  <span className="text-base font-black text-gray-800">
                    {profile?.salary
                      ? (showSalary
                        ? `₹${Number(profile.salary).toLocaleString('en-IN')}`
                        : "₹ ••••••")
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* PF & ESIC */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <span className="text-xs font-bold text-gray-400 uppercase">Statutory Registrations</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">PF Number</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">{profile?.past_pf_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">ESIC Number</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">{profile?.past_esic_number || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Company PF Status</span>
                    <span className="text-xs font-extrabold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded inline-block mt-1">
                      {profile?.company_pf_provided || "No PF Provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">Company ESIC status</span>
                    <span className={`text-xs font-extrabold uppercase tracking-wide px-2 py-0.5 rounded inline-block mt-1
                      ${profile?.company_esic_provided ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {profile?.company_esic_provided ? "ESIC Enrolled" : "Not Enrolled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Onboarding Checklist */}
        {activeTab === 'Onboarding' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Employee Onboarding Checkpoints
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Completed checkpoints signify standard system integration and directory settings.
              </p>
            </div>

            {/* Progress bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-600">Onboarding Completion</span>
                  <span className="text-xs font-black text-blue-600">{completedStepsCount} / {totalStepsCount} ({onboardingPercentage}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${onboardingPercentage}%` }}></div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm self-start md:self-auto">
                <Shield className="h-5 w-5 text-emerald-500" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">Account Level</span>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">{trustBadge.label}</span>
                </div>
              </div>
            </div>

            {/* Grid checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {onboardingSteps.map((step) => {
                const isCompleted = !!profile?.[step.key];
                return (
                  <div
                    key={step.key}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3
                      ${isCompleted
                        ? 'bg-emerald-50/40 border-emerald-100/60 text-emerald-950'
                        : 'bg-gray-50/50 border-gray-150 text-gray-400'
                      }`}
                  >
                    <span className="text-xs font-bold leading-tight">{step.label}</span>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Pre-Joining & Enquiry */}
        {activeTab === 'Prejoining' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Interview and Enquiry details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-3">
                  <Briefcase className="h-5 w-5 text-indigo-500" />
                  Pre-Employment & Interview details
                </h3>

                {enquiry ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Applying for Post</span>
                      <span className="text-sm font-bold text-gray-800 block mt-0.5">{enquiry.applying_post || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Previous Company</span>
                      <span className="text-sm font-bold text-gray-800 block mt-0.5">{enquiry.previous_company_name || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Previous Position</span>
                      <span className="text-sm font-bold text-gray-800 block mt-0.5">{enquiry.previous_position || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Job Experience Details</span>
                      <span className="text-sm font-bold text-gray-800 block mt-0.5">{enquiry.job_experience || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Enquiry / Candidate ID</span>
                      <span className="text-sm font-bold text-gray-800 block mt-0.5">{enquiry.candidate_enquiry_number || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase">Indent Order Reference</span>
                      <span className="text-sm font-bold text-gray-800 block mt-0.5">{enquiry.indent_number || "N/A"}</span>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase">HR / Interviewer Feedback</span>
                      <span className="text-sm font-medium text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 block mt-1 leading-relaxed">
                        {enquiry.candidate_feedback || "No interview feedback logs captured."}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[150px] flex flex-col items-center justify-center text-center p-4">
                    <Briefcase className="h-8 w-8 text-gray-300 mb-2" />
                    <span className="text-sm font-bold text-gray-400">No matching enquiry records found for this employee.</span>
                    <span className="text-xs text-gray-300 mt-1">If the profile was entered directly, no pre-employment tracker exists.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Timeline and Tracker status */}
            <div className="space-y-6">
              {/* Tracker status card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recruitment Tracker Status</h4>
                
                <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Process Status</span>
                    <span className="text-sm font-black text-indigo-955 block mt-0.5 capitalize text-indigo-950">
                      {enquiry?.tracker_status || "Completed"}
                    </span>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                </div>

                {enquiry?.next_call_date && (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="text-xs text-gray-400 font-bold block">Follow-up Call Date</span>
                    <span className="text-sm font-bold text-gray-700 mt-0.5 block">{formatDate(enquiry.next_call_date)}</span>
                  </div>
                )}
              </div>

              {/* Timeline Card */}
              {enquiry && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Interview Schedule Logs</h4>
                  
                  <div className="relative pl-4 border-l border-gray-100 space-y-5">
                    {/* Event 1 */}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600 border-2 border-white ring-4 ring-indigo-100"></div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase block">Interview Round 1</span>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="text-xs font-bold text-gray-700">Planned: {formatDate(enquiry.planned_1)}</span>
                          <span className="text-xs text-gray-400">Actual: {formatDate(enquiry.actual_1)}</span>
                          {enquiry.time_delay_1 ? (
                            <span className="text-[10px] font-semibold text-rose-500">Delay: {enquiry.time_delay_1} Days</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Event 2 */}
                    {(enquiry.planned_2 || enquiry.actual_2) && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-purple-600 border-2 border-white ring-4 ring-purple-100"></div>
                        <div>
                          <span className="text-[10px] font-bold text-purple-500 uppercase block">Interview Round 2</span>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-xs font-bold text-gray-700">Planned: {formatDate(enquiry.planned_2)}</span>
                            <span className="text-xs text-gray-400">Actual: {formatDate(enquiry.actual_2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Uploaded Documents */}
        {activeTab === 'Documents' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Employee Verification Documents
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload scans and snapshots verifying Aadhar, PAN, and Bank Passbook configurations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderDocumentCard("Aadhar Card Front", "Identity Verification Card", "aadhar_front_photo", <CreditCard className="h-5 w-5" />, "bg-blue-100 text-blue-600")}
              {renderDocumentCard("Aadhar Card Back", "Address Proof Verification", "aadhar_back_photo", <CreditCard className="h-5 w-5" />, "bg-blue-100 text-blue-600")}
              {renderDocumentCard("PAN Card", "Tax Identification Card", "pan_card", <FileText className="h-5 w-5" />, "bg-purple-100 text-purple-600")}
              {renderDocumentCard("Bank Passbook Photo", "Salary Remittance Passbook Scan", "bank_passbook_photo", <Building className="h-5 w-5" />, "bg-emerald-100 text-emerald-600")}
              {renderDocumentCard("Resume Copy", "Candidate CV / Professional Resume", "resume_copy", <FileText className="h-5 w-5" />, "bg-indigo-100 text-indigo-600", true)}
            </div>
          </div>
        )}

        {/* Tab 6: Separation Details (Conditional Tab) */}
        {activeTab === 'Separation' && hasSeparation && (
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 space-y-6">
            <div className="flex items-start gap-3.5 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <AlertTriangle className="h-6 w-6 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-rose-955">Employee Separation & Leaving File</h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  This account has active records pertaining to resignation or leaving.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Leaving Date</span>
                <span className="text-sm font-bold text-gray-800 block mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-rose-400" />
                  {profile?.leaving_date || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Reason for Leaving</span>
                <span className="text-sm font-bold text-gray-800 block mt-0.5 capitalize">
                  {profile?.leaving_reason || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Planned Separation Date</span>
                <span className="text-sm font-bold text-gray-800 block mt-0.5">
                  {profile?.planned_date || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Actual Separation Date</span>
                <span className="text-sm font-bold text-gray-800 block mt-0.5">
                  {profile?.actual_date || "N/A"}
                </span>
              </div>

              {profile?.delay_days ? (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Exit Delay / Buffer Days</span>
                  <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded inline-block mt-1">
                    {profile.delay_days} Days
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfileView;
