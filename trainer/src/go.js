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

function error(samples, predictions) {
  const result = {};
  const show = {};

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

    if (!show[playbook]) show[playbook] = { error: -Infinity };
    if (error > show[playbook].error) {
      const off = [];
      let worstOff = 0;
      let worstSpot = 0;
      for (let j = 0; j < predictions[i].length; j++) {
        off[j] = Math.abs(samples.output[i][j] - predictions[i][j]);
        if (off[j] > worstOff) {
          worstOff = off[j];
          worstSpot = j;
        }
      }
      show[playbook] = { error: error, input: samples.input[i], output: samples.output[i], prediction: predictions[i], off: off, spot: worstSpot }
    }
  }

  let errorSum = 0;
  let errorCount = 0;
  for (const playbook in result) {
    const stats = result[playbook];
    stats.pass /= stats.count;
    stats.error /= stats.count;
    stats.share = stats.count / predictions.length;

    errorSum += stats.error;
    errorCount++;
  }

  result.error = errorCount ? errorSum / errorCount : Infinity;

  return result;
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

async function run(model, studySamples, controlSamples) {
  tf.engine().startScope();

  const controlSamplesCount = controlSamples.input.length;
  const inputControlSamples = tf.tensor(controlSamples.input, [controlSamplesCount, controlSamples.inputSize]);
  const studySamplesCount = studySamples.input.length;
  const inputStudySamples = tf.tensor(studySamples.input, [studySamplesCount, studySamples.inputSize]);
  const outputStudySamples = tf.tensor(studySamples.output, [studySamplesCount, studySamples.outputSize]);

  const controlBefore = error(controlSamples, await model.predict(inputControlSamples, { batchSize: controlSamplesCount }).array());
  const studyBefore = error(studySamples, await model.predict(inputStudySamples, { batchSize: studySamplesCount }).array());

  await model.fit(inputStudySamples, outputStudySamples, { epochs: LEARNING_EPOCHS, batchSize: LEARNING_BATCH, shuffle: true, verbose: false });

  const controlAfter = error(controlSamples, await model.predict(inputControlSamples, { batchSize: controlSamplesCount }).array());
  const studyAfter = error(studySamples, await model.predict(inputStudySamples, { batchSize: studySamplesCount }).array(), "show");

  tf.engine().endScope();

  return { studyBefore: studyBefore, studyAfter: studyAfter, controlBefore: controlBefore, controlAfter: controlAfter, error: controlAfter.error };
}

function show(title, playbooks, stats) {
  const error = { studyError: 0, controlError: 0 };

  for (const playbook of playbooks) {
    const sa = stats.studyAfter[playbook.name];
    const ps = sa.pass - stats.studyBefore[playbook.name].pass;
    const pss = (ps >= 0) ? (ps !== 0) ? "+" : " " : "";
    const share = sa.share;
    const ca = stats.controlAfter[playbook.name];
    const pc = ca.pass - stats.controlBefore[playbook.name].pass;
    const pcs = (pc >= 0) ? (pc !== 0) ? "+" : " " : "";

    console.log(`[${title} ${Math.round(share * 100)}%]`, playbook.name, "\t",
      `${(sa.pass * 100).toFixed(2)}% (${pss}${(ps * 100).toFixed(2)}%) ${sa.error.toExponential(4)}`, "/",
      `${(ca.pass * 100).toFixed(2)}% (${pcs}${(pc * 100).toFixed(2)}%) ${ca.error.toExponential(4)}`
    );

    error.studyError = sa.error;
    error.controlError = ca.error;
  }

  return error;
}

async function go() {
  const playbooks = await loadPlaybooks();
  let controlSamples = generateSamples(playbooks);

  const share = {};
  for (const playbook of playbooks) share[playbook.name] = 1 / playbooks.length;

  let leaderModel = fs.existsSync(BRAIN) ? await load(BRAIN) : create();
  let leaderStudySamples = generateSamples(playbooks, share);

  let epoch = 0;
  while (++epoch) {
    const leaderStats = await run(leaderModel, leaderStudySamples, controlSamples);
    const { studyError, controlError } = show("", playbooks, leaderStats);

    await log(epoch, studyError, controlError);
    await save(leaderModel, BRAIN);
  }
}

go();
