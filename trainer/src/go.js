import Brain from "./Brain.js";
import Playbook from "./Playbook.js";
import { findBestSample, findWorstSample } from "./analysis.js";
import { log, readStatus, updateStatus, sample } from "./mongo.js";
import resources from "./resources.js";
import { bestShape } from "./shape.js";

const BRAIN_NAME = process.env.HOSTNAME || "brain";
const EPOCH_SIZE = 60000;

let skill;
let playbook;
let brain;
let batch;
let fixture;
let record;
let control;
let time;

async function go() {
  let status = await readStatus(BRAIN_NAME);

  while (true) {
    if (hasAssignment(status)) {
      await openEpoch(status);

      const resourceEfficiency = await train();

      time = Date.now();
      status = await readStatus(BRAIN_NAME);

      if (hasAssignmentChanged(status)) {
        await updateStatus(BRAIN_NAME, { loss: NaN, error: NaN, pass: 0 });
        time = 0;
      } else {
        await closeEpoch(resourceEfficiency);
      }
    } else {
      await skipEpoch();
      time = 0;
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
  await new Promise(resolve => setTimeout(resolve, EPOCH_SIZE));
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

  // Create fixture batch if configured
  if (shouldCreateFixtureBatch(status.fixture)) {
    fixture = createFixtureBatch(playbook.batch(), status.fixture);
  }

  // Create a new batch
  batch = fixBatch(playbook.batch(), fixture);

  // Ensure the brain is of the right shape
  const shape = await bestShape(playbook.meta, brain, status);
  if (shape && (brain.shape !== shape)) {
    brain.reshape(shape);

    await brain.save();
    await updateStatus(BRAIN_NAME, { shape: brain.shape });

    record = null;
  }

  // Ensure an initial progress record
  if (!record) {
    await logProgress(0);
  }
}

async function train() {
  const startTime = Date.now();

  while (Date.now() - startTime < EPOCH_SIZE) {
    await brain.fit(batch);
  }

  const endTime = Date.now();

  return time ? (endTime - startTime) / (endTime - time) : 0;
}

async function closeEpoch(resourceEfficiency) {
  await logProgress(resourceEfficiency);
}

async function logProgress(resourceEfficiency) {
  control = await evaluate(brain, playbook);

  if (!record || (control.overall.loss < record.overall.loss)) {
    await brain.save();

    record = control;
  }

  await log(brain.name, brain.skill, brain.shape, { resources: { ...resources(), efficiency: resourceEfficiency }, control: control, record: record });

  const prediction = await brain.predict(batch);

  await sample(brain.name, "best", findBestSample(batch, prediction));
  await sample(brain.name, "worst", findWorstSample(batch, prediction));
}

async function evaluate(brain, playbook) {
  const logs = {
    overall: await brain.evaluate(playbook.batch()),
  };

  if (fixture) {
    logs["fixture"] = await brain.evaluate(fixture);
  }

  for (const batch of playbook.batches()) {
    if (batch.source.length) {
      logs[batch.source[0]] = await brain.evaluate(batch);
    }
  }

  return logs;
}

function shouldCreateFixtureBatch(config) {
  if (!config) return false;
  if (!fixture) return true;
  if (!control) return false;
  if (!control.fixture) return false;

  return (control.fixture.loss < Number(config.split(" ")[1]));
}

function createFixtureBatch(batch, fixture) {
  const config = fixture.split(" ");
  const ratio = Number(config[0].split("%")[0]) / 100;
  const length = Math.floor(batch.length * ratio);

  batch.length = length;
  batch.input.length = length;
  batch.output.length = length;

  return batch;
}

function fixBatch(batch, fixture) {
  if (fixture) {
    for (let i = 0; i < fixture.length; i++) {
      batch.input[i] = fixture.input[i];
      batch.output[i] = fixture.output[i];
    }
  }

  return batch;
}

go();
