
export function sendResponse(response, data) {
  return response.status(200).send(data);
}

export function sendError(response, data, cause) {
  if (cause) {
    console.log("ERROR:", cause.message);
  }

  return response.status(cause ? 500 : 400).send(data);
}
