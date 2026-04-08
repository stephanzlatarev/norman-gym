import tf from "./tf.js";
import build from "./ops/build.js";
import validate from "./ops/validate.js";
import computeMetadata from "./ops/meta.js";
import { saveModel, loadModel } from "./ops/persist.js";
import { encodeBatch, encodeObservation, decodeAction, flattenInput, groupOutput } from "./ops/translate.js";
import "./ops/register.js";

const OPTIMIZER = "adam";

export default class Brain {

  constructor(skill, config) {
    validate(skill, config);

    this.skill = skill;
    this.config = config;
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
      return decodeAction(this.meta, this.skill, pred);
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

  summary() {
    this.model.summary();
  }
}

function compile(brain) {
  brain.model.compile({
    optimizer: OPTIMIZER,
    loss: brain.meta.lossMap,
    lossWeights: undefined,
  });

  brain.fit = brain.model.makeTrainFunction();
}
