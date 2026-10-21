import { useCallback, useEffect, useRef, useState } from "react";

export default function useStatusMessage() {
  const [status, setStatus] = useState("");
  const timeout = useRef();
  const showStatus = useCallback((message) => {
    window.clearTimeout(timeout.current);
    setStatus(message);
    timeout.current = window.setTimeout(() => setStatus(""), 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(timeout.current), []);
  return [status, showStatus];
}
