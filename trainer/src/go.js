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
let fixture;
let epoch;
let record;
let control;

async function go() {
  let status = await readStatus(BRAIN_NAME);

  while (true) {
    if (hasAssignment(status)) {
      await openEpoch(status);

      await train();

      status = await readStatus(BRAIN_NAME);

      if (hasAssignmentChanged(status)) {
        await updateStatus(BRAIN_NAME, { loss: NaN, error: NaN, pass: 0 });
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

  // Create fixture batch if configured
  if (shouldCreateFixtureBatch(status.fixture)) {
    fixture = createFixtureBatch(playbook.batch(), status.fixture);
    console.log("new fixture:", status.fixture, "-> batch length:", fixture.length);
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
  control = await evaluate(brain, playbook);

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

  if (fixture) {
    logs["fixture"] = await brain.evaluate(fixture);
    console.log("loss overall:", logs.overall.loss, "fixture:", logs["fixture"].loss);
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
