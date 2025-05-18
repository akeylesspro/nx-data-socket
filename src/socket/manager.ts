import { Server as IOServer, Socket } from "socket.io";
// import { redis_pub } from "../redis";

export const register_socket_events = (io: IOServer) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🟢 Client connected: ${socket.id}`);
        socket.on("register", (user_id: string) => {
            socket.join(user_id);
            console.log(`User ${user_id} joined room`);
        });

        // socket.on("publish", ({ channel, message }) => {
        //     redis_pub.publish(channel, message);
        //     console.log(`📤 Published to Redis: ${channel} → ${message}`);
        // });

        socket.on("disconnect", () => {
            console.log(`🔴 Client disconnected: ${socket.id}`);
        });
    });
};
