import Brain from "./Brain.js";
import Samples from "./Samples.js";
import { findWorstSample } from "./analysis.js";
import { log, sample, session } from "./mongo.js";

async function go() {
  const brain = new Brain(process.env.BRAIN);
  await brain.load();

  const samples = new Samples();
  await session(await samples.init());

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
        study: { overall: { ...studyLogs } },
        control: { overall: { ...controlLogs }, ...(await assessByPlaybook(brain, samples)) },
        record: recordStats,
      });

      await sample(brain.name, "worst", findWorstSample(controlBatch, await brain.predict(controlBatch)));

      controlBatch = samples.batch();
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

go();
