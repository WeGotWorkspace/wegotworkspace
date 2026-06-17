import { useEffect, useState } from "react";
import { readBrowserOnline, subscribeBrowserOnline } from "@/lib/offline/browser-online";

export type ConnectivityState = {
  online: boolean;
};

export function useConnectivity(): ConnectivityState {
  const [online, setOnline] = useState(() => readBrowserOnline());

  useEffect(() => {
    setOnline(readBrowserOnline());
    return subscribeBrowserOnline(setOnline);
  }, []);

  return { online };
}

export function useOnReconnect(callback: () => void): void {
  const { online } = useConnectivity();
  const [wasOffline, setWasOffline] = useState(() => !readBrowserOnline());

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
