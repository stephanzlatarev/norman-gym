import { connect } from "./db.js";

export async function addAssignment(trainer, assignment) {
  const db = await connect();
  const assignments = db.collection("assignments");

  assignment.trainer = trainer;

  await assignments.updateOne({ trainer }, { $set: assignment }, { upsert: true });
}

export async function readAssignment(trainer) {
  const db = await connect();
  const assignments = db.collection("assignments");

  return assignments.findOne({ trainer });
}