import bodyParser from "body-parser";
import express from "express";
import { downloadBrain, lockBrain, readBrains, readProgress, readSessions, unlockBrain } from "./data.js";

const port = process.env.PORT || 3000;
const app = express();

app.disable("x-powered-by");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/brains", readBrains);
app.get("/api/brains/:brain/download", downloadBrain);
app.get("/api/brains/:brain/progress", readProgress);
app.get("/api/sessions", readSessions);

app.post("/api/brains/:brain/lock", lockBrain);
app.post("/api/brains/:brain/unlock", unlockBrain);

export const server = app.listen(port, () => {
  console.log(`Server successfully started on ${port}`);
});
