import * as tf from "@tensorflow/tfjs-node";
import { loadBrain, saveBrain } from "./mongo.js";
import { modelToShape, shapeToInfo } from "./shape.js";

const OPTIMIZER_FUNCTION = "adam";
const LOSS_FUNCTION = "meanSquaredError";

export default class Brain {

  constructor(name, shape) {
    this.name = name;
    this.shape = shape;
  }

  async load() {
    const record = await loadBrain(this.name);

    if (record) {
      console.log("Loading brain...");

      this.model = await tf.loadLayersModel({
        load: function() {
          return { ...record, weightData: new Uint8Array(record.weightData).buffer };
        }
      });
      this.shape = compile(this.model);
    } else {
      this.reshape(this.shape);
    }
  }

  reshape(shape) {
    console.log("Creating", shape, "brain...");

    const info = shapeToInfo(shape);
    const model = tf.sequential();

    model.add(tf.layers.dense({ inputShape: [info.input], units: Number(info.units) }));
    model.add(tf.layers.leakyReLU());

    for (let i = 1; i < info.layers; i++) {
      model.add(tf.layers.dense({ units: info.units }));
      model.add(tf.layers.leakyReLU());
    }

    model.add(tf.layers.dense({ units: info.output }));
    model.add(tf.layers.leakyReLU());

    this.model = model;
    this.shape = compile(model);
  }

  async fit(batch) {
    tf.engine().startScope();

    const input = tf.tensor(batch.input, [batch.length, batch.inputSize]);
    const output = tf.tensor(batch.output, [batch.length, batch.outputSize]);

    const result = await this.model.fit(input, output, { epochs: 1, batchSize: batch.length, shuffle: true, verbose: 0 });

    tf.engine().endScope();

    return {
      loss: result.history.loss[0],
      error: result.history.error[0],
      pass: result.history.pass[0],
    };
  }

  async evaluate(batch) {
    tf.engine().startScope();

    const input = tf.tensor(batch.input, [batch.length, batch.inputSize]);
    const output = tf.tensor(batch.output, [batch.length, batch.outputSize]);

    const result = this.model.evaluate(input, output, { batchSize: batch.length });

    const loss = (await result[this.model.metricsNames.indexOf("loss")].data())[0];
    const error = (await result[this.model.metricsNames.indexOf("error")].data())[0];
    const pass = (await result[this.model.metricsNames.indexOf("pass")].data())[0];

    tf.engine().endScope();

    return {
      loss: loss,
      error: error,
      pass: pass,
    };
  }

  async predict(batch) {
    tf.engine().startScope();

    const input = tf.tensor(batch.input, [batch.length, batch.inputSize]);
    const result = await this.model.predict(input, { batchSize: batch.length, verbose: 0 }).array();

    tf.engine().endScope();

    return result;
  }

  async checkpoint() {
    let point;

    await this.model.save({
      save: function(model) {
        point = JSON.stringify({ ...model, weightData: Array.from(new Uint8Array(model.weightData)) });
      }
    });

    return point;
  }

  async restore(point) {
    const model = JSON.parse(point);

    this.model = await tf.loadLayersModel({
      load: function() {
        return { ...model, weightData: new Uint8Array(model.weightData).buffer };
      }
    });
    this.model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION, metrics: [error, pass] });
  }

  async save() {
    const name = this.name;
    const model = this.model;

    await model.save({
      save: async function(model) {
        await saveBrain(name, { ...model, weightData: Array.from(new Uint8Array(model.weightData)) });
      }
    });
  }
}

function compile(model) {
  model.compile({ optimizer: OPTIMIZER_FUNCTION, loss: LOSS_FUNCTION, metrics: [error, pass] });
  model.summary();

  return modelToShape(model);
}

function error(actual, expected) {
  return actual.sub(expected).abs().max(1).mean();
}

function pass(actual, expected) {
  return tf.scalar(1).sub(actual.sub(expected).abs().max(1).sub(0.01).step().mean());
}
