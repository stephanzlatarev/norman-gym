import Brain from "@norman-gym/brain/Brain.js";
import { loadBrain } from "@norman-gym/bank/brains.js";
import { addOperation, completeOperation, watchOperation } from "@norman-gym/bank/operations.js";
import loadSkill from "@norman-gym/bank/skills.js";

const STORE_FOLDER = process.cwd();
const SKILL_BASE_URL = process.env.SKILL_BASE_URL || "https://github.com/stephanzlatarev/test/gym/skill";
const BRAIN_CONFIG = {
  attributeWidth: 64,
  objectWidth: 128,
  brainWidth: 512,
  brainLayers: 2,
  attentionHeads: 8,
  attentionGroups: 2,
  dropoutRate: 0.1,
  batchSize: 100,
};

const cache = new Map();

async function play({ uuid, brain, observe }) {
  try {
    const act = (await readBrain(brain)).decide(observe);

    await addOperation({ type: "display", uuid, brain, observe, act });
    await completeOperation(uuid);
  } catch (cause) {
    console.log("Failed to process operation", uuid, cause?.message || cause);
  }
}

async function readBrain(name) {
  const skillUrl = `${SKILL_BASE_URL}/${name}`;
  const cached = cache.get(name);
  const skillChanged = cached?.skillUrl !== skillUrl;
  const configChanged = JSON.stringify(cached?.config) !== JSON.stringify(BRAIN_CONFIG);

  if (!cached || skillChanged || configChanged) {
    const skill = await loadSkill(skillUrl);
    const brain = new Brain(skill, BRAIN_CONFIG);

    if (await loadBrain(name, STORE_FOLDER)) {
      await brain.load(STORE_FOLDER);
    } else {
      brain.init();
    }

    cache.set(name, {
      brain,
      skillUrl,
      config: BRAIN_CONFIG,
    });

    return brain;
  }

  return cached.brain;
}

watchOperation("play", play);
