import Brain from "./Brain.js";
import Playbook from "./Playbook.js";
import { findBestSample, findWorstSample } from "./analysis.js";
import { log, readStatus, refreshStatus, sample } from "./mongo.js";
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
    if (status && status.skill) {
      await openEpoch(status);
      await train();
    } else {
      skill = null;
      await skipEpoch();
    }

    status = await readStatus(BRAIN_NAME);
    if (status && status.skill && (skill === status.skill)) {
      await closeEpoch();
    } else {
      await refreshStatus(BRAIN_NAME);
    }
  }
}

async function skipEpoch() {
  const secondsToSkip = 60 - new Date().getSeconds();
  await new Promise(resolve => setTimeout(resolve, 1000 * secondsToSkip));
}

async function openEpoch(status) {
  if (skill !== status.skill) {
    skill = status.skill;
    record = null;

    playbook = new Playbook(skill);
    await playbook.load();

    brain = new Brain(BRAIN_NAME, playbook.meta.skill, playbook.meta.shape);
    await brain.load();
  }

  const shape = await bestShape(playbook.meta, brain);

  if (shape && (brain.shape !== shape)) {
    brain.reshape(shape);
    await brain.save();

    record = null;
  }

  batch = playbook.batch();

  if (!record) {
    await setRecord();
  }

  epoch = new Date().getMinutes();
}

async function train() {
  while (epoch === new Date().getMinutes()) {
    await brain.fit(playbook.batch());

    const evaluation = await brain.evaluate(batch);

    if (evaluation.loss < record.overall.loss) {
      await setRecord(evaluation);
    }
  }
}

async function closeEpoch() {
  const prediction = await brain.predict(batch);
  const evaluation = await brain.evaluate(batch);
  const control = await evaluate(brain, playbook, evaluation);

  await log(brain.name, brain.skill, brain.shape, { resources: resources(), control: control, record: record });
  await sample(brain.name, "best", findBestSample(batch, prediction));
  await sample(brain.name, "worst", findWorstSample(batch, prediction));
}

async function setRecord(evaluation) {
  const status = await readStatus(BRAIN_NAME);

  if (status && status.skill && (skill === status.skill)) {
    record = await evaluate(brain, playbook, evaluation || await brain.evaluate(batch));

    await brain.save();
    await log(brain.name, brain.skill, brain.shape, { resources: resources(), control: record, record: record });
  }
}

async function evaluate(brain, playbook, overallEvaluation) {
  const logs = { overall: overallEvaluation };

  for (const batch of playbook.batches()) {
    if (batch.source.length) {
      logs[batch.source[0]] = await brain.evaluate(batch);
    }
  }

  return logs;
}

go();
