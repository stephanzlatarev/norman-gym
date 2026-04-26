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
    const perSample = this.measurePerSample(samples);
    return perSample.reduce((s, v) => s + v, 0) / perSample.length;
  }

  // Returns an array of per-sample loss values in [0, 1]
  // Space/scalar: mean absolute error normalized by range
  // Label: 0 if correct, 1 if wrong
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

      const perSampleParts = [];
      let idx = 0;
      for (const group of this.meta.groups) {
        if (!this.skill.act[group.name]) continue;
        for (const attr of group.actAttributes) {
          const pred = predArray[idx];
          const target = targets[idx];
          const weight = weights[idx];

          let errorPerObject;
          if (attr.type === "label") {
            // 0 if argmax matches, 1 otherwise
            const predClass = pred.argMax(-1);   // (batch, objects)
            const trueClass = target.argMax(-1);  // (batch, objects)
            errorPerObject = predClass.notEqual(trueClass).cast("float32");
          } else {
            // Mean absolute error per object (pred and target already in [0,1])
            errorPerObject = pred.sub(target).abs().mean(-1); // (batch, objects)
          }

          // Apply sample weights and mean over objects: (batch,)
          const weighted = errorPerObject.mul(weight);
          perSampleParts.push(weighted.mean(-1));

          idx++;
        }
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
