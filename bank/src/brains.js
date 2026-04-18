import { collection, downloadFile, uploadFile } from "./db.js";

const KIND_BRAIN = "brain";
const FILE_WEIGHTS = "weights.bin";
const FILE_MODEL = "model.json";
const FILE_BRAIN = "brain.tf";

export async function downloadBrain(brain, folder) {
  await downloadFile(KIND_BRAIN, brain, FILE_BRAIN, folder);
}

export async function downloadModel(brain, folder) {
  if (await downloadFile(KIND_BRAIN, brain, FILE_WEIGHTS, folder)) {
    await downloadFile(KIND_BRAIN, brain, FILE_MODEL, folder);
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
