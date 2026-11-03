import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const reachable =
        state.isConnected === true && state.isInternetReachable !== false;
      setOnline(reachable);
    });
    NetInfo.fetch().then((state) => {
      const reachable =
        state.isConnected === true && state.isInternetReachable !== false;
      setOnline(reachable);
    });
    return () => unsubscribe();
  }, []);

  return online;
}