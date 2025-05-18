import { join } from "path";
import express, { Router } from "express";
import { MainRouter } from "akeyless-server-commons/types";
import { get_version } from "akeyless-server-commons/helpers";

const root_router: Router = express.Router();
const cache_server_router: Router = express.Router();

/// basic routes
root_router.get("/", (req, res) => res.status(200).send("OK from cache_server"));
cache_server_router.get("/", (req, res) => {
    res.send(process.env.mode === "qa" ? "hello from cache-server QA" : "hello from cache-server PROD");
});
cache_server_router.get("/v", (req, res) => {
    res.send(`${get_version(join(__dirname, "../package.json"))} --${process.env.mode === "qa" ? "QA" : "PROD"}`);
});

root_router.use("/api/cache-server/", cache_server_router);

const main_router: MainRouter = (app) => {
    app.use(root_router);
};

export default main_router;
