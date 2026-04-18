import { list } from "@norman-gym/bank/db.js";
import { downloadBrain, FILE_BRAIN } from "@norman-gym/bank/brains.js";
import { sendEvent } from "@norman-gym/bank/events.js";
import { sendError, sendResponse } from "./http.js";

export async function readAssignments(_, response) {
  return sendResponse(response, await list("assignments", {}));
}

export async function downloadBrainFile(request, response) {
  const brain = request.params.brain;
  const folder = "./downloads/brain/" + brain;
  const downloaded = await downloadBrain(brain, folder);

  if (downloaded) {
    response.download(folder + "/" + FILE_BRAIN);
  } else {
    return sendError(response, "Unable to read it from database!");
  }
}

export async function readBrains(_, response) {
  return sendResponse(response, await list("brains", {}));
}

export async function readEvents(_, response) {
  // TODO: Read events since the given time
  return sendResponse(response, await list("events", {}));
}

export async function postEvent(request, response) {
  const event = request.body;

  try {
    await sendEvent(event);

    return sendResponse(response, { status: "OK" });
  } catch (error) {
    return sendError(response, { status: "ERROR", details: error?.message || error });
  }
}

export async function readProgress(_, response) {
  return sendResponse(response, await list("progress", {}));
}
