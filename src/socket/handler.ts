import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import { register_socket_events } from "./manager";
// import { redis_sub } from "../redis";

export const initialize_socket_io = (http_server: HttpServer) => {
    const io = new IOServer(http_server, {
        path: "/api/data-socket/connect",
        cors: { origin: "*" },
    });

    register_socket_events(io);

    // redis_sub.psubscribe("user:*", "group:*", "admin:*");

    // redis_sub.on("pmessage", (pattern, channel, message) => {
    //     const parts = channel.split(":");
    //     const identifier = parts[1];

    //     switch (pattern) {
    //         case "user:*":
    //             io.to(identifier).emit("user_event", { channel, message });
    //             console.log(`Redis → user:${identifier} : ${message}`);
    //             break;

    //         case "group:*":
    //             io.to(`group:${identifier}`).emit("group_event", { channel, message });
    //             console.log(`Redis → group:${identifier} : ${message}`);
    //             break;

    //         case "admin:*":
    //             io.to("admin").emit("admin_event", { channel, message });
    //             console.log(`Redis → admin : ${message}`);
    //             break;

    //         default:
    //             console.warn(`Unhandled pattern: ${pattern}`);
    //     }
    // });
};
