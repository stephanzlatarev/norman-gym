import bodyParser from "body-parser";
import express from "express";
import { read } from "./data.js";

const port = process.env.PORT || 3000;
const app = express();

app.disable("x-powered-by");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api", read);

export const server = app.listen(port, () => {
  console.log(`Server successfully started on ${port}`);
});
