import { useEffect, useState } from "react";

function currentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useNowMinutes() {
  const [minutes, setMinutes] = useState(currentMinutes);

  useEffect(() => {
    const interval = window.setInterval(() => setMinutes(currentMinutes()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return minutes;
}
