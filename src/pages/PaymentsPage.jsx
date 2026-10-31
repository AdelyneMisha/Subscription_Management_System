import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useMe } from "../lib/useMe";
import { Alert, Pager, btnPrimary, input, money } from "../common";

const METHODS = ["Cash", "Card", "UPI", "Bank Transfer", "Cheque"];
const today = () => new Date().toISOString().slice(0, 10);

export default function PaymentsPage() {
  const me = useMe();
  const isStaff = me && me.role !== "customer";
  const [open, setOpen] = useState([]);       // confirmed (unpaid) invoices
  const [form, setForm] = useState({ invoice_id: "", method: "UPI", amount: "", payment_date: today(), notes: "" });
  const [filters, setFilters] = useState({ method: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, size: 20 });
  const [msg, setMsg] = useState(null);

  const loadOpen = useCallback(() => {
    if (isStaff) api.get("/invoices?status=Confirmed&size=100").then((r) => setOpen(r.items)).catch(() => {});
  }, [isStaff]);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, size: 20 });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    api.get(`/payments?${qs}`).then(setData).catch((e) => setMsg({ err: e.message }));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOpen(); }, [loadOpen]);

  const chosen = open.find((i) => String(i.id) === String(form.invoice_id));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/payments", { ...form, invoice_id: +form.invoice_id, amount: +form.amount, notes: form.notes || null });
      setMsg({ ok: r.invoice_status === "Paid" ? "Payment recorded — invoice fully paid" : `Payment recorded — ${money(r.outstanding)} still outstanding` });
      setForm({ invoice_id: "", method: "UPI", amount: "", payment_date: today(), notes: "" });
      load(); loadOpen();
    } catch (err) { setMsg({ err: err.message }); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Payments</h1>
      <Alert msg={msg} />

      {isStaff && (
        <form onSubmit={submit} className="border rounded-lg p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="text-xs text-gray-500 col-span-2">Invoice
            <select required className={input} value={form.invoice_id}
              onChange={(e) => {
                const inv = open.find((i) => String(i.id) === e.target.value);
                setForm((f) => ({ ...f, invoice_id: e.target.value, amount: inv ? inv.outstanding : "" }));
              }}>
              <option value="">Select unpaid invoice…</option>
              {open.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} · {i.profiles?.company_name} · due {i.due_date} · owes {money(i.outstanding)}{i.is_overdue ? " (OVERDUE)" : ""}
                </option>))}
            </select></label>
          <label className="text-xs text-gray-500">Method
            <select className={input} value={form.method} onChange={(e) => set("method", e.target.value)}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="text-xs text-gray-500">Amount {chosen && `(max ${chosen.outstanding})`}
            <input required type="number" step="0.01" min="0.01" max={chosen?.outstanding} className={input}
              value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
          <label className="text-xs text-gray-500">Date
            <input required type="date" className={input} value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} /></label>
          <label className="text-xs text-gray-500 col-span-2 md:col-span-4">Notes
            <input className={input} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Reference number, remarks…" /></label>
          <div className="flex items-end justify-end"><button className={btnPrimary}>Record payment</button></div>
        </form>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-3">
        <label className="text-xs text-gray-500">Method
          <select className={input} value={filters.method} onChange={(e) => { setPage(1); setFilters({ ...filters, method: e.target.value }); }}>
            <option value="">All</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label className="text-xs text-gray-500">From
          <input type="date" className={input} value={filters.date_from} onChange={(e) => { setPage(1); setFilters({ ...filters, date_from: e.target.value }); }} /></label>
        <label className="text-xs text-gray-500">To
          <input type="date" className={input} value={filters.date_to} onChange={(e) => { setPage(1); setFilters({ ...filters, date_to: e.target.value }); }} /></label>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>{["Date", "Invoice", "Customer", "Method", "Amount", "Notes"].map((h) =>
              <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.payment_date}</td>
                <td className="px-3 py-2">INV-{String(p.invoice_id).padStart(6, "0")}</td>
                <td className="px-3 py-2">{p.invoices?.profiles?.company_name}</td>
                <td className="px-3 py-2">{p.method}</td>
                <td className="px-3 py-2">{money(p.amount)}</td>
                <td className="px-3 py-2 text-gray-500">{p.notes}</td>
              </tr>))}
            {!data.items.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No payments found</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} size={data.size} total={data.total} onChange={setPage} />
    </div>
  );
}
