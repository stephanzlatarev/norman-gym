import { collection, deleteFiles, downloadFile, uploadFile } from "./db.js";

const KIND_BRAIN = "brain";

export const FILE_WEIGHTS = "weights.bin";
export const FILE_MODEL = "model.json";
export const FILE_BRAIN = "brain.tf";

export async function readBrain(brain) {
  const brains = await collection("brains");

  return brains.findOne({ brain });
}

export async function downloadBrain(brain, folder) {
  return await downloadFile(KIND_BRAIN, brain, FILE_BRAIN, folder);
}

export async function downloadModel(brain, folder) {
  if (await downloadFile(KIND_BRAIN, brain, FILE_WEIGHTS, folder)) {
    return await downloadFile(KIND_BRAIN, brain, FILE_MODEL, folder);
  }
}

export async function uploadModel(brain, folder, loss) {
  await uploadFile(KIND_BRAIN, brain, FILE_WEIGHTS, folder);
  await uploadFile(KIND_BRAIN, brain, FILE_MODEL, folder);
  await uploadFile(KIND_BRAIN, brain, FILE_BRAIN, folder);

  const time = Date.now();
  const metadata = { time, loss };

  await updateBrain(brain, metadata);

  return time;
}

export async function updateBrain(brain, data) {
  const brains = await collection("brains");

  await brains.updateOne({ brain }, { $set: data }, { upsert: true });
}

export async function resetBrain(brain) {
  await deleteFiles(KIND_BRAIN, brain);
}
