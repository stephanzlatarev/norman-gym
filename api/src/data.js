import { sendError, sendResponse } from "./http.js";
import { list, load, update, remove } from "./mongo.js";

export async function downloadBrain(request, response) {
  const file = await load(request.params.brain);

  if (file) {
    response.download(file);
  } else {
    sendError(response, "Unable to read it from database!");
  }
}

export async function readBrains(_, response) {
  return sendResponse(response, await list("brains", {}));
}

export async function readProgress(request, response) {
  const data = {
    progress: await list("progress", { brain: request.params.brain }),
    samples: await list("samples", { brain: request.params.brain }),
  };

  return sendResponse(response, data);
}

export async function releaseBrain(request, response) {
  if (request.params.brain && request.params.brain.length) {
    await remove(request.params.brain);
  }

  return await updateBrainWithProperties(request, response, { skill: null });
}

export async function lockBrain(request, response) {
  return await updateBrainWithProperties(request, response, { locked: true });
}

export async function unlockBrain(request, response) {
  return await updateBrainWithProperties(request, response, { locked: false });
}

export async function updateBrain(request, response) {
  const properties = {};

  if (request.body.fixture !== undefined) properties["fixture"] = (request.body.fixture !== "") ? request.body.fixture : null;
  if (request.body.locked !== undefined) properties["locked"] = request.body.locked;
  if (request.body.shape !== undefined) properties["shape"] = request.body.shape;
  if (request.body.skill !== undefined) properties["skill"] = request.body.skill;

  return await updateBrainWithProperties(request, response, properties);
}

async function updateBrainWithProperties(request, response, properties) {
  if (request.params.brain && request.params.brain.length) {
    await update("brains", { brain: request.params.brain }, properties);
  }

  return sendResponse(response, "OK");
}

export async function readSessions(_, response) {
  return sendResponse(response, await list("sessions", {}));
}
