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
    const observed = this.model.predict(input, { batchSize: batch.length, verbose: 0 });

    const samples = {
      count: batch.length,
      input: write(input.dataSync()),
      expected: write(expected.dataSync()),
      observed: write(observed.dataSync()),
    };
    const evaluation = {
      loss: await get(loss, observed, expected),
      error: await get(error, observed, expected),
      pass: await get((actual, expected) => pass(actual, expected, fidelity), observed, expected),
    };

    tf.engine().endScope();

    return {
      samples: samples,
      evaluation: evaluation,
    }
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

function write(array) {
  return Buffer.from(array.buffer).toString("base64");
}
