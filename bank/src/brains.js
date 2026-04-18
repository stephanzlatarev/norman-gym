import { collection, downloadFile, uploadFile } from "./db.js";

const KIND_BRAIN = "brain";

export const FILE_WEIGHTS = "weights.bin";
export const FILE_MODEL = "model.json";
export const FILE_BRAIN = "brain.tf";

export async function downloadBrain(brain, folder) {
  return await downloadFile(KIND_BRAIN, brain, FILE_BRAIN, folder);
}

export async function downloadModel(brain, folder) {
  if (await downloadFile(KIND_BRAIN, brain, FILE_WEIGHTS, folder)) {
    return await downloadFile(KIND_BRAIN, brain, FILE_MODEL, folder);
  }
}

export async function uploadBrain(brain, folder, loss) {
  await uploadFile(KIND_BRAIN, brain, FILE_WEIGHTS, folder);
  await uploadFile(KIND_BRAIN, brain, FILE_MODEL, folder);
  await uploadFile(KIND_BRAIN, brain, FILE_BRAIN, folder);

  const brains = await collection("brains");
  const metadata = { time: Date.now(), brain, loss };

  await brains.updateOne({ brain }, { $set: metadata }, { upsert: true });
}
