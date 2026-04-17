import fs from "fs";
import { MongoClient, GridFSBucket } from "mongodb";
import { finished } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(finished);

let db = null;

async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017", { connectTimeoutMS: 0 });

    await client.connect();

    db = client.db("gym");

    db.collection("progress").createIndex({ time: 1 }, { expireAfterSeconds: 60 * 60 });
    db.collection("operations").createIndex({ time: 1 }, { expireAfterSeconds: 60 * 60 });

    // TEMPORARY
    await addAssignment();
    // TEMPORARY
  }

  return db;
}

// TEMPORARY
const ASSIGNMENTS = [
  {
    trainer: "trainer-0",
    brain: "tic-tac-toe",
    skill: "https://github.com/stephanzlatarev/test/gym/skill/tic-tac-toe",
    config: {
      attributeWidth: 64,
      objectWidth: 128,
      brainWidth: 512,
      brainLayers: 4,
      attentionHeads: 8,
      attentionGroups: 2,
      dropoutRate: 0.1,
      batchSize: 100,
    }
  },
  {
    trainer: "trainer-1",
    brain: "melee",
    skill: "https://github.com/stephanzlatarev/test/gym/skill/melee",
    config: {
      attributeWidth: 64,
      objectWidth: 128,
      brainWidth: 512,
      brainLayers: 2,
      attentionHeads: 8,
      attentionGroups: 2,
      dropoutRate: 0.1,
      batchSize: 100,
    }
  },
];
async function addAssignment() {
  const db = await connect();
  const assignments = db.collection("assignments");

  for (const assignment of ASSIGNMENTS) {
    await assignments.updateOne({ trainer: assignment.trainer }, { $set: assignment }, { upsert: true });
  }
}

export async function readAssignment(trainer) {
  const db = await connect();
  const assignments = db.collection("assignments");

  return assignments.findOne({ trainer });
}

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

export async function writeOperation(operation) {
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

export async function writeProgress(trainer, progress) {
  const db = await connect();
  const progresses = db.collection("progress");

  progress.time = new Date();
  progress.trainer = trainer;

  await progresses.insertOne(progress);

  console.log("[progress]", JSON.stringify(progress));
}

export async function loadBrain(brain, folder) {
  const db = await connect();
  const bucket = new GridFSBucket(db);
  const records = bucket.find({ filename: brain + "-weights" });

  if (await records.hasNext()) {
    const record = await records.next();
    const timestamp = new Date(record.uploadDate).getTime();

    await pipelineAsync(bucket.openDownloadStreamByName(brain + "-weights").pipe(fs.createWriteStream(folder + "/weights.bin")));

    if (await bucket.find({ filename: brain + "-model" }).hasNext()) {
      await pipelineAsync(bucket.openDownloadStreamByName(brain + "-model").pipe(fs.createWriteStream(folder + "/model.json")));

      return fs.existsSync(folder + "/model.json") ? timestamp : null;
    }
  }
}

export async function saveBrain(brain, folder, skill, loss) {
  const db = await connect();
  const brains = db.collection("brains");
  const bucket = new GridFSBucket(db);

  // Delete previous files
  const cursor = bucket.find({ metadata: { brain: brain } });
  for await (const file of cursor) {
    await bucket.delete(file._id);
  }

  // Store new file
  await pipelineAsync(fs.createReadStream(folder + "/weights.bin").pipe(bucket.openUploadStream(brain + "-weights", { metadata: { brain: brain } })));
  await pipelineAsync(fs.createReadStream(folder + "/model.json").pipe(bucket.openUploadStream(brain + "-model", { metadata: { brain: brain } })));
  await pipelineAsync(fs.createReadStream(folder + "/brain.tf").pipe(bucket.openUploadStream(brain + "-brain", { metadata: { brain: brain } })));

  // Store brain status
  const status = {
    brain: brain,
    skill: skill,
    loss: loss,
    time: Date.now(),
  };

  await brains.updateOne({ brain: brain }, { $set: status }, { upsert: true });
}
