import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useMe } from "../lib/useMe";
import { Alert, Pager, StatusBadge, btn, btnPrimary, input, money } from "../common";

export default function InvoicesPage() {
  const me = useMe();
  const isStaff = me && me.role !== "customer";
  const [filters, setFilters] = useState({ status: "", overdue: false, date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, size: 20 });
  const [summary, setSummary] = useState(null);
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page, size: 20 });
    if (filters.status) qs.set("status", filters.status);
    if (filters.overdue) qs.set("overdue", "true");
    if (filters.date_from) qs.set("date_from", filters.date_from);
    if (filters.date_to) qs.set("date_to", filters.date_to);
    try {
      setData(await api.get(`/invoices?${qs}`));
      if (isStaff) setSummary(await api.get("/invoices/summary"));
    } catch (e) { setMsg({ err: e.message }); }
  }, [page, filters, isStaff]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })); };
  const open = async (id) => {
    try { setSel(await api.get(`/invoices/${id}`)); } catch (e) { setMsg({ err: e.message }); }
  };
  const act = async (fn, okText) => {
    setBusy(true);
    try { await fn(); setMsg({ ok: okText }); setSel(null); await load(); }
    catch (e) { setMsg({ err: e.message }); }
    finally { setBusy(false); }
  };
  const print = async (id) => {
    try {
      const html = await api.get(`/invoices/${id}/print`);
      const w = window.open("", "_blank");
      w.document.write(html); w.document.close(); w.focus(); w.print();
    } catch (e) { setMsg({ err: e.message }); }
  };
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        {isStaff && (
          <button className={btnPrimary} disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              const r = await api.post("/billing/run");
              setMsg(r.status === "already_running" ? { err: "Billing is already running" }
                : { ok: `Checked ${r.subscriptions_checked} subscriptions, created ${r.invoices_created} invoices${r.errors.length ? `, ${r.errors.length} errors` : ""}` });
              await load();
            } catch (e) { setMsg({ err: e.message }); } finally { setBusy(false); }
          }}>Run billing now</button>
        )}
      </div>
      <Alert msg={msg} />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[["Active subscriptions", summary.active_subscriptions],
            ["Revenue collected", money(summary.revenue_collected)],
            ["Outstanding", money(summary.outstanding)],
            ["Overdue invoices", summary.overdue_count],
            ["Overdue amount", money(summary.overdue_amount)]].map(([l, v]) => (
            <div key={l} className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">{l}</div>
              <div className="text-lg font-semibold">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-xs text-gray-500">Status
          <select className={input} value={filters.status} onChange={(e) => setF("status", e.target.value)}>
            <option value="">All</option><option>Draft</option><option>Confirmed</option><option>Paid</option>
          </select>
        </label>
        <label className="text-xs text-gray-500">From
          <input type="date" className={input} value={filters.date_from} onChange={(e) => setF("date_from", e.target.value)} />
        </label>
        <label className="text-xs text-gray-500">To
          <input type="date" className={input} value={filters.date_to} onChange={(e) => setF("date_to", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={filters.overdue} onChange={(e) => setF("overdue", e.target.checked)} />
          Overdue only
        </label>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>{["Invoice", "Customer", "Period", "Due", "Total", "Paid", "Outstanding", "Status"].map((h) =>
              <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id} onClick={() => open(i.id)} className="border-t hover:bg-gray-50 cursor-pointer">
                <td className="px-3 py-2 font-medium">{i.number}</td>
                <td className="px-3 py-2">{i.profiles?.company_name}</td>
                <td className="px-3 py-2">{i.billing_period_start} → {i.billing_period_end}</td>
                <td className="px-3 py-2">{i.due_date}</td>
                <td className="px-3 py-2">{money(i.total_amount)}</td>
                <td className="px-3 py-2">{money(i.paid)}</td>
                <td className="px-3 py-2">{money(i.outstanding)}</td>
                <td className="px-3 py-2"><StatusBadge status={i.is_overdue ? "Overdue" : i.status} /></td>
              </tr>
            ))}
            {!data.items.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No invoices found</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} size={data.size} total={data.total} onChange={setPage} />

      {sel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSel(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{sel.number}</h2>
                <p className="text-sm text-gray-500">{sel.profiles?.company_name} · {sel.billing_period_start} → {sel.billing_period_end}</p>
              </div>
              <StatusBadge status={sel.is_overdue ? "Overdue" : sel.status} />
            </div>
            <table className="w-full text-sm my-4">
              <thead><tr className="text-left text-gray-500">
                <th>Product</th><th>Qty</th><th>Unit</th><th>Tax</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{sel.items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="py-1">{it.products?.name || it.product_id}</td><td>{it.quantity}</td>
                  <td>{money(it.unit_price)}</td><td>{money(it.taxes)}</td>
                  <td className="text-right">{money(it.amount)}</td></tr>))}</tbody>
            </table>
            <div className="text-sm text-right space-y-0.5">
              <div>Subtotal: {money(sel.subtotal)}</div>
              <div>Discount: −{money(sel.discount_total)}</div>
              <div>Tax: {money(sel.tax_total)}</div>
              <div className="font-semibold">Total: {money(sel.total_amount)}</div>
              <div>Paid: {money(sel.paid)}</div>
              <div className="font-semibold">Outstanding: {money(sel.outstanding)}</div>
            </div>
            {sel.payments.length > 0 && (
              <div className="mt-4 text-sm">
                <div className="font-medium mb-1">Payments</div>
                {sel.payments.map((p) => (
                  <div key={p.id} className="flex justify-between border-t py-1">
                    <span>{p.payment_date} · {p.method}{p.notes ? ` · ${p.notes}` : ""}</span>
                    <span>{money(p.amount)}</span>
                  </div>))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-5 justify-end">
              <button className={btn} onClick={() => print(sel.id)}>Print</button>
              {isStaff && sel.status === "Draft" && (
                <button className={btnPrimary} disabled={busy}
                  onClick={() => act(() => api.post(`/invoices/${sel.id}/confirm`), "Invoice confirmed")}>Confirm</button>)}
              {isStaff && sel.status === "Confirmed" && (
                <button className={btn} disabled={busy}
                  onClick={() => act(async () => {
                    const r = await api.post(`/invoices/${sel.id}/send`);
                    if (r.simulated) throw new Error(`Email not configured (simulated send to ${r.to})`);
                  }, "Invoice sent")}>Send</button>)}
              {isStaff && sel.status !== "Paid" && sel.payments.length === 0 && (
                <button className={`${btn} text-red-600`} disabled={busy}
                  onClick={() => window.confirm("Cancel this invoice?") &&
                    act(() => api.post(`/invoices/${sel.id}/cancel`), "Invoice cancelled")}>Cancel invoice</button>)}
              <button className={btn} onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
