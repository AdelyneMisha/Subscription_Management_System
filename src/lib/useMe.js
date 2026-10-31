import { useEffect, useState } from "react";
import { api } from "./api";

// Returns the logged-in profile ({ id, role, ... }) or null while loading.
export function useMe() {
  const [me, setMe] = useState(null);
  useEffect(() => { api.get("/me").then(setMe).catch(() => setMe(null)); }, []);
  return me;
}
