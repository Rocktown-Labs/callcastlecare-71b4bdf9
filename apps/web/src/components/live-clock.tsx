import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

const getCurrentTime = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date());

const LiveClock = ({ label = "Live time" }: { label?: string }) => {
  const [time, setTime] = useState(getCurrentTime);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setTime(getCurrentTime()),
      1000
    );
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/60">
      <Clock className="size-3.5 text-lime-300" />
      <span className="text-white/35">{label}</span>
      <time className="text-white/80">{time}</time>
    </div>
  );
};

export default LiveClock;
