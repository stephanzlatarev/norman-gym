import { sendResponse } from "./http.js";
import { list, load } from "./mongo.js";
import zip from "zip-local";

export async function downloadBrain(request, response) {
  const folder = await load(request.params.brain);

  if (folder) {
    const file = request.params.brain + ".zip";

    zip.sync.zip(folder).compress().save(file);
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
