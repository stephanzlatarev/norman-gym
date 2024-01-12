import * as tf from "@tensorflow/tfjs-node";
import { loadBrain } from "./mongo.js";

const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";
const STORE_FOLDER = process.cwd();

export default class Brain {

  constructor(name) {
    this.name = name;
  }

  async load() {
    if (await loadBrain(this.name, STORE_FOLDER)) {
      console.log("Loading brain...");

      this.model = await tf.loadLayersModel("file://" + STORE_FOLDER + "/model.json");
      this.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION });
      this.model.summary();
    }
  }

  async evaluate(batch, fidelity) {
    tf.engine().startScope();

    const input = tf.tensor(batch.input, [batch.length, batch.inputSize]);
    const expected = tf.tensor(batch.output, [batch.length, batch.outputSize]);
    const actual = this.model.predict(input, { batchSize: batch.length, verbose: 0 });

    const evaluation = {
      loss: await get(loss, actual, expected),
      error: await get(error, actual, expected),
      pass: await get((actual, expected) => pass(actual, expected, fidelity), actual, expected),
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
