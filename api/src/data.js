import { sendResponse } from "./http.js";

export function read(_, response) {
  const size = 100;
  const state = {
    data: [
      { color: "black", values: [1.0], study: true },
      { color: "black", values: [1.0] },
    ],
    size: size,
  };
  for (let i = 0; i < size; i++) {
    state.data[0].values.push(Math.max(state.data[0].values[state.data[0].values.length - 1] - (Math.random() / 20), 0));
    state.data[1].values.push(Math.max(state.data[1].values[state.data[1].values.length - 1] - (Math.random() / 20), 0));
  }

  return sendResponse(response, state);
}
