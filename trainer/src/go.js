import fs from "fs";
import * as tf from "@tensorflow/tfjs-node";
import { load, save } from "./brain.js";
import { log } from "./mongo.js";

const BRAIN = "brain";

const SAMPLES_COUNT = 10000;
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const LEARNING_EPOCHS = 100;
const LEARNING_BATCH = 1024;

async function loadPlaybooks() {
  const scripts = fs.readdirSync("./src/playbook/").filter(name => name.endsWith(".js"));
  const playbooks = [];

  for (const script of scripts) {
    const module = await import("./playbook/" + script);
    playbooks.push({
      name: script.substring(0, script.length - 3),
      sample: module.default,
      share: 1 / scripts.length,
    });
  }

  return playbooks;
}

function generateSamples(playbooks, share) {
  const source = [];
  const input = [];
  const output = [];

  for (const playbook of playbooks) {
    const count = SAMPLES_COUNT * (share ? share[playbook.name] : 1 / playbooks.length);

    for (let i = 0; i < count; i++) {
      const sample = playbook.sample();
      source.push(playbook.name);
      input.push(sample.input);
      output.push(sample.output);
    }
  }

  return {
    length: input.length,
    source: source,
    input: input,
    inputSize: INPUT_SIZE,
    output: output,
    outputSize: OUTPUT_SIZE,
  };
}

function compare(samples, predictions) {
  const result = {};

  for (let i = 0; i < predictions.length; i++) {
    const playbook = samples.source[i];

    let error = 0;
    for (let j = 0; j < predictions[i].length; j++) {
      error = Math.max(error, Math.abs(samples.output[i][j] - predictions[i][j]));
    }

    let stats = result[playbook];
    if (!stats) {
      stats = { share: 0, error: 0, errorMax: -Infinity, errorMin: Infinity, pass: 0, fail: 0, count: 0 };
      result[playbook] = stats;
    }

    stats.count++;
    stats.error += error;
    stats.errorMax = Math.max(stats.errorMax, error);
    stats.errorMin = Math.min(stats.errorMin, error);

    if (error < 0.01) {
      stats.pass++;
    } else if (error > 0.99) {
      stats.fail++;
    }
  }

  for (const playbook in result) {
    const stats = result[playbook];
    stats.pass /= stats.count;
    stats.error /= stats.count;
    stats.share = stats.count / predictions.length;
  }

  return result;
}

async function run(model, studySamples, controlSamples) {
  tf.engine().startScope();

  const controlSamplesCount = controlSamples.input.length;
  const inputControlSamples = tf.tensor(controlSamples.input, [controlSamplesCount, controlSamples.inputSize]);
  const studySamplesCount = studySamples.input.length;
  const inputStudySamples = tf.tensor(studySamples.input, [studySamplesCount, studySamples.inputSize]);
  const outputStudySamples = tf.tensor(studySamples.output, [studySamplesCount, studySamples.outputSize]);

  await model.fit(inputStudySamples, outputStudySamples, { epochs: LEARNING_EPOCHS, batchSize: LEARNING_BATCH, shuffle: true, verbose: false });

  const controlStats = compare(controlSamples, await model.predict(inputControlSamples, { batchSize: controlSamplesCount }).array());
  const studyStats = compare(studySamples, await model.predict(inputStudySamples, { batchSize: studySamplesCount }).array());

  tf.engine().endScope();

  return { studyStats: studyStats, controlStats: controlStats };
}

function shouldRegenerateSamples(studyStats, controlSamples) {
  for (const playbook in studyStats) {
    if ((studyStats[playbook].pass >= 1) || (studyStats[playbook].errorMax <= controlSamples[playbook].error)) return true;
  }

  return false;
}

async function go() {
  const playbooks = await loadPlaybooks();
  let controlSamples = generateSamples(playbooks);

  const share = {};
  for (const playbook of playbooks) share[playbook.name] = 1 / playbooks.length;

  let model = await load(BRAIN);
  let studySamples = generateSamples(playbooks, share);

  let epoch = 0;
  while (++epoch) {
    const { studyStats, controlStats } = await run(model, studySamples, controlSamples);

    await log({
      brain: BRAIN,
      epoch: epoch,
      study: studyStats,
      control: controlStats,
    });

    await save(BRAIN, model);

    if (shouldRegenerateSamples(studyStats, controlStats)) {
      // TODO: Update playbook share
      controlSamples = generateSamples(playbooks);
      studySamples = generateSamples(playbooks, share);
    }
  }
}

go();
