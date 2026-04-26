import Brain from "@norman-gym/brain/Brain.js";
import createSamples from "@norman-gym/brain/ops/samples.js";
import { getSkill } from "@norman-gym/bank/skills.js";
import { readBrain, downloadModel, uploadModel } from "@norman-gym/bank/brains.js";
import { writeProgress } from "@norman-gym/bank/progress.js";
import { readTrainer, writeTrainer } from "@norman-gym/bank/trainers.js";
import resources from "./resources.js";

const TRAINER_NAME = process.env.HOSTNAME;
const SESSION_SECONDS = 60;
const SESSION_MILLIS = SESSION_SECONDS * 1000;
const DEFAULT_DROPOUT_RATE = 0.1;
const DEFAULT_LEARNING_RATE = 0.001;
const DEFAULT_CLIP_NORM = 1.0;
const DEFAULT_TRAINING_BATCH_SIZE = 100;
const DEFAULT_MEASURE_BATCH_SIZE = 1000;
const STORE_FOLDER = process.cwd();

let config;
let brain;
let skill;
let record;
let time;

async function go() {
  await writeTrainer(TRAINER_NAME, {});

  while (true) {
    const config = await readTrainer(TRAINER_NAME);

    if (config && config.brain) {
      syncConfiguration(config);

      await startSession(config);

      brain.train(createSamples(skill.playbooks, config.trainBatchSize), SESSION_SECONDS);

      const { loss, accuracy } = measure();

      if (loss.overall < record.overall) {
        await brain.save(STORE_FOLDER);

        time = await uploadModel(config.brain, STORE_FOLDER, loss.overall);
        record = loss;
      }

      await writeProgress(TRAINER_NAME, { loss, accuracy, ...resources() });
    } else {
      await new Promise(resolve => setTimeout(resolve, SESSION_MILLIS));
      await writeProgress(TRAINER_NAME, resources());
    }
  }
}

async function startSession() {
  const metadata = await readBrain(config.brain);

  const reloadBrain = shouldReloadBrain(metadata);

  skill = await getSkill(config.skill);

  if (reloadBrain) {
    const training = {
      ...metadata.config,
      dropoutRate: config.dropoutRate,
      learningRate: config.learningRate,
      clipNorm: config.clipNorm,
    };

    brain = new Brain(config.brain, training, skill);
    record = null;

    if (await downloadModel(config.brain, STORE_FOLDER)) {
      console.log("Loading brain:", JSON.stringify(metadata));
      await brain.load(STORE_FOLDER);
    } else {
      console.log("Initializing brain:", JSON.stringify(metadata));
      brain.init();
    }
  }

  // Ensure an initial progress record
  if (!record) {
    await writeProgress(TRAINER_NAME, resources());

    record = { overall: Infinity };
  }
}

function syncConfiguration(expectedConfig) {
  const messages = [];

  if (!expectedConfig.trainBatchSize) {
    messages.push("Using default training batch size");
    expectedConfig.trainBatchSize = DEFAULT_TRAINING_BATCH_SIZE;
  }

  if (!(expectedConfig.dropoutRate >= 0)) {
    messages.push("Using default dropout rate");
    expectedConfig.dropoutRate = DEFAULT_DROPOUT_RATE;
  }

  if (!expectedConfig.measureBatchSize) {
    messages.push("Using default measurement batch size");
    expectedConfig.measureBatchSize = DEFAULT_MEASURE_BATCH_SIZE;
  }

  if (!expectedConfig.learningRate) {
    messages.push("Using default learning rate");
    expectedConfig.learningRate = DEFAULT_LEARNING_RATE;
  }

  if (!expectedConfig.clipNorm) {
    messages.push("Using default clip norm");
    expectedConfig.clipNorm = DEFAULT_CLIP_NORM;
  }

  if (JSON.stringify(config) !== JSON.stringify(expectedConfig)) {
    console.log("===========");
    console.log("Configuration:", JSON.stringify(expectedConfig));

    config = expectedConfig;

    for (const message of messages) {
      console.log(message);
    }

    writeTrainer(TRAINER_NAME, config);
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

function measure() {
  const loss = {};
  const accuracy = {};

  let lossSum = 0;
  let lossCount = 0;
  const allPerSample = [];

  for (const [name, generator] of Object.entries(skill.playbooks)) {
    const samples = createSamples({ playbook: generator }, config.measureBatchSize);
    const measurement = brain.measure(samples);
    const perSample = brain.measurePerSample(samples);

    loss[name] = measurement;
    accuracy[name] = percentileBuckets(perSample);

    lossSum += measurement;
    lossCount++;
    allPerSample.push(...perSample);
  }

  loss.overall = lossSum / lossCount;
  accuracy.overall = percentileBuckets(allPerSample);

  return { loss, accuracy };
}

function percentileBuckets(losses) {
  const sorted = losses.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const buckets = [];

  for (let i = 0; i < 20; i++) {
    const start = Math.floor((i * n) / 20);
    const end = Math.floor(((i + 1) * n) / 20);
    let max = 0;
    for (let j = start; j < end; j++) {
      if (sorted[j] > max) max = sorted[j];
    }
    buckets.push(max);
  }

  return buckets;
}

go();
