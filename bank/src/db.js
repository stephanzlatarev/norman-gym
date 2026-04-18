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

export async function downloadFile(kind, key, name, folder) {
  const dbpath = kind + "/" + key + "/" + name;
  const fspath = folder + "/" + name;

  const bucket = new GridFSBucket(await connect());
  const exists = await bucket.find({ filename: dbpath }).hasNext();

  if (!exists) return false;

  if (fs.existsSync(fspath)) {
    fs.unlinkSync(fspath);
  }

  const source = bucket.openDownloadStreamByName(dbpath);
  const target = fs.createWriteStream(fspath);

  await pipelineAsync(source.pipe(target));

  return fs.existsSync(fspath);
}

export async function uploadFile(kind, key, name, folder) {
  const dbpath = kind + "/" + key + "/" + name;
  const fspath = folder + "/" + name;

  if (!fs.existsSync(fspath)) return false;

  const bucket = new GridFSBucket(await connect());
  const metadata = { metadata: { kind, key, name } };
  const target = bucket.openUploadStream(dbpath, metadata);
  const source = fs.createReadStream(fspath);

  // Find previously uploaded files for the same kind, key, and name
  const remove = [];
  for await (const file of bucket.find(metadata)) {
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
