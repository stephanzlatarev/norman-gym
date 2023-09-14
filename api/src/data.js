import { sendError, sendResponse } from "./http.js";
import { list, load } from "./mongo.js";

export async function downloadBrain(request, response) {
  const file = await load(request.params.brain);

  if (file) {
    response.download(file);
  } else {
    sendError(response, "Unable to read it from database!");
  }
}

export async function read(_, response) {
  const data = {
    progress: await list("progress", {}),
    samples: await list("samples", {}),
  };

  return sendResponse(response, data);
}

export async function readProgress(request, response) {
  const data = {
    progress: await list("progress", { brain: request.params.brain }),
    samples: await list("samples", { brain: request.params.brain }),
  };

  return sendResponse(response, data);
}

export async function readRank(_, response) {
  return sendResponse(response, await list("rank", {}));
}

export async function readSessions(_, response) {
  return sendResponse(response, await list("sessions", {}));
}
