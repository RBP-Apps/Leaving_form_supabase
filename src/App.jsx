import { useState, useEffect } from "react";
import supabase from "./utils/supabase";
import toast, { Toaster } from "react-hot-toast";

function App() {
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

  // 🔥 FETCH BUTTON BASED (BETTER UX)
  const fetchEmployee = async () => {
    if (!form.employee_id) {
      toast.error("Enter Employee ID");
      return;
    }

    try {
      setFetching(true);

      const { data, error } = await supabase
        .from("joining")
        .select("*")
        .eq("rbp_joining_id", form.employee_id)
        .eq("status", "Active")
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        toast.error("Employee not found or inactive");
        return;
      }

      setForm((prev) => ({
        ...prev,
        name: data.name_as_per_aadhar || "",
        mobile_number: data.mobile_number || "",
        firm_name: data.firm_name || "",
        father_name: data.father_name || "",
        date_of_joining: data.date_of_joining || "",
        work_location: data.work_location || "",
        designation: data.designation || "",
        department: data.department || "",
      }));

      toast.success("Employee Loaded ✅");
    } catch {
      toast.error("Fetch failed");
    } finally {
      setFetching(false);
    }
  };

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

    if (!selectedEmp) return;

    try {
      setFetching(true);

      const { data, error } = await supabase
        .from("joining")
        .select("*")
        .eq("rbp_joining_id", selectedEmp.rbp_joining_id)
        .eq("status", "Active")
        .single();

      if (error || !data) {
        toast.error("Employee not found");
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
    <>
      <Toaster />

      {/* FULL SCREEN */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Employee Leaving Form
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
            {/* Employee ID + Button */}
            <div className="col-span-2">
              <input
                list="employeeNames"
                className="w-full p-3 border rounded-lg"
                placeholder="Search Employee Name *"
                value={form.name}
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
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Name"
              value={form.employee_id}
              readOnly
            />
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Mobile"
              value={form.mobile_number}
              onChange={handleChange}
              name="mobile_number"
            />
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Firm"
              value={form.firm_name}
              readOnly
            />
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Father Name"
              value={form.father_name}
              readOnly
            />
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Joining Date"
              value={form.date_of_joining}
              readOnly
            />
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Work Location"
              value={form.work_location}
            />
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Designation"
              value={form.designation}
              readOnly
            />
            <input
              className="p-3 border rounded bg-gray-100"
              placeholder="Department"
              value={form.department}
              readOnly
            />

            {/* Reason */}
            <textarea
              className="col-span-2 p-3 border rounded-lg"
              placeholder="Reason of Leaving *"
              name="reason_of_leaving"
              value={form.reason_of_leaving}
              onChange={handleChange}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default App;
