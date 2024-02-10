import fs from "fs";
import * as tf from "@tensorflow/tfjs-node";
import { loadBrain, saveBrain } from "./mongo.js";
import { modelToShape, shapeToInfo } from "./shape.js";

const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";
const STORE_FOLDER = process.cwd();

export default class Brain {

  constructor(name, skill, shape, fidelity) {
    this.name = name;
    this.skill = skill;
    this.shape = shape;
    this.fidelity = fidelity ? fidelity : 0.01;
    this.timestamp = 0;
  }

  async load() {
    const timestamp = await loadBrain(this.name, STORE_FOLDER);

    if (timestamp) {
      console.log("Loading brain...");

      this.model = await tf.loadLayersModel("file://" + STORE_FOLDER + "/model.json");
      this.shape = compile(this.model);
      this.fit = this.model.model.makeTrainFunction();
      this.timestamp = timestamp;
    } else {
      this.reshape(this.shape);
    }
  }

  reshape(shape) {
    console.log("Creating", shape, "brain...");

    const info = shapeToInfo(shape);
    const model = tf.sequential();

    model.add(tf.layers.dense({ inputShape: [info.input], units: info.units }));
    model.add(tf.layers.reLU());

    for (const units of info.hidden) {
      model.add(tf.layers.dense({ units: units }));
      model.add(tf.layers.reLU());
    }

    model.add(tf.layers.dense({ units: info.output }));

    this.model = model;
    this.shape = compile(model);
    this.fit = model.model.makeTrainFunction();
    this.timestamp = Date.now();
  }

  train(batch, epochs) {
    tf.engine().startScope();

    const data = [
      tf.tensor(batch.input, [batch.length, batch.inputSize]),
      tf.tensor(batch.output, [batch.length, batch.outputSize])
    ];

    for (let epoch = 0; epoch < epochs; epoch++) {
      this.fit(data);
    }

    tf.engine().endScope();
  }

  async measure(batch) {
    tf.engine().startScope();

    const input = tf.tensor(batch.input, [batch.length, batch.inputSize]);
    const expected = tf.tensor(batch.output, [batch.length, batch.outputSize]);
    const actual = this.model.predict(input, { batchSize: batch.length, verbose: 0 });

    const evaluation = {
      loss: await get(loss, actual, expected),
      error: await get(error, actual, expected),
      pass: await get((actual, expected) => pass(actual, expected, this.fidelity), actual, expected),
    };

    tf.engine().endScope();

    return evaluation;
  }

  async predict(batch) {
    tf.engine().startScope();

    const input = tf.tensor(batch.input, [batch.length, batch.inputSize]);
    const result = await this.model.predict(input, { batchSize: batch.length, verbose: 0 }).array();

    tf.engine().endScope();

    return result;
  }

  async save(status) {
    await this.model.save("file://" + STORE_FOLDER, { includeOptimizer: true });
    await this.model.save({
      save: function(model) {
        model.weightData = Array.from(new Uint8Array(model.weightData));
        fs.writeFileSync(STORE_FOLDER + "/brain.tf", JSON.stringify(model));
      }
    });
    await saveBrain(this.name, STORE_FOLDER, this.skill, this.shape, status);
  }
}

function compile(model) {
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
  model.summary();

  return modelToShape(model);
}

async function get(metric, actual, expected) {
  const tensor = metric(actual, expected);
  const data = await tensor.data();
  return data[0];
}

function loss(actual, expected) {
  return actual.squaredDifference(expected).mean();
}

function error(actual, expected) {
  return actual.sub(expected).abs().max(1).mean();
}

function pass(actual, expected, fidelity) {
  return tf.scalar(1).sub(actual.sub(expected).abs().max(1).sub(fidelity).step().mean());
}
