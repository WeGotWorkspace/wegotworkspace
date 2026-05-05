import { useEffect, useState } from "react";

export function CallTimer({ startedAt }: { startedAt: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return <span className="font-mono tabular-nums">00:00:00</span>;
  const s = Math.floor((now - startedAt) / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className="font-mono tabular-nums">
      {hh}:{mm}:{ss}
    </span>
  );
}
