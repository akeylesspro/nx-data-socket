import Redis from "ioredis";
import { logger } from "akeyless-server-commons/managers";
import { init_env_variables } from "akeyless-server-commons/helpers";

const { redis_ip, redis_port } = init_env_variables(["redis_ip", "redis_port"]);

export const redisCommander = new Redis({ host: redis_ip, port: Number(redis_port) });
export const redisListener = new Redis({ host: redis_ip, port: Number(redis_port) });

export const REDIS_DATA_UPDATE_CHANNEL_PREFIX = "data_update";
export const FIREBASE_WRITE_REQUEST_CHANNEL_PREFIX = "firebase_write_request";

redisCommander.on("connect", () => logger.log("Redis Commander connected"));
redisCommander.on("error", (err) => logger.error("Redis Commander error", err));
redisListener.on("connect", () => {
    logger.log("Redis Listener connected");
    const pattern = `${REDIS_DATA_UPDATE_CHANNEL_PREFIX}:*`;
    redisListener
        .psubscribe(pattern)
        .then(() => logger.log(`Subscribed to Redis pattern: ${pattern}`))
        .catch((err) => logger.error(`Failed to psubscribe to ${pattern}`, err));
});
redisListener.on("error", (err) => logger.error("Redis Listener error", err));
