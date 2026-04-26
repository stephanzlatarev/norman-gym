import tf from "./tf.js";
import build from "./ops/build.js";
import validate from "./ops/validate.js";
import computeMetadata from "./ops/meta.js";
import { saveModel, loadModel } from "./ops/persist.js";
import { encodeBatch, encodeObservation, decodeAction, flattenInput, groupOutput } from "./ops/translate.js";
import "./ops/register.js";

export default class Brain {

  constructor(name, config, skill) {
    validate(skill, config);

    this.name = name;
    this.config = config;
    this.skill = skill;
    this.meta = computeMetadata(skill, config);
  }

  init() {
    const { model } = build(this.skill, this.config);
    this.model = model;

    compile(this);
  }

  async load(folder) {
    const model = await loadModel(folder);

    if (model) {
      this.model = model;

      compile(this);
    }

    return !!model;
  }

  decide(observation) {
    return tf.tidy(() => {
      const input = encodeObservation(this.meta, this.skill, observation);
      const flatInputs = flattenInput(this.meta, input);
      const flatOutputs = this.model.predict(flatInputs);
      const pred = groupOutput(this.meta, this.skill, flatOutputs);
      return decodeAction(this.meta, this.skill, pred, observation);
    });
  }

  train(samples, seconds) {
    tf.engine().startScope();

    const data = encodeBatch(this.meta, this.skill, samples);

    let loss;
    const end = Date.now() + seconds * 1000;

    do {
      loss = this.fit(data);
    } while (Date.now() < end);

    const value = loss[0].dataSync()[0];

    tf.engine().endScope();

    return value;
  }

  async save(folder) {
    await saveModel(this.model, folder);
  }

  measure(samples) {
    tf.engine().startScope();

    const data = encodeBatch(this.meta, this.skill, samples);
    const numInputs = this.model.inputs.length;
    const numOutputs = this.meta.outputNames.length;
    const inputs = data.slice(0, numInputs);
    const targets = data.slice(numInputs, numInputs + numOutputs);
    const sampleWeights = data.slice(numInputs + numOutputs);

    const result = this.model.evaluate(inputs, targets, { batchSize: samples.length, sampleWeights });

    const values = Array.isArray(result) ? result : [result];
    const loss = values[0].dataSync()[0] / numOutputs;

    tf.engine().endScope();

    return loss;
  }

  // Returns a Float64Array of per-sample weighted losses
  measurePerSample(samples) {
    return tf.tidy(() => {
      const data = encodeBatch(this.meta, this.skill, samples);
      const numInputs = this.model.inputs.length;
      const numOutputs = this.meta.outputNames.length;
      const inputs = data.slice(0, numInputs);
      const targets = data.slice(numInputs, numInputs + numOutputs);
      const weights = data.slice(numInputs + numOutputs);

      const predictions = this.model.predict(inputs, { batchSize: samples.length });
      const predArray = Array.isArray(predictions) ? predictions : [predictions];

      // Compute weighted MSE per sample for each output, then average across outputs
      const perSampleParts = [];
      for (let i = 0; i < numOutputs; i++) {
        // squared error: (batch, objects, units)
        const se = predArray[i].sub(targets[i]).square();
        // mean over units (last axis): (batch, objects)
        const msePerObject = se.mean(-1);
        // multiply by sample weights: (batch, objects)
        const weighted = msePerObject.mul(weights[i]);
        // mean over objects: (batch,)
        const perSample = weighted.mean(-1);
        perSampleParts.push(perSample);
      }

      // Average across outputs: (batch,)
      const stacked = tf.stack(perSampleParts, 0); // (numOutputs, batch)
      const perSampleLoss = stacked.mean(0); // (batch,)

      return Array.from(perSampleLoss.dataSync());
    });
  }

  summary() {
    this.model.summary();
  }
}

function compile(brain) {
  const optimizer = tf.train.adam(
    brain.config.learningRate ?? 0.001,
    undefined,
    undefined,
    undefined,
    brain.config.clipNorm ?? 1.0
  );

  // Build sampleWeightMode map: 'temporal' for each output to enable per-object weighting
  const sampleWeightModes = {};
  for (const name of brain.meta.outputNames) {
    sampleWeightModes[name] = "temporal";
  }

  brain.model.compile({
    optimizer: optimizer,
    loss: brain.meta.lossMap,
    lossWeights: undefined,
    sampleWeightModes,
  });

  brain.fit = brain.model.makeTrainFunction();
}
