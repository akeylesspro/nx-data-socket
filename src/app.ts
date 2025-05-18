import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";
import main_router from "./main_router";
dotenv.config();

const { redis_ip, redis_port } = process.env;

const redis_sub = new Redis({
    host: redis_ip,
    port: Number(redis_port),
});
const redis_pub = new Redis({
    host: redis_ip,
    port: Number(redis_port),
});

const app = express();
app.use(main_router);
const http_server = createServer(app);

const io = new Server(http_server, {
    path: "/api/data-socket/connect",
    cors: { origin: "*" },
});

redis_sub.psubscribe("user:*", "group:*", "admin:*");

redis_sub.on("pmessage", (pattern, channel, message) => {
    const parts = channel.split(":");
    const identifier = parts[1];

    switch (pattern) {
        case "user:*":
            io.to(identifier).emit("user_event", { channel, message });
            console.log(` Redis → user:${identifier} : ${message}`);
            break;

        case "group:*":
            io.to(`group:${identifier}`).emit("group_event", { channel, message });
            console.log(`Redis → group:${identifier} : ${message}`);
            break;

        case "admin:*":
            io.to("admin").emit("admin_event", { channel, message });
            console.log(`Redis → admin : ${message}`);
            break;

        default:
            console.warn(`Unhandled pattern: ${pattern}`);
    }
});

io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("register", (user_id: string) => {
        socket.join(user_id);
        console.log(`User ${user_id} joined room`);
    });

    socket.on("publish", ({ channel, message }) => {
        redis_pub.publish(channel, message);
        console.log(`📤 Published to Redis: ${channel} → ${message}`);
    });

    socket.on("disconnect", () => {
        console.log(`🔴 Client disconnected: ${socket.id}`);
    });
});

http_server.listen(8080, () => {
    console.log("🚀 Socket.IO server running on http://localhost:8080");
});
