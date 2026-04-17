import { connect } from "./db.js";

export async function writeProgress(trainer, progress) {
  const db = await connect();
  const progresses = db.collection("progress");

  progress.time = new Date();
  progress.trainer = trainer;

  await progresses.insertOne(progress);

  console.log("[progress]", JSON.stringify(progress));
}