import { useEffect, useState } from "react";

export type ConnectivityState = {
  online: boolean;
};

export function useConnectivity(): ConnectivityState {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { online };
}

export function useOnReconnect(callback: () => void): void {
  const { online } = useConnectivity();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      return;
    }
    if (wasOffline) {
      callback();
      setWasOffline(false);
    }
  }, [callback, online, wasOffline]);
}
