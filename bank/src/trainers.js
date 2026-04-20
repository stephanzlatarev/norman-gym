import { collection } from "./db.js";

export async function readTrainer(trainer) {
  const trainers = await collection("trainers");

  return trainers.findOne({ trainer });
}

export async function writeTrainer(trainer, config) {
  const trainers = await collection("trainers");

  config.trainer = trainer;

  await trainers.updateOne({ trainer }, { $set: config }, { upsert: true });
}
