import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { LogOut, User as UserIcon } from "lucide-react";

function LeavingForm({ isDashboard = false }) {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [isInactive, setIsInactive] = useState(false);

  const [form, setForm] = useState({
    employee_id: "",
    name: "",
    reason_of_leaving: "",
    mobile_number: "",
    firm_name: "",
    father_name: "",
    date_of_joining: "",
    work_location: "",
    designation: "",
    department: "",
  });

  // Pre-fill logic
  useEffect(() => {
    if (user) {
      const userName = user.emp_name || user.sales_person_name || user.user_name;
      const employeeId = user.employee_id;
      if ((employeeId || userName) && !form.employee_id) {
        if (userName) {
          setForm(prev => ({ ...prev, name: userName }));
        }
        handleNameSelect(userName, employeeId);
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("joining")
        .select("rbp_joining_id, name_as_per_aadhar")
        .eq("status", "Active");

      if (!error && data) {
        setEmployeeOptions(data);
      }
    };

    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.employee_id || !form.name || !form.reason_of_leaving) {
      toast.error("Fill required fields");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("employee_leaving").insert([
        {
          ...form,
          date_of_leaving: new Date().toISOString().split("T")[0],
        },
      ]);

      if (error) throw error;

      toast.success("Submitted successfully 🎉");

      setForm({
        employee_id: "",
        name: "",
        reason_of_leaving: "",
        mobile_number: "",
        firm_name: "",
        father_name: "",
        date_of_joining: "",
        work_location: "",
        designation: "",
        department: "",
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameSelect = async (selectedName, explicitEmpId = null) => {
    if (!selectedName && !explicitEmpId) return;

    const selectedEmp = employeeOptions.find(
      (emp) => emp.name_as_per_aadhar === selectedName,
    );

    let empId = explicitEmpId || selectedEmp?.rbp_joining_id;

    try {
      setFetching(true);

      let query = supabase
        .from("joining")
        .select("*");

      if (empId) {
        query = query.eq("rbp_joining_id", empId);
      } else {
        query = query.ilike("name_as_per_aadhar", `%${selectedName.trim()}%`);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        if (empId) toast.error("Employee details not found");
        return;
      }

      if (data.status === "Inactive") {
        setIsInactive(true);
      } else {
        setIsInactive(false);
      }

      setForm({
        employee_id: data.rbp_joining_id || "",
        name: data.name_as_per_aadhar || "",
        mobile_number: data.mobile_number || "",
        firm_name: data.firm_name || "",
        father_name: data.father_name || "",
        date_of_joining: data.date_of_joining || "",
        work_location: data.work_location || "",
        designation: data.designation || "",
        department: data.department || "",
        reason_of_leaving: "",
      });
    } catch {
      toast.error("Fetch failed");
    } finally {
      setFetching(false);
    }
  };





  // Render form fields
  const renderFormFields = () => (
    <>
      {/* Employee ID + Button */}
      <div className="col-span-1 md:col-span-2">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Search Employee Name *</label>
        <input
          list="employeeNames"
          className="w-full p-3 border cursor-not-allowed rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          placeholder="Search Employee Name *"
          value={form.name}
          disabled
          onChange={(e) => {
            setForm({ ...form, name: e.target.value });
            handleNameSelect(e.target.value);
          }}
        />

        <datalist id="employeeNames">
          {employeeOptions.map((emp, index) => (
            <option key={index} value={emp.name_as_per_aadhar} />
          ))}
        </datalist>
      </div>

      {/* Auto Fields */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Employee ID</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Employee ID"
          value={form.employee_id}
          readOnly
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Mobile"
          disabled
          value={form.mobile_number}
          onChange={handleChange}
          name="mobile_number"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Firm</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Firm"
          value={form.firm_name}
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Father Name</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Father Name"
          value={form.father_name}
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Joining Date</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Joining Date"
          value={form.date_of_joining}
          readOnly
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Work Location</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Work Location"
          value={form.work_location}
          disabled
          name="work_location"
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Designation</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Designation"
          value={form.designation}
          readOnly
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
        <input
          className="w-full p-3 border rounded-xl bg-gray-50 text-gray-600 font-bold"
          placeholder="Department"
          value={form.department}
          readOnly
        />
      </div>

      {/* Reason */}
      <div className="col-span-1 md:col-span-2">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Reason of Leaving *</label>
        <textarea
          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] transition-all resize-none"
          placeholder="Reason of Leaving *"
          name="reason_of_leaving"
          value={form.reason_of_leaving}
          onChange={handleChange}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || fetching}
        className={`col-span-1 md:col-span-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all ${loading || fetching ? "opacity-70 cursor-not-allowed" : "active:scale-[0.99]"
          }`}
      >
        {loading ? "Submitting Application..." : fetching ? "Loading Data..." : "Submit Resignation Application"}
      </button>
    </>
  );

  if (isDashboard) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Resignation Application Form</h3>
          <p className="text-xs text-gray-400 mt-0.5">Please review your loaded credentials and input the reason of leaving below.</p>
        </div>
        {/* <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {renderFormFields()}
        </form> */}
        <div className="relative">
          {isInactive && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="bg-green-600 text-white px-8 py-4 rounded-xl shadow-2xl">
                <h3 className="text-2xl font-bold">
                  Resignation Approved
                </h3>
              </div>
            </div>
          )}

          <div className={isInactive ? "blur-sm pointer-events-none opacity-60" : ""}>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
            >
              {renderFormFields()}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Fallback / legacy standalone full screen page layout
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-800 p-4 font-sans">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl p-4 md:p-8 relative">

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
          {/* User Info */}
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <UserIcon size={20} />
            </div>
            <span className="font-bold text-gray-700 text-sm md:text-base">
              {user?.emp_name || user?.sales_person_name || user?.user_name}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-3xl font-bold text-red-600 text-center">
            Resignation Form
          </h2>

          {/* Logout Button */}
          <div className="flex justify-center md:justify-end">
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 md:px-4 py-2 rounded-lg transition-colors font-medium text-sm md:text-base"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {renderFormFields()}
        </form>
      </div>
    </div>
  );
}

export default LeavingForm;
