import os from "os";
import Brain from "./Brain.js";
import Samples from "./Samples.js";
import { findWorstSample } from "./analysis.js";
import { log, sample, session } from "./mongo.js";
import { bestShape } from "./shape.js";

async function go() {
  const samples = new Samples();
  await session(await samples.init());

  const brain = new Brain(process.env.HOSTNAME, samples.shape);
  await brain.load();

  let time = 0;
  let controlBatch = samples.batch();
  let recordLogs = await brain.evaluate(controlBatch);
  let recordStats = { overall: { ...recordLogs } };

  while (true) {
    const studyLogs = await brain.fit(samples.batch());
    const controlLogs = await brain.evaluate(controlBatch);

    if (controlLogs.loss < recordLogs.loss) {
      await brain.save();
      recordLogs = controlLogs;
      recordStats = { overall: { ...recordLogs }, ...(await assessByPlaybook(brain, samples)) };
    }

    const now = new Date().getMinutes();
    const epochEnded = (time > 0) && (time !== now);

    if (epochEnded) {
      await log(brain.name, brain.shape, {
        resources: resources(),
        study: { overall: { ...studyLogs } },
        control: { overall: { ...controlLogs }, ...(await assessByPlaybook(brain, samples)) },
        record: recordStats,
      });

      await sample(brain.name, "worst", findWorstSample(controlBatch, await brain.predict(controlBatch)));

      controlBatch = samples.batch();

      const shape = await bestShape(brain);
      if (shape && (brain.shape !== shape)) {
        brain.reshape(shape);

        recordLogs = { loss: 1, error: 1, pass: 0 };
        recordStats = { overall: { ...recordLogs } };

        await brain.save();
      }
    }

    time = now;
  }
}

async function assessByPlaybook(brain, samples) {
  const logs = {};

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
