import { sendResponse } from "./http.js";
import { list } from "./mongo.js";

export async function read(_, response) {
  const data = {
    progress: await list("progress"),
    samples: await list("samples"),
  };

  return sendResponse(response, data);
}
