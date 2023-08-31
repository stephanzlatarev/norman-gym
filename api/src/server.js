import bodyParser from "body-parser";
import express from "express";
import { read, readProgress, readRank, readSessions } from "./data.js";

const port = process.env.PORT || 3000;
const app = express();

app.disable("x-powered-by");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api", read);
app.get("/api/progress/:brain", readProgress);
app.get("/api/rank", readRank);
app.get("/api/session", readSessions);

export const server = app.listen(port, () => {
  console.log(`Server successfully started on ${port}`);
});
