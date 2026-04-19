import Brain from "@norman-gym/brain/Brain.js";
import { readBrain, downloadModel } from "@norman-gym/bank/brains.js";
import { sendEvent, watchEvents } from "@norman-gym/bank/events.js";
import createSamples from "@norman-gym/brain/ops/samples.js";
import loadSkill from "@norman-gym/bank/skills.js";

let player;

async function play({ type, ref, brain, observation }) {
  try {
    await getBrain(brain);

    let expected = {};

    if (!observation) {
      // Generate random sample
      const samples = createSamples(player.skill.playbooks, 1);
      observation = samples[0].observe;
      expected = samples[0].act;
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

watchEvents("simulation-step", play);
