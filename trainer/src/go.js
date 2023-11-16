import Brain from "./Brain.js";
import Playbook from "./Playbook.js";
import { findBestSample, findWorstSample } from "./analysis.js";
import { log, readStatus, updateStatus, sample } from "./mongo.js";
import resources from "./resources.js";
import { bestShape } from "./shape.js";

const BRAIN_NAME = process.env.HOSTNAME || "brain";

let skill;
let playbook;
let brain;
let batch;
let epoch;
let record;

async function go() {
  let status = await readStatus(BRAIN_NAME);

  while (true) {
    if (hasAssignment(status)) {
      await openEpoch(status);

      await train();

      status = await readStatus(BRAIN_NAME);

      if (hasAssignmentChanged(status)) {
        await updateStatus(BRAIN_NAME, { loss: NaN, error: NaN, pass: NaN });
      } else {
        await closeEpoch();
      }
    } else {
      await skipEpoch();
    }
  }
}

function hasAssignment(status) {
  return (status && status.skill);
}

function hasAssignmentChanged(status) {
  if (!status) return true;
  if (status.skill && (skill !== status.skill)) return true;
  if (status.shape && (brain.shape !== status.shape)) return true;

  return false;
}

async function skipEpoch() {
  const secondsToSkip = 60 - new Date().getSeconds();

  await new Promise(resolve => setTimeout(resolve, 1000 * secondsToSkip));
}

async function openEpoch(status) {
  // Ensure the playbook is loaded
  if (skill !== status.skill) {
    skill = status.skill;
    record = null;

    playbook = new Playbook(skill);
    await playbook.load();

    brain = new Brain(BRAIN_NAME, playbook.meta.skill, playbook.meta.shape);
    await brain.load();
  }

  // Create a new batch
  batch = playbook.batch();

  // Ensure the brain is of the right shape
  const shape = await bestShape(playbook.meta, brain);
  if (shape && (brain.shape !== shape)) {
    brain.reshape(shape);

    await brain.save();
    await updateStatus(BRAIN_NAME, { shape: brain.shape });

    record = null;
  }

  // Ensure an initial progress record
  if (!record) {
    await logProgress();
  }

  // Set the time of the epoch
  epoch = new Date().getMinutes();
}

async function train() {
  while ((epoch === new Date().getMinutes()) && (await brain.fit(playbook.batch()) >= record.overall.loss));
}

async function closeEpoch() {
  await logProgress();
}

async function logProgress() {
  const control = await evaluate(brain, playbook);

  if (!record || (control.overall.loss < record.overall.loss)) {
    await brain.save();

    record = control;
  }

  await log(brain.name, brain.skill, brain.shape, { resources: resources(), control: control, record: record });

  const prediction = await brain.predict(batch);

  await sample(brain.name, "best", findBestSample(batch, prediction));
  await sample(brain.name, "worst", findWorstSample(batch, prediction));
}

async function evaluate(brain, playbook) {
  const logs = {
    overall: await brain.evaluate(batch),
  };

  for (const batch of playbook.batches()) {
    if (batch.source.length) {
      logs[batch.source[0]] = await brain.evaluate(batch);
    }
  }

  return logs;
}

go();
