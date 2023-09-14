import fs from "fs";
import { MongoClient, GridFSBucket } from "mongodb";
import { finished } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(finished);

const DOWNLOADS = "./downloads/";
fs.mkdirSync(DOWNLOADS, { recursive: true });

let db = null;

async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017");

    await client.connect();

    db = client.db("gym");
  }

  return db;
}

export async function list(collection, filter) {
  const db = await connect();

  return await db.collection(collection).find(filter).toArray();
}

export async function load(name) {
  const db = await connect();
  const bucket = new GridFSBucket(db);
  const filenameOnDisk = DOWNLOADS + "/brain.tf";
  const filenameInDatabase = name + "-brain";

  if (await bucket.find({ filename: filenameInDatabase }).hasNext()) {
    await pipelineAsync(bucket.openDownloadStreamByName(filenameInDatabase).pipe(fs.createWriteStream(filenameOnDisk)));

    if (fs.existsSync(filenameOnDisk)) return filenameOnDisk;
  }
}
