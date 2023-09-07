import fs from "fs";
import { MongoClient, GridFSBucket } from "mongodb";
import { finished } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(finished);

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
  const folder = "./download/" + name;

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  if (await bucket.find({ metadata: { brain: name } }).hasNext()) {
    await pipelineAsync(bucket.openDownloadStreamByName(name + "-weights").pipe(fs.createWriteStream(folder + "/weights.bin")));
    await pipelineAsync(bucket.openDownloadStreamByName(name + "-model").pipe(fs.createWriteStream(folder + "/model.json")));

    return fs.existsSync(folder + "/model.json") ? folder : false;
  }
}
