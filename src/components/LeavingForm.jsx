import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { LogOut, User as UserIcon } from "lucide-react";

function LeavingForm() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);

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
      // Use sales_person_name from the 'users' table
      const userName = user.sales_person_name || user.user_name;
      if (userName && !form.employee_id) {
        setForm(prev => ({ ...prev, name: userName }));
        // Use a small timeout to ensure employeeOptions are loaded if needed, 
        // but handleNameSelect now searches the DB directly with ilike
        handleNameSelect(userName);
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

  const handleNameSelect = async (selectedName) => {
    const selectedEmp = employeeOptions.find(
      (emp) => emp.name_as_per_aadhar === selectedName,
    );

    // If not found in current options but we have a name (e.g. from pre-fill), 
    // we might need to fetch by name directly
    let empId = selectedEmp?.rbp_joining_id;

    try {
      setFetching(true);

      let query = supabase.from("joining").select("*").eq("status", "Active");
      
      if (empId) {
        query = query.eq("rbp_joining_id", empId);
      } else {
        // Use ilike and wildcards to handle casing and prefixes (like MS/MR)
        query = query.ilike("name_as_per_aadhar", `%${selectedName.trim()}%`);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        // Only toast error if manually selecting, maybe not on pre-fill
        if (empId) toast.error("Employee details not found");
        return;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-800 p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl p-4 md:p-8 relative">

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">

          {/* User Info */}
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <UserIcon size={20} />
            </div>
            <span className="font-bold text-gray-700 text-sm md:text-base">
              {user?.sales_person_name || user?.user_name}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-3xl font-bold text-red-600 text-center">
            Employee Leaving Form
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

        {/* <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5"> */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {/* Employee ID + Button */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee Name *</label>
            <input
              list="employeeNames"
              className="w-full p-3 border cursor-not-allowed rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
            <input
              className="w-full p-3 border rounded bg-gray-50"
              placeholder="Employee ID"
              value={form.employee_id}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
            <input
              className="w-full p-3 border rounded bg-gray-50"
              placeholder="Mobile"
              disabled
              value={form.mobile_number}
              onChange={handleChange}
              name="mobile_number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firm</label>
            <input
              className="w-full p-3 border rounded bg-gray-50"
              placeholder="Firm"
              value={form.firm_name}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
            <input
              className="w-full p-3 border rounded bg-gray-50 "
              placeholder="Father Name"
              value={form.father_name}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
            <input
              className="w-full p-3 border rounded bg-gray-50"
              placeholder="Joining Date"
              value={form.date_of_joining}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Location</label>
            <input
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Work Location"
              value={form.work_location}
              disabled
              name="work_location"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <input
              className="w-full p-3 border rounded bg-gray-50"
              placeholder="Designation"
              value={form.designation}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              className="w-full p-3 border rounded bg-gray-50"
              placeholder="Department"
              value={form.department}
              readOnly
            />
          </div>

          {/* Reason */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason of Leaving *</label>
            <textarea
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
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
            className={`col-span-1 md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold text-lg shadow-md transition-all ${loading || fetching ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? "Submitting..." : fetching ? "Loading Data..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LeavingForm;
