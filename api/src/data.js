import { sendError, sendResponse } from "./http.js";
import { list, load, update } from "./mongo.js";

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

export async function lockBrain(request, response) {
  await update("brains", { brain: request.params.brain }, { locked: true });

  return sendResponse(response, "OK");
}

export async function unlockBrain(request, response) {
  await update("brains", { brain: request.params.brain }, { locked: false });

  return sendResponse(response, "OK");
}

export async function readRank(_, response) {
  return sendResponse(response, await list("rank", {}));
}

export async function readSessions(_, response) {
  return sendResponse(response, await list("sessions", {}));
}
