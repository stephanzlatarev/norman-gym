import { collection, downloadFile, uploadFile } from "./db.js";

const KIND_BRAIN = "brain";
const FILE_WEIGHTS = "weights.bin";
const FILE_MODEL = "model.json";
const FILE_BRAIN = "brain.tf";

export async function loadBrain(brain, folder) {
  if (await downloadFile(KIND_BRAIN, brain, FILE_WEIGHTS, folder)) {
    await downloadFile(KIND_BRAIN, brain, FILE_MODEL, folder);
  }
}

export async function saveBrain(brain, folder, skill, loss) {
  await uploadFile(KIND_BRAIN, brain, FILE_WEIGHTS, folder);
  await uploadFile(KIND_BRAIN, brain, FILE_MODEL, folder);
  await uploadFile(KIND_BRAIN, brain, FILE_BRAIN, folder);

  const brains = await collection("brains");

  const status = {
    brain,
    skill,
    loss,
    time: Date.now(),
  };

  await brains.updateOne({ brain }, { $set: status }, { upsert: true });
}
