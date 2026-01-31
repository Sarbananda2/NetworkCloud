import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import cookie from "cookie";
import signature from "cookie-signature";
import session from "express-session";
import connectPg from "connect-pg-simple";

interface UserConnection {
  userId: string;
  ws: WebSocket;
}

const connections: UserConnection[] = [];

function getSessionStore() {
  const pgStore = connectPg(session);
  return new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    tableName: "sessions",
  });
}

async function getUserIdFromSession(req: IncomingMessage): Promise<string | null> {
  const cookies = cookie.parse(req.headers.cookie || "");
  const signedCookie = cookies["connect.sid"];
  
  if (!signedCookie) {
    return null;
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.error("[ws] SESSION_SECRET not configured");
    return null;
  }

  const sessionId = signedCookie.startsWith("s:")
    ? signature.unsign(signedCookie.slice(2), sessionSecret)
    : signedCookie;

  if (!sessionId) {
    return null;
  }

  return new Promise((resolve) => {
    const store = getSessionStore();
    store.get(sessionId, (err, sessionData) => {
      if (err || !sessionData) {
        resolve(null);
        return;
      }

      const data = sessionData as Record<string, any>;
      const passport = data.passport as { user?: { claims?: { sub?: string } } } | undefined;
      const userId = passport?.user?.claims?.sub;
      resolve(userId || null);
    });
  });
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const userId = await getUserIdFromSession(req);

    if (!userId) {
      ws.close(1008, "Unauthorized");
      return;
    }

    const connection: UserConnection = { userId, ws };
    connections.push(connection);

    ws.on("close", () => {
      const index = connections.findIndex((c) => c.ws === ws);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    });

    ws.on("error", () => {
      const index = connections.findIndex((c) => c.ws === ws);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    });

    ws.send(JSON.stringify({ type: "connected", userId }));
  });

  return wss;
}

export function notifyUser(userId: string, event: { type: string; payload?: any }) {
  const userConnections = connections.filter((c) => c.userId === userId);
  const message = JSON.stringify(event);

  for (const conn of userConnections) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(message);
    }
  }
}

export function notifyDeviceUpdate(userId: string) {
  notifyUser(userId, { type: "devices_updated" });
}
