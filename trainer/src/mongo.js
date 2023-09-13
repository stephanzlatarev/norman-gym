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

    db.collection("progress").createIndex( { time: 1 }, { expireAfterSeconds: 60 * 60 } )
  }

  return db;
}

export async function session(meta) {
  const db = await connect();

  meta.id = 1;

  await db.collection("sessions").findOneAndReplace({ id: 1 }, meta, { upsert: true });
}

export async function log(brain, shape, progress) {
  const db = await connect();

  progress.brain = brain;
  progress.time = new Date();
  await db.collection("progress").insertOne(progress);

  const rank = {
    time: Date.now(),
    brain: brain,
    shape: shape,
    loss: progress.control.overall.loss,
    error: progress.control.overall.error,
    pass: progress.control.overall.pass,
    record: progress.record.overall.loss,
  };

  await db.collection("rank").findOneAndReplace({ brain: brain }, rank, { upsert: true });
}

export async function sample(brain, label, sample) {
  const db = await connect();

  sample.brain = brain;
  sample.label = label;
  await db.collection("samples").findOneAndReplace({ brain: brain, label: label }, sample, { upsert: true });
}

export async function leaderboard() {
  const db = await connect();
  const leaderboard = await db.collection("rank").find({}).toArray();

  leaderboard.sort((a, b) => (a.record - b.record));

  return leaderboard;
}

export async function loadBrain(name, folder) {
  const db = await connect();
  const bucket = new GridFSBucket(db);

  if (await bucket.find({ metadata: { brain: name } }).hasNext()) {
    await pipelineAsync(bucket.openDownloadStreamByName(name + "-weights").pipe(fs.createWriteStream(folder + "/weights.bin")));
    await pipelineAsync(bucket.openDownloadStreamByName(name + "-model").pipe(fs.createWriteStream(folder + "/model.json")));

    return fs.existsSync(folder + "/model.json");
  }
}

export async function saveBrain(name, folder) {
  const db = await connect();
  const bucket = new GridFSBucket(db);

  // Delete previous files
  const cursor = bucket.find({ metadata: { brain: name } });
  for await (const file of cursor) {
    await bucket.delete(file._id);
  }

  // Store new file
  await pipelineAsync(fs.createReadStream(folder + "/weights.bin").pipe(bucket.openUploadStream(name + "-weights", { metadata: { brain: name } })));
  await pipelineAsync(fs.createReadStream(folder + "/model.json").pipe(bucket.openUploadStream(name + "-model", { metadata: { brain: name } })));
  await pipelineAsync(fs.createReadStream(folder + "/brain.tf").pipe(bucket.openUploadStream(name + "-brain", { metadata: { brain: name } })));
}
