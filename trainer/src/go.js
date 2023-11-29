import Brain from "./Brain.js";
import Playbook from "./Playbook.js";
import { findBestSample, findWorstSample } from "./analysis.js";
import { log, readStatus, updateStatus, sample } from "./mongo.js";
import resources from "./resources.js";
import { bestShape } from "./shape.js";

const BRAIN_NAME = process.env.HOSTNAME || "brain";
const EPOCH_SIZE = 60000;
const BATCH_SIZE = 10000;

let skill;
let playbook;
let brain;
let batch;
let fixture;
let record;
let control;
let time;
let epochs;

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
        epochs = 0;
      } else {
        await closeEpoch(resourceEfficiency);
      }
    } else {
      await skipEpoch();
      time = 0;
      epochs = 0;
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
    fixture = createFixtureBatch(status.fixture);
  }

  // Create a new training batch
  batch = createTrainingBatch(fixture);

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
  let endTime = startTime;

  if (!epochs) epochs = 1;

  while (endTime - startTime < EPOCH_SIZE) {
    const fitStart = endTime;

    await brain.fit(batch, epochs);

    endTime = Date.now();

    const fitTime = endTime - fitStart;

    if (fitTime < (EPOCH_SIZE / 2)) epochs = epochs * 2;
    if (fitTime > EPOCH_SIZE) epochs = Math.ceil(epochs / 2);
  }

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
    overall: await brain.evaluate(playbook.batch(BATCH_SIZE)),
  };

  if (fixture) {
    logs["fixture"] = await brain.evaluate(fixture);
  }

  const batchSize = Math.ceil(BATCH_SIZE / playbook.playbooks.length);
  for (const batch of playbook.batches(batchSize)) {
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

function createFixtureBatch(config) {
  const ratio = Number(config.split(" ")[0].split("%")[0]) / 100;
  const batchSize = Math.floor(BATCH_SIZE * ratio);

  return playbook.batch(batchSize);
}

function createTrainingBatch(fixture) {
  if (fixture) {
    if (fixture.length >= BATCH_SIZE) {
      return fixture;
    } else {
      const batch = playbook.batch(BATCH_SIZE - fixture.length);

      return {
        length: BATCH_SIZE,
        source: [...fixture.source, ...batch.source],
        input: [...fixture.input, ...batch.input],
        inputSize: fixture.inputSize,
        output: [...fixture.output, ...batch.output],
        outputSize: fixture.outputSize,
      };
    }
  } else {
    return playbook.batch(BATCH_SIZE);
  }
}

go();
