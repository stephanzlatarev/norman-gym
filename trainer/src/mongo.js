import fs from "fs";
import { MongoClient, GridFSBucket } from "mongodb";
import { finished } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(finished);

let db = null;

async function connect(brain) {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017", { connectTimeoutMS: 0 });

    await client.connect();

    db = client.db("gym");

    db.collection("progress").createIndex( { time: 1 }, { expireAfterSeconds: 60 * 60 } );

    if (brain) {
      await updateStatus(brain, {});
    }
  }

  return db;
}

export async function readSession(skill) {
  const db = await connect();

  return await db.collection("sessions").findOne({ skill: skill });
}

export async function updateSession(skill, data) {
  const db = await connect();

  await db.collection("sessions").updateOne({ skill: skill }, { $set: data }, { upsert: true });
}

export async function readStatus(brain) {
  const db = await connect(brain);

  return await db.collection("brains").findOne({ brain: brain });
}

export async function updateStatus(brain, data) {
  const db = await connect(brain);

  const status = {
    ...data,
    brain: brain,
    time: Date.now(),
  };

  await db.collection("brains").updateOne({ brain: brain }, { $set: status }, { upsert: true });
}

export async function log(brain, progress) {
  const db = await connect(brain);

  progress.brain = brain;
  progress.time = new Date();

  await db.collection("progress").insertOne(progress);
}

export async function sample(brain, label, sample) {
  const db = await connect(brain);

  sample.brain = brain;
  sample.label = label;
  await db.collection("samples").findOneAndReplace({ brain: brain, label: label }, sample, { upsert: true });
}

export async function leaderboard(brain, skill) {
  const db = await connect(brain);

  const leaderboard = await db.collection("brains").find({ skill: skill }).toArray();

  leaderboard.sort((a, b) => (a.record - b.record));

  return leaderboard;
}

export async function loadBrain(brain, folder) {
  const db = await connect(brain);
  const bucket = new GridFSBucket(db);

  if (await bucket.find({ filename: brain + "-weights" }).hasNext()) {
    await pipelineAsync(bucket.openDownloadStreamByName(brain + "-weights").pipe(fs.createWriteStream(folder + "/weights.bin")));

    if (await bucket.find({ filename: brain + "-model" }).hasNext()) {
      await pipelineAsync(bucket.openDownloadStreamByName(brain + "-model").pipe(fs.createWriteStream(folder + "/model.json")));

      return fs.existsSync(folder + "/model.json");
    }
  }
}

export async function saveBrain(brain, folder, skill, shape, performance) {
  const db = await connect(brain);
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
    shape: shape,
    time: Date.now(),
    loss: performance.loss,
    error: performance.error,
    pass: performance.pass,
  };

  await db.collection("brains").updateOne({ brain: brain }, { $set: status }, { upsert: true });
}
