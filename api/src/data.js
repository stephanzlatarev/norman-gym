import { sendResponse } from "./http.js";
import { getProgress } from "./mongo.js";

export async function read(_, response) {
  const progress = await getProgress();
  const data = {
    progress: progress,
  };

  return sendResponse(response, data);
}
