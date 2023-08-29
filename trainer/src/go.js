import { log } from "./mongo.js";
import Brain from "./Brain.js";
import Samples from "./Samples.js";

async function go() {
  const brain = new Brain(process.env.BRAIN);
  await brain.load();

  const samples = new Samples();
  await samples.init();

  const module = await import("./mode/" + (process.env.MODE ? process.env.MODE : "flow") + ".js");
  const mode = new module.default(samples, brain);

  let time = 0;
  let recordLogs = { loss: Infinity };
  let controlBatch = samples.batch();

  while (true) {
    const studyLogs = await brain.fit(mode.batch());
    const studyLoss = studyLogs.loss;
    const controlLogs = await brain.evaluate(controlBatch);
    const controlLoss = controlLogs.loss;

    if (controlLoss < recordLogs.loss) {
      await brain.save();
      recordLogs = controlLogs;
    }

    if (mode.onBatchEnd) {
      await mode.onBatchEnd(controlLoss, studyLoss);
    }

    const now = new Date().getMinutes();
    const epochEnded = (time > 0) && (time !== now);

    if (epochEnded) {
      if (mode.onEpochEnd) {
        await mode.onEpochEnd(controlLoss, studyLoss);
      }

      await log(brain.name, mode.name, { study: { overall: { ...studyLogs } }, control: { overall: { ...controlLogs } }, record: { overall: { ...recordLogs } } });

      controlBatch = samples.batch();
    }

    time = now;
  }
}

go();
