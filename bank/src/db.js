import fs from "fs";
import { GridFSBucket, MongoClient } from "mongodb";
import { finished } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(finished);

let db = null;

export async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017", { connectTimeoutMS: 0 });

    await client.connect();

    db = client.db("gym");

    await db.collection("progress").createIndex({ time: 1 }, { expireAfterSeconds: 60 * 60 });
    await db.collection("events").createIndex({ time: 1 }, { expireAfterSeconds: 60 * 60 });
  }

  return db;
}

export async function collection(name) {
  return (await connect()).collection(name);
}

export async function list(name, filter) {
  const list = await collection(name);

  return await list.find(filter).toArray();
}

export async function stats() {
  return {
    documents: {
      brains: await (await collection("brains")).countDocuments(),
      events: await (await collection("events")).countDocuments(),
      progress: await (await collection("progress")).countDocuments(),
      trainers: await (await collection("trainers")).countDocuments(),
    },
    files: {
      brains: await (await collection("fs.files")).countDocuments({ "metadata.kind": "brain" }),
    },
  };
}

export async function downloadFile(kind, key, name, folder) {
  const dbpath = kind + "/" + key + "/" + name;
  const fspath = folder + "/" + name;
  const vspath = fspath + ".version";

  const bucket = new GridFSBucket(await connect());
  const cursor = bucket.find({ filename: dbpath });
  const exists = await cursor.hasNext();

  if (!exists) return false;

  const record = await cursor.next();
  const version = record.metadata?.version || 1;

  // Check if we can skip download based on version marker
  if (fs.existsSync(fspath) && fs.existsSync(vspath) && (fs.readFileSync(vspath, "utf-8").trim() === String(version))) {
    return true;
  }

  if (fs.existsSync(fspath)) {
    fs.unlinkSync(fspath);
  }

  const source = bucket.openDownloadStreamByName(dbpath);
  const target = fs.createWriteStream(fspath);

  await pipelineAsync(source.pipe(target));

  const saved = fs.existsSync(fspath);

  // Store version marker after successful download
  if (saved) {
    fs.writeFileSync(vspath, String(version));
  }

  return saved;
}

export async function uploadFile(kind, key, name, folder) {
  const dbpath = kind + "/" + key + "/" + name;
  const fspath = folder + "/" + name;

  if (!fs.existsSync(fspath)) return false;

  const bucket = new GridFSBucket(await connect());
  const version = Date.now();
  const target = bucket.openUploadStream(dbpath, { metadata: { kind, key, name, version } });
  const source = fs.createReadStream(fspath);

  // Find previously uploaded files for the same kind, key, and name
  const remove = [];
  for await (const file of bucket.find({ "metadata.kind": kind, "metadata.key": key, "metadata.name": name })) {
    remove.push(file._id);
  }

  // Upload the new file
  await pipelineAsync(source.pipe(target));

  // Delete the previous files
  for (const id of remove) {
    await bucket.delete(id);
  }

  return true;
}
