import { collection } from "./db.js";

const handlers = [];
let running = false;

export async function sendEvent(event) {
  const events = await collection("events");

  event.time = new Date();

  await events.insertOne(event);
}

export async function watchEvents(type, handle) {
  handlers.push({ type, handle });
}

export async function consumeEvent(event) {
  const events = await collection("events");

  if (event?.ref) {
    await events.deleteOne({ ref: event.ref });
    return;
  }

  if (event?._id) {
    await events.deleteOne({ _id: event._id });
  }
}

async function poll() {
  if (running) return;

  try {
    running = true;

    for (const { type, handle } of handlers) {
      try {
        await process(type, handle);
      } catch (error) {
        console.log("Unable to poll", type, "events:", error?.message || error);
      }
    }
  } finally {
    running = false;
  }
}

async function process(type, handle) {
  const events = await collection("events");
  const pending = await events.find({ type }).sort({ time: 1 }).limit(100).toArray();

  for (const event of pending) {
    try {
      await handle(event);
    } catch (error) {
      console.log("Unable to process", type, "event:", error?.message || error);
    }

    await consumeEvent(event);
  }
}

setInterval(poll, 1000);
