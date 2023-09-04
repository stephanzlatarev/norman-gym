import { MongoClient, GridFSBucket } from "mongodb";
import { Readable } from "stream";
import zlib from "zlib";

let db = null;

async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017");

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

export async function loadBrain(name) {
  const db = await connect();
  const record = await db.collection("brain").findOne({ name: name });

  if (record) {
    return JSON.parse(zlib.gunzipSync(Buffer.from(record.brain, "base64")).toString("utf-8"));
  }

  const bucket = new GridFSBucket(db);
  const cursor = bucket.find({ filename: name });

  if (await cursor.hasNext()) {
    const stream = bucket.openDownloadStreamByName(name);

    if (stream) {
      return JSON.parse(zlib.gunzipSync(await toBuffer(stream)).toString("utf-8"));
    }
  }
}

export async function saveBrain(name, brain) {
  const db = await connect();
  const bucket = new GridFSBucket(db);

  // Delete previous files
  const cursor = bucket.find({ filename: name });
  for await (const file of cursor) {
    await bucket.delete(file._id);
  }

  // Store new file
  const stream = Readable.from(zlib.gzipSync(Buffer.from(JSON.stringify(brain), "utf-8")));
  stream.pipe(bucket.openUploadStream(name));
}

function toBuffer(stream) {
  return new Promise((resolve, reject) => {
    const buffer = [];
    stream.on("data", (chunk) => buffer.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buffer)));
    stream.on("error", (error) => reject(error));
  });
} 
