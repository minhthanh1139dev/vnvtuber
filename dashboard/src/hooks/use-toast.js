import { useCallback, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showNotice = useCallback((type, message) => {
    setToast({ type, message });
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, []);

  return { toast, showNotice };
}
