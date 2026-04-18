import Brain from "@norman-gym/brain/Brain.js";
import createSamples from "@norman-gym/brain/ops/samples.js";
import loadSkill from "@norman-gym/bank/skills.js";
import { readAssignment } from "@norman-gym/bank/assignments.js";
import { downloadModel, uploadModel } from "@norman-gym/bank/brains.js";
import { writeProgress } from "@norman-gym/bank/progress.js";
import resources from "./resources.js";

const TRAINER_NAME = process.env.HOSTNAME;
const SESSION_SECONDS = 60;
const SESSION_MILLIS = SESSION_SECONDS * 1000;
const MEASURE_BATCH_SIZE = 1000;
const STORE_FOLDER = process.cwd();

let skill;
let config;
let brain;
let record;

async function go() {
  while (true) {
    const assignment = await readAssignment(TRAINER_NAME);

    if (assignment) {
      await startSession(assignment);

      brain.train(createSamples(skill.playbooks, config.batchSize), SESSION_SECONDS);

      const loss = measure();

      if (loss.overall < record.overall) {
        await brain.save(STORE_FOLDER);
        await uploadModel(assignment.brain, STORE_FOLDER, loss.overall);

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
  // Ensure the skill and config are loaded
  if (!skill || (skill.url !== assignment.skill)) {
    skill = await loadSkill(assignment.skill);
    config = assignment.config;
    brain = null;
    record = null;

    console.log("Skill:", JSON.stringify(skill));
    console.log("Config:", JSON.stringify(config));
  }

  // Ensure the brain is up-to-date
  if (!brain) {
    brain = new Brain(skill, config);

    if (await downloadModel(assignment.brain, STORE_FOLDER)) {
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

function measure() {
  const loss = {};

  let sum = 0;
  let count = 0;

  for (const [name, generator] of Object.entries(skill.playbooks)) {
    const samples = createSamples({ playbook: generator }, MEASURE_BATCH_SIZE);
    const measurement = brain.measure(samples);

    loss[name] = measurement;

    sum += measurement;
    count++;
  }

  loss.overall = sum / count;

  return loss;
}

go();
