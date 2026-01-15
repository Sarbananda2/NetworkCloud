import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// GET /api/devices
export function useDevices() {
  return useQuery({
    queryKey: [api.devices.list.path],
    queryFn: async () => {
      const res = await fetch(api.devices.list.path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch devices");
      return api.devices.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/devices/:id
export function useDevice(id: number) {
  return useQuery({
    queryKey: [api.devices.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.devices.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (res.status === 404) throw new Error("Device not found");
      if (!res.ok) throw new Error("Failed to fetch device");
      return api.devices.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// GET /api/devices/:id/network-state
export function useDeviceNetworkState(id: number) {
  return useQuery({
    queryKey: [api.devices.getNetworkState.path, id],
    queryFn: async () => {
      const url = buildUrl(api.devices.getNetworkState.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (res.status === 404) return null; // Handle missing state gracefully
      if (!res.ok) throw new Error("Failed to fetch network state");
      
      const data = await res.json();
      if (!data) return null;
      
      return api.devices.getNetworkState.responses[200].parse(data);
    },
    enabled: !!id,
  });
}
