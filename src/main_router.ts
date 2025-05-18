import { join } from "path";
import express, { Router } from "express";
import { get_version } from "akeyless-server-commons/helpers";

const main_router: Router = express.Router();

main_router.get("/", (req, res) => res.status(200).send("OK from data-socket"));

main_router.get("/api/data-socket/", (req, res) => {
    res.send(process.env.mode === "qa" ? "hello from data-socket QA" : "hello from data-socket PROD");
});
main_router.get("/api/data-socket/v", (req, res) => {
    res.send(`${get_version(join(__dirname, "../package.json"))} --${process.env.mode === "qa" ? "QA" : "PROD"}`);
});

export default main_router;
