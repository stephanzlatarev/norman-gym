import { connect } from "./db.js";

export async function watchOperation(type, handler) {
  const db = await connect();
  const operations = db.collection("operations");
  const stream = operations.watch([
    {
      $match: {
        operationType: "insert",
        "fullDocument.type": type,
      },
    },
  ]);

  stream.on("change", async change => {
    try {
      await handler(change.fullDocument);
    } catch (cause) {
      console.log("Error on", type, "operation:", cause?.message || cause);
    }
  });

  stream.on("error", cause => {
    console.log("Unable to watch", type, "operations:", cause?.message || cause);
  });

  return stream;
}

export async function addOperation(operation) {
  const db = await connect();
  const operations = db.collection("operations");

  operation.time = new Date();

  await operations.insertOne(operation);
}

export async function completeOperation(uuid) {
  const db = await connect();
  const operations = db.collection("operations");

  await operations.deleteOne({ uuid });
}