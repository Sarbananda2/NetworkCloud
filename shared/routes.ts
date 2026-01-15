import { z } from 'zod';
import { devices, deviceNetworkStates } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    session: {
      method: 'GET' as const,
      path: '/api/auth/session',
      responses: {
        200: z.object({
          authenticated: z.boolean(),
          user: z.any().optional(), // Typed more specifically in implementation if needed
        }),
      },
    },
  },
  devices: {
    list: {
      method: 'GET' as const,
      path: '/api/devices',
      responses: {
        200: z.array(z.custom<typeof devices.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/devices/:id',
      responses: {
        200: z.custom<typeof devices.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    getNetworkState: {
      method: 'GET' as const,
      path: '/api/devices/:id/network-state',
      responses: {
        200: z.custom<typeof deviceNetworkStates.$inferSelect>().nullable(), // Can be null if no state
        404: errorSchemas.notFound, // If device doesn't exist
        401: errorSchemas.unauthorized,
      },
    },
  },
};

// ============================================
// HELPER: buildUrl
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type DeviceResponse = z.infer<typeof api.devices.get.responses[200]>;
export type DeviceListResponse = z.infer<typeof api.devices.list.responses[200]>;
export type NetworkStateResponse = z.infer<typeof api.devices.getNetworkState.responses[200]>;
