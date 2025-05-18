import { WebSocketServer, WebSocket } from "ws";
import Redis from "ioredis";
import { init_env_variables } from "akeyless-server-commons/helpers";

const { REDIS_HOST, REDIS_PORT } = init_env_variables(["REDIS_HOST", "REDIS_PORT"]);

const redis_sub = new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
});
const redis_pub = new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
});

const redis_data = new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
});

const clients: Record<string, Set<WebSocket>> = {};
const connection_count: Record<string, number> = {};

const wss = new WebSocketServer({ port: 9009 });
console.log("✅ WebSocket server started on ws://localhost:9009");

interface Message {
    type: string;
    user_id?: string;
    key?: string;
    value?: any;
    channel?: string;
}

wss.on("connection", (ws) => {
    let user_id: string | null = null;

    ws.on("message", async (msg: string) => {
        try {
            const data: Message = JSON.parse(msg);

            if (data.type === "register" && data.user_id) {
                user_id = data.user_id as string;

                if (!clients[user_id]) clients[user_id] = new Set();
                clients[user_id].add(ws);

                connection_count[user_id] = (connection_count[user_id] || 0) + 1;
                console.log(`🟢 [${user_id}] connected (${connection_count[user_id]})`);

                if (connection_count[user_id] === 1) {
                    await redis_sub.psubscribe(`user:${user_id}`);
                    console.log(`📡 Subscribed to Redis: user:${user_id}`);
                }
            }

            if (data.type === "set" && data.key && data.value) {
                await redis_data.set(data.key, data.value);
            }
            if (data.type === "get" && data.key && data.value) {
                await redis_data.get(data.key);
            }

            if (data.type === "publish" && data.channel && data.value) {
                await redis_pub.publish("last_locations:0546559314", data.value);
                await redis_pub.publish(data.channel, data.value);
            }
        } catch (e) {
            console.error("❌ Invalid message:", msg);
        }
    });

    ws.on("close", async () => {
        if (user_id && clients[user_id]) {
            clients[user_id].delete(ws);
            connection_count[user_id]--;

            console.log(`🔴 [${user_id}] disconnected (${connection_count[user_id]})`);

            if (connection_count[user_id] === 0) {
                await redis_sub.punsubscribe(`user:${user_id}`);
                delete clients[user_id];
                delete connection_count[user_id];
                console.log(`🚪 Unsubscribed from Redis: user:${user_id}`);
            }
        }
    });
});

redis_sub.on("pmessage", (pattern, channel, message) => {
    const user_id = channel.split(":")[1];
    const receivers = clients[user_id];
    if (receivers) {
        receivers.forEach((ws) => {
            ws.send(JSON.stringify({ channel, message }));
        });
    }
});

redis_sub.subscribe("last_locations");

redis_sub.psubscribe("last_locations:*");

redis_sub.on("message", (channel, message) => {
    Object.values(clients).forEach((set) => {
        set.forEach((ws) => {
            ws.send(JSON.stringify({ channel, message }));
        });
    });
});
