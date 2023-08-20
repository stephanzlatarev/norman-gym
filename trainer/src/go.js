import fs from "fs";
import * as tf from "@tensorflow/tfjs-node";
import { log } from "./mongo.js";

const BRAIN = "./brain.tf";

const SAMPLES_COUNT = 10000;
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const LEARNING_EPOCHS = 100;
const LEARNING_BATCH = 1024;
const HIDDEN_ACTIVATION_FUNCTION = "relu";
const OUTPUT_ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

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

function create() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [INPUT_SIZE], units: INPUT_SIZE, activation: HIDDEN_ACTIVATION_FUNCTION }));
  model.add(tf.layers.dense({ units: OUTPUT_SIZE, activation: OUTPUT_ACTIVATION_FUNCTION }));
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
  model.summary();
  return model;
}

async function load(file) {
  const model = await tf.loadLayersModel({
    load: function() {
      const model = JSON.parse(fs.readFileSync(file));
      model.weightData = new Uint8Array(model.weightData).buffer;
      return model;
    }
  });
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
  return model;
}

async function save(model, file) {
  await model.save({
    save: function(model) {
      const copy = {...model, weightData: []};
      copy.weightData = Array.from(new Uint8Array(model.weightData));
      fs.writeFileSync(file, JSON.stringify(copy));
    }
  });
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
      stats = { share: 0, error: 0, pass: 0, fail: 0, count: 0 };
      result[playbook] = stats;
    }
    stats.count++;
    stats.error += error;
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

function shouldRegenerateSamples(stats) {
  for (const playbook in stats) {
    if (stats[playbook].pass >= 1) return true;
  }

  return false;
}

async function go() {
  const playbooks = await loadPlaybooks();
  let controlSamples = generateSamples(playbooks);

  const share = {};
  for (const playbook of playbooks) share[playbook.name] = 1 / playbooks.length;

  let model = fs.existsSync(BRAIN) ? await load(BRAIN) : create();
  let studySamples = generateSamples(playbooks, share);

  let epoch = 0;
  while (++epoch) {
    const { studyStats, controlStats } = await run(model, studySamples, controlSamples);

    await log({
      epoch: epoch,
      study: studyStats,
      control: controlStats,
    });

    await save(model, BRAIN);

    if (shouldRegenerateSamples(studyStats)) {
      // TODO: Update playbook share
      controlSamples = generateSamples(playbooks);
      studySamples = generateSamples(playbooks, share);
    }
  }
}

go();
