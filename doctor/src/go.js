import Brain from "./Brain.js";
import Playbook from "./Playbook.js";
import { getBrainForExamination, storeExamination } from "./mongo.js";

const START_TIME = Date.now();
const WAIT_TIME = 10000;
const BATCH_SIZE = 100;

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

async function examineBrain(name, skill) {
  const examination = {};

  const brain = new Brain(name);
  await brain.load();

  const playbook = new Playbook(skill);
  await playbook.load();

  // Examine performance by playbook
  for (const play of playbook.playbooks) {
    const batch = playbook.batch(BATCH_SIZE, play);
    const result = await brain.evaluate(batch, playbook.meta.fidelity);

    examination[play.name] = result;
  }

  // Read neurons
  const neurons = [];
  for (const layer of brain.model.layers) {
    const tensors = layer.getWeights();

    if (tensors.length) {
      neurons.push({
        units: layer.units,
        weights: write(tensors[0].dataSync()),
        bias: write(tensors[1].dataSync())
      });
    }
  }

  return {
    brain: name,
    neurons: neurons,
    playbook: playbook.meta,
    data: examination,
  };
}

function write(array) {
  return Buffer.from(array.buffer).toString("base64");
}

go();
