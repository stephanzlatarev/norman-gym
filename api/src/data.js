import { sendResponse } from "./http.js";

export function read(_, response) {
  return sendResponse(response, { status: "OK" });
}
