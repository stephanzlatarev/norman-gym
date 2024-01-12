import Brain from "./Brain.js";
import Playbook from "./Playbook.js";
import { getBrainForExamination, storeExamination } from "./mongo.js";

const WAIT_TIME = 10000;
const BATCH_SIZE = 10000;

async function go() {
  while (true) {
    const brain = await getBrainForExamination();

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

async function examineBrain(name, skill) {
  const examination = {};

  const brain = new Brain(name);
  await brain.load();

  const playbook = new Playbook(skill);
  await playbook.load();

  for (const play of playbook.playbooks) {
    const batch = playbook.batch(BATCH_SIZE, play);
    const result = await brain.evaluate(batch, playbook.meta.fidelity);

    examination[play.name] = result;
  }

  return {
    brain: name,
    playbook: playbook.meta,
    data: examination,
  };
}

go();
