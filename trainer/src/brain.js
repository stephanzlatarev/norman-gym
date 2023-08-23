import * as tf from "@tensorflow/tfjs-node";
import { loadBrain, saveBrain } from "./mongo.js";

const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;
const HIDDEN_ACTIVATION_FUNCTION = "relu";
const OUTPUT_ACTIVATION_FUNCTION = "sigmoid";
const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

function create() {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [INPUT_SIZE], units: INPUT_SIZE, activation: HIDDEN_ACTIVATION_FUNCTION }));
  model.add(tf.layers.dense({ units: OUTPUT_SIZE, activation: OUTPUT_ACTIVATION_FUNCTION }));
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION, metrics: [error, pass] });

  console.log("Brain created:");
  model.summary();

  return model;
}

export async function load(name) {
  const record = await loadBrain(name);

  if (!record) return create();

  const model = await tf.loadLayersModel({
    load: function() {
      return { ...record, weightData: new Uint8Array(record.weightData).buffer };
    }
  });

  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION, metrics: [error, pass] });

  console.log("Brain loaded:");
  model.summary();

  return model;
}

export async function save(name, model) {
  await model.save({
    save: function(model) {
      saveBrain(name, { ...model, weightData: Array.from(new Uint8Array(model.weightData)) });
    }
  });
}

function error(actual, expected) {
  return actual.sub(expected).abs().max(1).mean();
}

function pass(actual, expected) {
  return tf.scalar(1).sub(actual.sub(expected).abs().max(1).sub(0.01).step().mean());
}
