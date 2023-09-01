import Brain from "./Brain.js";
import Samples from "./Samples.js";
import { findWorstSample } from "./analysis.js";
import { leaderboard, log, sample, session } from "./mongo.js";

async function go() {
  const samples = new Samples();
  await session(await samples.init());

  const brain = new Brain(process.env.HOSTNAME, shapeAsText(samples));
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
        study: { overall: { ...studyLogs } },
        control: { overall: { ...controlLogs }, ...(await assessByPlaybook(brain, samples)) },
        record: recordStats,
      });

      await sample(brain.name, "worst", findWorstSample(controlBatch, await brain.predict(controlBatch)));

      controlBatch = samples.batch();

      const shape = await bestShapeForLeaderboard(brain);
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

function shapeAsText(samples) {
  return samples.shape[0] + ":" + samples.shape[0] + ":" + samples.shape[1];
}

async function bestShapeForLeaderboard(brain) {
  const list = await leaderboard();

  if (list.length > 1) {
    list.sort((a, b) => (a.record - b.record));

    const brainShape = brain.shape.split(":");
    const leaderShape = list[0].shape.split(":");
    const input = Number(leaderShape[0]);
    const hidden = Number(leaderShape[1]);
    const output = Number(leaderShape[2]);
    const maxHidden = hidden + input * Math.floor(list.length / 2);
    const minHidden = Math.max(maxHidden - input * (list.length - 1), input);

    if ((minHidden <= brainShape[1]) && (brainShape[1] <= maxHidden)) {
      // This brain is already in range. If it is the best ranking of all with the exact same shape then it must not change shape.
      for (const one of list) {
        if (one.shape === brain.shape) {
          if (one.brain === brain.name) return;
          break;
        }
      }
    }

    for (let h = minHidden; h <= maxHidden; h += input) {
      const shape = [input, h, output].join(":");

      let exists = false;
      for (const one of list) {
        if (one.shape === shape) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        return shape;
      }
    }
  }
}

go();
