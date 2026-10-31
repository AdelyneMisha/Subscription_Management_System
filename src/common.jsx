export const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));

const colors = {
  Draft: "bg-gray-100 text-gray-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Active: "bg-green-100 text-green-700",
  Expired: "bg-gray-200 text-gray-600",
  "Used up": "bg-amber-100 text-amber-700",
  Inactive: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.Draft}`}>
      {status}
    </span>
  );
}

export function Pager({ page, size, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
      <span>{total} records</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => onChange(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

export function Alert({ msg }) {
  if (!msg) return null;
  const err = !!msg.err;
  return (
    <div className={`mb-3 p-2 rounded text-sm ${err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
      {msg.err || msg.ok}
    </div>
  );
}

export const input = "border rounded px-2 py-1.5 text-sm w-full";
export const btn = "px-3 py-1.5 rounded text-sm font-medium border hover:bg-gray-50 disabled:opacity-40";
export const btnPrimary = "px-3 py-1.5 rounded text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40";
