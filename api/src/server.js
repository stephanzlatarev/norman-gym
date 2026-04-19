import bodyParser from "body-parser";
import express from "express";
import { list, stats } from "@norman-gym/bank/db.js";
import { downloadBrain, FILE_BRAIN } from "@norman-gym/bank/brains.js";
import { sendEvent } from "@norman-gym/bank/events.js";

const port = process.env.PORT || 3000;
const app = express();

app.disable("x-powered-by");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/assignments", listItems("assignments"));
app.get("/api/progress", listItems("progress"));

app.get("/api/brains", listItems("brains"));
app.get("/api/brains/:brain/download", async (request, response) => {
  const brain = request.params.brain;
  const folder = "./downloads/brain/" + brain;
  const downloaded = await downloadBrain(brain, folder);

  if (downloaded) {
    response.download(folder + "/" + FILE_BRAIN);
  } else {
    return sendError(response, "Unable to read it from database!");
  }
});

app.get("/api/bank/stats", async (_, response) => {
  return sendResponse(response, await stats());
});

app.get("/api/events", listItems("events")); // TODO: List events since given time
app.post("/api/events", postItem(sendEvent));

export const server = app.listen(port, () => {
  console.log(`Server successfully started on ${port}`);
});

///////////////////////////////////////////////////////////
// Utility functions

function listItems(collection) {
  return async function(_, response) {
    return sendResponse(response, await list(collection, {}));
  }
}

function postItem(send) {
  return async function(request, response) {
    try {
      let details = await send(request.body);

      return sendResponse(response, { status: "OK", details });
    } catch (error) {
      return sendError(response, { status: "ERROR", details: error?.message || error });
    }
  }
}

function sendResponse(response, data) {
  return response.status(200).send(data);
}

function sendError(response, data, cause) {
  if (cause) {
    console.log("ERROR:", cause.message);
  }

  return response.status(cause ? 500 : 400).send(data);
}
