import express from "express";
import { createServer } from "http";
import main_router from "./main_router";
import { initialize_socket_io } from "./socket/handler";
import { get_version, init_env_variables } from "akeyless-server-commons/helpers";
import { logger } from "akeyless-server-commons/managers";
import { join } from "path";

const { port, mode } = init_env_variables(["port", "mode"]);

const app = express();
app.use(main_router);

const http_server = createServer(app);
initialize_socket_io(http_server);

const version = get_version(join(__dirname, "../package.json"));

http_server.listen(Number(port), () => {
    logger.log(`Server is running at http://localhost:${port}`);
    logger.log("Project status", { project_name: "data-socket", version, environment: mode });
});
