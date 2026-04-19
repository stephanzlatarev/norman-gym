import Brain from "@norman-gym/brain/Brain.js";
import { readBrain, downloadModel } from "@norman-gym/bank/brains.js";
import { sendEvent, watchEvents } from "@norman-gym/bank/events.js";
import createSamples from "@norman-gym/brain/ops/samples.js";
import loadSkill from "@norman-gym/bank/skills.js";

let player;

async function play({ type, ref, brain, observation, preference }) {
  try {
    await getBrain(brain);

    let expected = {};

    if (!observation) {
      // Generate random sample
      const sample = await getSample(preference);
      observation = sample.observe;
      expected = sample.act;
    }

    const action = player.decide(observation);

    await sendEvent({ type: "simulation-display", ref, brain, observation, expected, action });
  } catch (cause) {
    console.log("Failed to process event", type, "(" + ref + ")", cause?.message || cause);
    console.log(cause);
  }
}

async function getBrain(name) {
  if (player) return;

  const folder = process.cwd();
  const metadata = await readBrain(name);
  const skill = await loadSkill(metadata.skill);

  player = new Brain(name, metadata.config, skill);

  // TODO: Download brain.tf instead and load as norman would
  if (await downloadModel(name, folder)) {
    await player.load(folder);
  } else {
    player.init();
  }

  return player;
}

async function getSample(preference) {
  switch (preference) {
    case "worst": return getWorstSample();
    default: return getRandomSample();
  }
}

function getRandomSample() {
  return createSamples(player.skill.playbooks, 1)[0];
}

async function getWorstSample() {
  const samples = createSamples(player.skill.playbooks, 100);

  let worstSample = null;
  let maxLoss = -Infinity;

  for (const sample of samples) {
    const loss = player.measure([sample]);

    if (loss > maxLoss) {
      maxLoss = loss;
      worstSample = sample;
    }
  }

  return worstSample;
}

watchEvents("simulation-step", play);
