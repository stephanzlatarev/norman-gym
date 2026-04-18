import Brain from "@norman-gym/brain/Brain.js";
import createSamples from "@norman-gym/brain/ops/samples.js";
import loadSkill from "@norman-gym/bank/skills.js";
import { readAssignment } from "@norman-gym/bank/assignments.js";
import { readBrain, downloadModel, uploadModel } from "@norman-gym/bank/brains.js";
import { writeProgress } from "@norman-gym/bank/progress.js";
import resources from "./resources.js";

const TRAINER_NAME = process.env.HOSTNAME;
const SESSION_SECONDS = 60;
const SESSION_MILLIS = SESSION_SECONDS * 1000;
const DEFAULT_TRAINING_BATCH_SIZE = 100;
const DEFAULT_MEASURE_BATCH_SIZE = 1000;
const STORE_FOLDER = process.cwd();

let config;
let brain;
let skill;
let record;
let time;

async function go() {
  while (true) {
    const assignment = await readAssignment(TRAINER_NAME);

    if (assignment) {
      await startSession(assignment);

      brain.train(createSamples(skill.playbooks, config.trainBatchSize), SESSION_SECONDS);

      const loss = measure();

      if (loss.overall < record.overall) {
        await brain.save(STORE_FOLDER);

        time = await uploadModel(assignment.brain, STORE_FOLDER, loss.overall);
        record = loss;
      }

      await writeProgress(TRAINER_NAME, { loss, ...resources() });
    } else {
      await new Promise(resolve => setTimeout(resolve, SESSION_MILLIS));
      await writeProgress(TRAINER_NAME, resources());
    }
  }
}

async function startSession(assignment) {
  syncConfiguration(assignment);

  const metadata = await readBrain(assignment.brain);
  console.log("Brain:", JSON.stringify(metadata));

  const reloadBrain = shouldReloadBrain(metadata);
  const reloadSkill = reloadBrain || shouldReloadSkill(metadata);

  if (reloadSkill) {
    skill = await loadSkill(assignment.skill);

    console.log("Skill:", JSON.stringify(skill));
  }

  if (reloadBrain) {
    brain = new Brain(metadata.brain, config, skill);
    record = null;

    if (await downloadModel(metadata.brain, STORE_FOLDER)) {
      await brain.load(STORE_FOLDER);
    } else {
      brain.init();
    }
  }

  // Ensure an initial progress record
  if (!record) {
    await writeProgress(TRAINER_NAME, resources());

    record = { overall: Infinity };
  }
}

function syncConfiguration(assignment) {
  const messages = [];
  const expectedConfig = { ...assignment.config };

  if (!expectedConfig.trainBatchSize) {
    messages.push("Using default training batch size");
    expectedConfig.trainBatchSize = DEFAULT_TRAINING_BATCH_SIZE;
  }

  if (!expectedConfig.measureBatchSize) {
    messages.push("Using default measurement batch size");
    expectedConfig.measureBatchSize = DEFAULT_MEASURE_BATCH_SIZE;
  }

  if (JSON.stringify(config) !== JSON.stringify(expectedConfig)) {
    console.log("===========");
    console.log("Assignment:", JSON.stringify(assignment));

    config = expectedConfig;

    for (const message of messages) {
      console.log(message);
    }
  }
}

function shouldReloadBrain(metadata) {
  if (!brain) {
    console.log("Initializing for brain", metadata.brain);
    return true;
  }

  if (brain.name !== metadata.brain) {
    console.log("Re-assigning from brain", brain.name, "to", metadata.brain);
    return true;
  }

  if (time && metadata.time && (metadata.time > time)) {
    console.log("Downloading external brain update from", time, "to", metadata.time);
    return true;
  }
}

function shouldReloadSkill(metadata) {
  if (!skill) {
    console.log("Initializing for skill", metadata.skill);
    return true;
  }

  if (skill.url !== metadata.skill) {
    console.log("Re-assigning from skill", skill.url, "to", metadata.skill);
    return true;
  }
}

function measure() {
  const loss = {};

  let sum = 0;
  let count = 0;

  for (const [name, generator] of Object.entries(skill.playbooks)) {
    const samples = createSamples({ playbook: generator }, config.measureBatchSize);
    const measurement = brain.measure(samples);

    loss[name] = measurement;

    sum += measurement;
    count++;
  }

  loss.overall = sum / count;

  return loss;
}

go();
