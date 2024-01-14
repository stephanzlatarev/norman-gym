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
  }

  return db;
}

export async function getBrainForExamination(startTime) {
  const db = await connect();
  const brains = await db.collection("brains").find({}).toArray();
  const examinations = await db.collection("examinations").find({}).toArray();

  for (const brain of brains) {
    const examination = examinations.find(one => (one.brain === brain.brain));

    if (!examination || !examination.time || (examination.time < brain.time) || (examination.time < startTime)) {
      return brain;
    }
  }
}

export async function loadBrain(brain, folder) {
  const db = await connect();
  const bucket = new GridFSBucket(db);

  if (await bucket.find({ filename: brain + "-weights" }).hasNext()) {
    await pipelineAsync(bucket.openDownloadStreamByName(brain + "-weights").pipe(fs.createWriteStream(folder + "/weights.bin")));

    if (await bucket.find({ filename: brain + "-model" }).hasNext()) {
      await pipelineAsync(bucket.openDownloadStreamByName(brain + "-model").pipe(fs.createWriteStream(folder + "/model.json")));

      return fs.existsSync(folder + "/model.json");
    }
  }
}

export async function storeExamination(brain, data) {
  const db = await connect(brain);

  const examination = {
    ...data,
    brain: brain,
    time: Date.now(),
  };

  await db.collection("examinations").updateOne({ brain: brain }, { $set: examination }, { upsert: true });
}
