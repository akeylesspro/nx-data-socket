import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { redisCommander, redisListener, REDIS_DATA_UPDATE_CHANNEL_PREFIX, FIREBASE_WRITE_REQUEST_CHANNEL_PREFIX } from "../redis";
import { logger } from "akeyless-server-commons/managers";

export const initialize_socket_io = (http_server: HttpServer) => {
    const io = new IOServer(http_server, {
        path: "/api/data-socket/connect",
        cors: { origin: "*" },
    });

    io.on("connection", (socket: Socket) => {
        logger.log(`🟢 Client connected: ${socket.id}`);

        // 1. Saving a specific value in Redis (optionally to Firebase)
        socket.on(
            "set_data",
            async (
                payload: {
                    key?: string; // For direct Redis key (if not collection based)
                    collectionName?: string; // If part of a known collection
                    documentId?: string; // If part of a known collection
                    data: any;
                    persistToFirebase?: boolean;
                    firebaseOperation?: "set" | "update" | "delete"; // Default 'set' if persistToFirebase
                    firebaseMerge?: boolean; // For 'set' operation
                },
                ack?: (response: { success: boolean; message?: string; id?: string }) => void
            ) => {
                const { key, collectionName, documentId, data, persistToFirebase, firebaseOperation = "set", firebaseMerge } = payload;

                try {
                    if (persistToFirebase) {
                        if (!collectionName || !documentId) {
                            const msg = "collectionName and documentId are required for Firebase persistence.";
                            logger.warn(`[Socket ${socket.id}] set_data error: ${msg}`, payload);
                            ack?.({ success: false, message: msg });
                            return;
                        }
                        const requestChannel = `${FIREBASE_WRITE_REQUEST_CHANNEL_PREFIX}:${collectionName}`;
                        const firebasePayload = { documentId, data, operation: firebaseOperation, merge: firebaseMerge };

                        await redisCommander.publish(requestChannel, JSON.stringify(firebasePayload));
                        logger.log(`[Socket ${socket.id}] Queued Firebase write for ${collectionName}/${documentId} via ${requestChannel}`);
                        ack?.({ success: true, message: "Data queued for Firebase persistence.", id: documentId });
                    } else {
                        // Direct Redis save (not going to Firebase via this flow)
                        let redisKey = key;
                        if (!redisKey) {
                            const msg = "A 'key' or 'collectionName' & 'documentId' is required for direct Redis save.";
                            logger.warn(`[Socket ${socket.id}] set_data error: ${msg}`, payload);
                            ack?.({ success: false, message: msg });
                            return;
                        }
                        // await redisCommander.publish(requestChannel, JSON.stringify(firebasePayload));
                        await redisCommander.set(redisKey, JSON.stringify(data));
                        logger.log(`[Socket ${socket.id}] Saved data directly to Redis key: ${redisKey}`);
                        ack?.({ success: true, message: "Data saved to Redis.", id: redisKey });
                        // Optional: If direct Redis writes also need to be broadcasted to other socket clients
                        // you might publish to a different Redis channel here that redisListener also listens to.
                        // E.g., redisCommander.publish(`redis_direct_change:${redisKey}`, JSON.stringify({ data }));
                    }
                } catch (error) {
                    logger.error(`[Socket ${socket.id}] Error in set_data:`, error);
                    ack?.({ success: false, message: "An error occurred." });
                }
            }
        );

        // 2. Receiving a specific value
        socket.on(
            "get_data",
            async (
                payload: {
                    key?: string;
                    collectionName?: string;
                    documentId?: string;
                },
                ack?: (response: { success: boolean; data?: any; message?: string; found?: boolean }) => void
            ) => {
                let redisKeyToGet = payload.key;
                if (!redisKeyToGet && payload.collectionName && payload.documentId) {
                    redisKeyToGet = `${payload.collectionName}:${payload.documentId}`;
                }

                if (!redisKeyToGet) {
                    ack?.({ success: false, message: "Key or collectionName/documentId required." });
                    return;
                }

                try {
                    const rawValue = await redisCommander.get(redisKeyToGet);
                    if (rawValue === null) {
                        ack?.({ success: true, found: false, message: "Data not found." });
                    } else {
                        ack?.({ success: true, found: true, data: JSON.parse(rawValue) });
                    }
                } catch (error) {
                    logger.error(`[Socket ${socket.id}] Error in get_data for key ${redisKeyToGet}:`, error);
                    ack?.({ success: false, message: "Error fetching data." });
                }
            }
        );

        // 3. Subscribing to a collection in Redis
        const subscribedCollections = new Set<string>(); // Track per-socket subscriptions
        socket.on(
            "subscribe_collections",
            async (collections: string | string[], ack?: (response: { success: boolean; message?: string }) => void) => {
                const collectionsToSubscribe = Array.isArray(collections) ? collections : [collections];
                logger.log(`[Socket ${socket.id}] Requested subscription to collections: ${collectionsToSubscribe.join(", ")}`);

                for (const collectionName of collectionsToSubscribe) {
                    if (subscribedCollections.has(collectionName)) {
                        logger.log(`[Socket ${socket.id}] Already subscribed to ${collectionName}.`);
                        continue;
                    }
                    socket.join(collectionName);
                    subscribedCollections.add(collectionName);
                    logger.log(`[Socket ${socket.id}] Joined room: ${collectionName}`);

                    // Fetch and send initial data for this collection
                    try {
                        const keys = await redisCommander.keys(`${collectionName}:*`);
                        let initialData = [];
                        if (keys.length > 0) {
                            const values = await redisCommander.mget(keys);
                            initialData = values.map((v) => (v ? JSON.parse(v) : null)).filter(Boolean);
                        }
                        socket.emit(`initial_data:${collectionName}`, initialData);
                        logger.log(`[Socket ${socket.id}] Sent initial data for ${collectionName} (${initialData.length} items)`);
                    } catch (error) {
                        logger.error(`[Socket ${socket.id}] Error fetching initial data for ${collectionName}:`, error);
                        socket.emit(`subscription_error:${collectionName}`, { error: "Failed to fetch initial data" });
                    }
                }
                ack?.({ success: true, message: `Subscribed to ${collectionsToSubscribe.join(", ")}` });
            }
        );

        socket.on("unsubscribe_collections", (collections: string | string[], ack?: (response: { success: boolean; message?: string }) => void) => {
            const collectionsToUnsubscribe = Array.isArray(collections) ? collections : [collections];
            logger.log(`[Socket ${socket.id}] Requested unsubscription from: ${collectionsToUnsubscribe.join(", ")}`);
            for (const collectionName of collectionsToUnsubscribe) {
                socket.leave(collectionName);
                subscribedCollections.delete(collectionName);
                logger.log(`[Socket ${socket.id}] Left room: ${collectionName}`);
            }
            ack?.({ success: true, message: `Unsubscribed from ${collectionsToUnsubscribe.join(", ")}` });
        });

        socket.on("disconnect", () => {
            logger.log(`🔴 Client disconnected: ${socket.id}`);
            // Subscriptions are automatically cleaned up when socket leaves rooms on disconnect
            subscribedCollections.clear();
        });
    });

    // 4. Real-time updates for subscribed clients (from Redis pub/sub)
    // This listener is set up once when redisListener connects.
    redisListener.on("pmessage", (pattern, channel, message) => {
        // pattern: data_update:*
        // channel: data_update:collectionName:documentId
        // message: { collection, id, type, data } from nx-data-sync
        logger.log(`📢 Redis PMessage on pattern '${pattern}', channel '${channel}'`);
        try {
            const parts = channel.split(":");
            if (parts.length < 3 || parts[0] !== REDIS_DATA_UPDATE_CHANNEL_PREFIX.replace(":*", "")) {
                // Ensure it's our expected channel
                logger.warn("Received malformed or unexpected Redis channel message:", channel);
                return;
            }
            const collectionName = parts[1]; // e.g., "units"
            const updatePayload = JSON.parse(message);

            // Emit to the Socket.IO room named after the collection
            io.to(collectionName).emit("collection_update", updatePayload);
            logger.log(`📬 Emitted 'collection_update' to room '${collectionName}' for doc '${updatePayload.id}' (type: ${updatePayload.type})`);
        } catch (error) {
            logger.error("Error processing Redis pmessage or emitting to socket:", error);
        }
    });

    logger.log("Socket.IO initialized and event handlers registered.");
};
