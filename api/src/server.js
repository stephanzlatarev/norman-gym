import bodyParser from "body-parser";
import express from "express";
import { downloadBrainFile, readAssignments, readBrains, readEvents, readProgress, postEvent } from "./data.js";

const port = process.env.PORT || 3000;
const app = express();

app.disable("x-powered-by");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/assignments", readAssignments);
app.get("/api/brains", readBrains);
app.get("/api/brains/:brain/download", downloadBrainFile);
app.get("/api/events", readEvents);
app.get("/api/progress", readProgress);

app.post("/api/events", postEvent);

export const server = app.listen(port, () => {
  console.log(`Server successfully started on ${port}`);
});
