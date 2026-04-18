import { collection } from "./db.js";

export async function addAssignment(trainer, assignment) {
  const assignments = await collection("assignments");

  assignment.trainer = trainer;

  await assignments.updateOne({ trainer }, { $set: assignment }, { upsert: true });
}

export async function readAssignment(trainer) {
  const assignments = await collection("assignments");

  return assignments.findOne({ trainer });
}
