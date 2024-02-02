import Brain from "./Brain.js";
import Playbook from "./Playbook.js";

const BATCH_SIZE = 100;

export default async function(name, skill) {
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
