import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, method = "GET", body) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const type = res.headers.get("content-type") || "";
  return type.includes("json") ? res.json() : res.text();
}

export const api = {
  get: (p) => request(p),
  post: (p, b = {}) => request(p, "POST", b),
  put: (p, b) => request(p, "PUT", b),
  del: (p) => request(p, "DELETE"),
};
