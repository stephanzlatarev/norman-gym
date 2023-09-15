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

    await db.collection("brains").updateOne({ brain: brain }, { $set: { brain: brain } }, { upsert: true });
  }

  return db;
}

export async function session(brain, meta) {
  const db = await connect(brain);

  meta.id = 1;

  await db.collection("sessions").findOneAndReplace({ id: 1 }, meta, { upsert: true });
}

export async function log(brain, shape, progress) {
  const db = await connect(brain);

  progress.brain = brain;
  progress.time = new Date();
  await db.collection("progress").insertOne(progress);

  const status = {
    brain: brain,
    shape: shape,
    record: progress.record.overall.loss,
    time: Date.now(),
    loss: progress.control.overall.loss,
    error: progress.control.overall.error,
    pass: progress.control.overall.pass,
  };

  await db.collection("brains").updateOne({ brain: brain }, { $set: status }, { upsert: true });

  // TODO: Deprecated. Remove the line
  await db.collection("rank").findOneAndReplace({ brain: brain }, status, { upsert: true });
}

export async function sample(brain, label, sample) {
  const db = await connect(brain);

  sample.brain = brain;
  sample.label = label;
  await db.collection("samples").findOneAndReplace({ brain: brain, label: label }, sample, { upsert: true });
}

export async function leaderboard(brain) {
  const db = await connect(brain);

  // TODO: Remplace "rank" with "brains"
  const leaderboard = await db.collection("rank").find({}).toArray();

  leaderboard.sort((a, b) => (a.record - b.record));

  return leaderboard;
}

export async function loadBrain(brain, folder) {
  const db = await connect(brain);
  const bucket = new GridFSBucket(db);

  if (await bucket.find({ metadata: { brain: brain } }).hasNext()) {
    await pipelineAsync(bucket.openDownloadStreamByName(brain + "-weights").pipe(fs.createWriteStream(folder + "/weights.bin")));
    await pipelineAsync(bucket.openDownloadStreamByName(brain + "-model").pipe(fs.createWriteStream(folder + "/model.json")));

    return fs.existsSync(folder + "/model.json");
  }
}

export async function saveBrain(brain, folder) {
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
}
