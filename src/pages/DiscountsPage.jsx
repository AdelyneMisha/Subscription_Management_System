import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useMe } from "../lib/useMe";
import { Alert, StatusBadge, btn, btnPrimary, input } from "../common";

const empty = {
  code: "", rule_type: "percentage", value: "", min_purchase: 0, min_quantity: 0,
  start_date: "", end_date: "", usage_limit: 100, target_type: "product", target_id: "", is_active: true,
};

function state(d) {
  const today = new Date().toISOString().slice(0, 10);
  if (!d.is_active) return "Inactive";
  if (d.end_date < today || d.start_date > today) return "Expired";
  if (d.usage_limit != null && d.usage_count >= d.usage_limit) return "Used up";
  return "Active";
}

export default function DiscountsPage() {
  const me = useMe();
  const isAdmin = me?.role === "admin";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);   // null = hidden
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api.get("/discounts").then(setRows).catch((e) => setMsg({ err: e.message }));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      code: form.code || null,
      value: +form.value,
      min_purchase: +form.min_purchase || 0,
      min_quantity: +form.min_quantity || 0,
      usage_limit: form.usage_limit === "" ? null : +form.usage_limit,
      target_id: form.target_id === "" || form.target_id == null ? null : +form.target_id,
    };
    try {
      editId ? await api.put(`/discounts/${editId}`, body) : await api.post("/discounts", body);
      setMsg({ ok: editId ? "Discount updated" : "Discount created" });
      setForm(null); setEditId(null); load();
    } catch (err) { setMsg({ err: err.message }); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this discount?")) return;
    try { await api.del(`/discounts/${id}`); load(); } catch (e) { setMsg({ err: e.message }); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Discounts</h1>
        {isAdmin && !form && <button className={btnPrimary} onClick={() => { setForm(empty); setEditId(null); }}>New discount</button>}
      </div>
      <Alert msg={msg} />

      {form && (
        <form onSubmit={submit} className="border rounded-lg p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-xs text-gray-500">Code (optional)
            <input className={input} value={form.code || ""} onChange={(e) => set("code", e.target.value)} /></label>
          <label className="text-xs text-gray-500">Type
            <select className={input} value={form.rule_type} onChange={(e) => set("rule_type", e.target.value)}>
              <option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label className="text-xs text-gray-500">Value
            <input required type="number" step="0.01" min="0" className={input} value={form.value} onChange={(e) => set("value", e.target.value)} /></label>
          <label className="text-xs text-gray-500">Usage limit (blank = unlimited)
            <input type="number" min="1" className={input} value={form.usage_limit ?? ""} onChange={(e) => set("usage_limit", e.target.value)} /></label>
          <label className="text-xs text-gray-500">Min purchase
            <input type="number" step="0.01" min="0" className={input} value={form.min_purchase} onChange={(e) => set("min_purchase", e.target.value)} /></label>
          <label className="text-xs text-gray-500">Min quantity
            <input type="number" min="0" className={input} value={form.min_quantity} onChange={(e) => set("min_quantity", e.target.value)} /></label>
          <label className="text-xs text-gray-500">Start date
            <input required type="date" className={input} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></label>
          <label className="text-xs text-gray-500">End date
            <input required type="date" className={input} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></label>
          <label className="text-xs text-gray-500">Applies to
            <select className={input} value={form.target_type} onChange={(e) => set("target_type", e.target.value)}>
              <option value="product">A product</option><option value="subscription">A subscription</option></select></label>
          <label className="text-xs text-gray-500">Target ID (blank = all)
            <input type="number" min="1" className={input} value={form.target_id ?? ""} onChange={(e) => set("target_id", e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm self-end pb-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active</label>
          <div className="flex gap-2 items-end justify-end col-span-2 md:col-span-1">
            <button type="button" className={btn} onClick={() => { setForm(null); setEditId(null); }}>Cancel</button>
            <button className={btnPrimary}>{editId ? "Save" : "Create"}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>{["Code", "Rule", "Applies to", "Conditions", "Valid", "Usage", "State", ""].map((h) =>
              <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2 font-medium">{d.code || "—"}</td>
                <td className="px-3 py-2">{d.rule_type === "percentage" ? `${d.value}%` : `₹${d.value}`}</td>
                <td className="px-3 py-2">{d.target_type} {d.target_id ? `#${d.target_id}` : "(all)"}</td>
                <td className="px-3 py-2">min ₹{d.min_purchase} · min qty {d.min_quantity}</td>
                <td className="px-3 py-2">{d.start_date} → {d.end_date}</td>
                <td className="px-3 py-2">{d.usage_count}/{d.usage_limit ?? "∞"}</td>
                <td className="px-3 py-2"><StatusBadge status={state(d)} /></td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {isAdmin && <>
                    <button className="text-indigo-600 mr-3" onClick={() => { setEditId(d.id); setForm({ ...d, code: d.code || "" }); window.scrollTo(0, 0); }}>Edit</button>
                    <button className="text-red-600" onClick={() => remove(d.id)}>Delete</button></>}
                </td>
              </tr>))}
            {!rows.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No discounts yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
