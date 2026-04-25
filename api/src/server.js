import bodyParser from "body-parser";
import express from "express";
import { list, stats } from "@norman-gym/bank/db.js";
import { downloadBrain, FILE_BRAIN } from "@norman-gym/bank/brains.js";
import { consumeEvent, sendEvent } from "@norman-gym/bank/events.js";
import { syncSkill } from "@norman-gym/bank/skills.js";
import { writeTrainer } from "@norman-gym/bank/trainers.js";

const port = process.env.PORT || 3000;
const app = express();

app.disable("x-powered-by");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/progress", listItems("progress"));
app.get("/api/trainers", listItems("trainers"));
app.post("/api/trainers/:trainer", async (request, response) => {
  try {
    const trainer = request.params.trainer;

    if (!trainer || !request.body) {
      return sendError(response, { status: "ERROR", details: "Trainer and configuration are required" });
    }

    const config = {};
    const fields = {
      trainBatchSize: request.body.trainBatchSize,
      dropoutRate: request.body.dropoutRate,
      learningRate: request.body.learningRate,
      clipNorm: request.body.clipNorm
    };

    for (const [key, value] of Object.entries(fields)) {
      const num = Number(value);
      if (Number.isFinite(num)) config[key] = num;
    }

    await writeTrainer(trainer, config);

    return sendResponse(response, { status: "OK" });
  } catch (error) {
    return sendError(response, { status: "ERROR", details: error?.message || error });
  }
});

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

app.get("/api/skills", listItems("skills"));
app.post("/api/skills/sync", async (request, response) => {
  try {
    await syncSkill(request.body?.skill);

    return sendResponse(response, { status: "OK" });
  } catch (error) {
    return sendError(response, { status: "ERROR", details: error?.message || error });
  }
});

app.get("/api/bank/stats", async (_, response) => {
  return sendResponse(response, await stats());
});

app.get("/api/events", listItems("events")); // TODO: List events since given time
app.post("/api/events", postItem(sendEvent));
app.delete("/api/events/:ref", async (request, response) => {
  try {
    const { ref } = request.params;

    if (!ref) {
      return sendError(response, { status: "ERROR", details: "Event ref is required" });
    }

    await consumeEvent({ ref });

    return sendResponse(response, { status: "OK", details: { ref } });
  } catch (error) {
    return sendError(response, { status: "ERROR", details: error?.message || error });
  }
});

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
