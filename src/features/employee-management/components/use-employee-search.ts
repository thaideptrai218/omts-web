import { useEffect, useState } from "react";

export function useEmployeeSearch(query: string) {
  const [settledQuery, setSettledQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  // Clearing the search must not leave an old result visible for another 300ms.
  return query.trim() ? settledQuery : "";
}
