import { collection } from "./db.js";

export async function sendEvent(event) {
  const events = await collection("events");

  event.time = new Date();

  await events.insertOne(event);
}

export async function watchEvents(type, handle) {
  const events = await collection("events");
  const stream = events.watch([
    {
      $match: {
        operationType: "insert",
        "fullDocument.type": type,
      },
    },
  ]);

  stream.on("change", async change => {
    const event = change.fullDocument;

    try {
      await handle(event);
    } catch (error) {
      console.log("Unable to process", type, "event:", error?.message || error);
    }

    await consumeEvent(event.uuid);
  });

  stream.on("error", error => {
    console.log("Unable to watch", type, "events:", error?.message || error);
  });

  return stream;
}

export async function consumeEvent(uuid) {
  const events = await collection("events");

  await events.deleteOne({ uuid });
}
