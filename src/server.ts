import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import config from "./config";
import prisma from "./shared/prisma";
import { changeExpiryBookingStatus } from "./utils/cronFn/changeExpiryBookingStatus";

// ---------- WebSocket state ----------
type channelName = string;
const channelClients = new Map<channelName, Set<WebSocket>>();

function safeSend(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToChannel(
  channelName: channelName,
  data: unknown,
  excludeSocket: WebSocket | null = null,
) {
  const clients = channelClients.get(channelName);
  if (!clients) return;
  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (excludeSocket && client === excludeSocket) continue;
    safeSend(client, data);
  }
}

// ---------- Server + WS bootstrap ----------
let server: Server | null = null;
let wss: WebSocketServer | null = null;

// Heartbeat helper to detect dead connections
function installHeartbeat(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket & { isAlive?: boolean }) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));
}

async function main() {
  server = app.listen(config.port, () => {
    console.log("Server is running on port", config.port);
  });

  //   const port = Number(config.port) || 5000;
  // server = app.listen(port, "0.0.0.0", () => {
  //   console.log("Server is running on port", port);
  // });

  // start cron jobs
  changeExpiryBookingStatus();

  wss = new WebSocketServer({ server });
  installHeartbeat(wss);

  wss.on("connection", (ws: WebSocket & { isAlive?: boolean }, req) => {
    console.log("🔌 New WebSocket connection");
    let currentChannel: string | null = null;

    ws.on("message", async (raw: Buffer) => {
      try {
        const msgStr = raw.toString().trim();
        // console.log("Received WS message:", msgStr);

        const parsed = JSON.parse(msgStr);

        switch (parsed?.type) {
          case "subscribe": {
            const channelName: string = parsed.channelName;
            if (!channelName || typeof channelName !== "string") {
              safeSend(ws, { type: "error", message: "Invalid channelName" });
              return;
            }

            if (!channelClients.has(channelName)) {
              channelClients.set(channelName, new Set());
            }
            channelClients.get(channelName)!.add(ws);
            currentChannel = channelName;

            safeSend(ws, { type: "subscribed", channelName });
            break;
          }

          case "message": {
            const channelName: string = parsed.channelName;
            const messageText: string = parsed.message;
            const senderId: string = parsed.senderId || "";

            if (!channelName || typeof channelName !== "string") {
              safeSend(ws, { type: "error", message: "Invalid channelName" });
              return;
            }

            if (!senderId) {
              safeSend(ws, { type: "error", message: "senderId is required" });
              return;
            }

            // find or create channel
            let channel = await prisma.channel.findUnique({
              where: { channelName },
            });

            if (!channel) {
              channel = await prisma.channel.create({
                data: {
                  channelName,
                  person1Id: senderId,
                  person2Id: parsed.receiverId || "",
                },
              });
            }

            // save message
            const newMessage = await prisma.message.create({
              data: {
                message: messageText,
                senderId,
                channelName: channel.channelName,
                files: parsed.files || [],
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    fullName: true,
                    profileImage: true,
                  },
                },
              },
            });

            // broadcast to all clients in this channel
            broadcastToChannel(
              channel.channelName,
              {
                type: "message",
                channelName: channel.channelName,
                data: newMessage,
              },
              ws,
            );

            break;
          }

          default:
            safeSend(ws, { type: "error", message: "Unknown message type" });
        }
      } catch (err: any) {
        console.error("WS message error:", err?.message || err);
        safeSend(ws, {
          type: "error",
          message: "Malformed JSON",
          raw: raw.toString(),
        });
      }
    });

    ws.on("close", () => {
      if (currentChannel) {
        const set = channelClients.get(currentChannel);
        if (set) {
          set.delete(ws);
          if (set.size === 0) channelClients.delete(currentChannel);
        }
      }
      console.log("❌ Client disconnected");
    });

    ws.on("error", (err) => {
      console.error("WS socket error:", err);
    });
  });
}

main().catch((e) => {
  console.error("Fatal bootstrap error:", e);
  process.exit(1);
});

// ---------- Process-level safety ----------
process.on("unhandledRejection", (err) => {
  console.error("😈 unhandledRejection detected, shutting down...", err);
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.error("😈 uncaughtException detected, shutting down...", err);
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received. Closing server...");
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Closing server...");
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
