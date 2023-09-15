import os from "os";
import Brain from "./Brain.js";
import Samples from "./Samples.js";
import { findWorstSample } from "./analysis.js";
import { log, sample, session } from "./mongo.js";
import { bestShape } from "./shape.js";

const BRAIN_NAME = process.env.HOSTNAME;

async function go() {
  const samples = new Samples();
  const playbook = await samples.init();
  await session(BRAIN_NAME, playbook);

  const brain = new Brain(BRAIN_NAME, playbook.skill, samples.shape);
  await brain.load();

  let time = 0;
  let batch = samples.batch();
  let record = await evaluate(brain, samples, await brain.evaluate(batch));

  while (true) {
    await brain.fit(samples.batch());

    const evaluation = await brain.evaluate(batch);

    if (evaluation.loss < record.overall.loss) {
      await brain.save();
      record = await evaluate(brain, samples, evaluation);
    }

    const now = new Date().getMinutes();
    const epochEnded = (time > 0) && (time !== now);

    if (epochEnded) {
      const control = await evaluate(brain, samples, evaluation);

      await log(brain.name, brain.skill, brain.shape, { resources: resources(), control: control, record: record });
      await sample(brain.name, "worst", findWorstSample(batch, await brain.predict(batch)));

      batch = samples.batch();

      const shape = await bestShape(brain);
      if (shape && (brain.shape !== shape)) {
        brain.reshape(shape);

        await brain.save();
        record = await evaluate(brain, samples, await brain.evaluate(batch));
      }
    }

    time = now;
  }
}

async function evaluate(brain, samples, overallEvaluation) {
  const logs = { overall: overallEvaluation };

  for (const playbookBatch of samples.batches()) {
    if (playbookBatch.source.length) {
      logs[playbookBatch.source[0]] = await brain.evaluate(playbookBatch);
    }
  }

  return logs;
}

let clock = 0;
let cpu = 0;

function resources() {
  const clocknow = Date.now();
  const totalmem = os.totalmem();
  const freemem = os.freemem();

  let cpunow = 0;
  let cpucount = 0;

  for (const one of os.cpus()) {
    cpunow += one.times.user;
    cpucount++;
  }

  const measurement = {
    cpu: ((cpunow - cpu) / cpucount / (clocknow - clock)),
    ram: (totalmem - freemem) / totalmem,
  };

  clock = clocknow;
  cpu = cpunow;

  return measurement;
}

go();
