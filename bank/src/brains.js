import fs from "fs";
import { GridFSBucket } from "mongodb";
import { connect, pipelineAsync } from "./db.js";

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

  for await (const file of bucket.find({ metadata: { brain } })) {
    await bucket.delete(file._id);
  }

  await pipelineAsync(fs.createReadStream(folder + "/weights.bin").pipe(bucket.openUploadStream(brain + "-weights", { metadata: { brain } })));
  await pipelineAsync(fs.createReadStream(folder + "/model.json").pipe(bucket.openUploadStream(brain + "-model", { metadata: { brain } })));
  await pipelineAsync(fs.createReadStream(folder + "/brain.tf").pipe(bucket.openUploadStream(brain + "-brain", { metadata: { brain } })));

  const status = {
    brain,
    skill,
    loss,
    time: Date.now(),
  };

  await brains.updateOne({ brain }, { $set: status }, { upsert: true });
}