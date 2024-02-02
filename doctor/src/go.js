import examineBrain from "./examine.js";
import { getBrainForExamination, storeExamination } from "./mongo.js";

const START_TIME = Date.now();
const WAIT_TIME = 10000;

async function go() {
  while (true) {
    const brain = await getBrainForExamination(START_TIME);

    if (brain) {
      console.log();
      console.log(new Date().toISOString(), "Examination of brain", brain.brain, "and skill", brain.skill);
      console.log();

      const examination = await examineBrain(brain.brain, brain.skill);

      await storeExamination(brain.brain, examination);
    } else {
      await new Promise(r => setTimeout(r, WAIT_TIME));
    }
  }
}

go();
