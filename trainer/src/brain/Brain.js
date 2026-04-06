import tf from "./tf.js";
import build from "./ops/build.js";
import validate from "./ops/validate.js";
import computeMetadata from "./ops/meta.js";
import { saveModel, loadModel } from "./ops/persist.js";
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

  predict(input) {
    const flatInputs = this._flattenInput(input);
    const flatOutputs = this.model.predict(flatInputs);
    return this._groupOutput(flatOutputs);
  }

  decide(observation) {
    return tf.tidy(() => {
      const input = this._encodeObservation(observation);
      const pred = this.predict(input);
      return this._decodeAction(pred);
    });
  }

  train(inputData, targetData, epochs) {
    tf.engine().startScope();

    const flatInputs = this._flattenInput(inputData);
    const flatTargets = this._flattenTargets(targetData);
    const data = [...flatInputs, ...flatTargets];

    for (let epoch = 0; epoch < epochs; epoch++) {
      this.fit(data);
    }

    tf.engine().endScope();
  }

  async save(folder) {
    await saveModel(this.model, folder);
  }

  summary() {
    this.model.summary();
  }

  // --- Private helpers ---

  _encodeObservation(observation) {
    const input = {};

    for (const group of this.meta.groups) {
      const objects = observation[group.name] || [];
      input[group.name] = {};

      for (let ai = 0; ai < group.observeAttrs.length; ai++) {
        const attr = group.observeAttrs[ai];
        const values = [];

        for (let i = 0; i < group.limit; i++) {
          if (i < objects.length) {
            const rawVal = objects[i][ai];
            if (attr.type === "label") {
              values.push(attr.options.indexOf(rawVal) + 1);
            } else {
              values.push(rawVal);
            }
          } else {
            values.push(0);
          }
        }

        const dtype = attr.type === "label" ? "int32" : "float32";
        input[group.name][attr.name] = tf.tensor2d([values], [1, group.limit], dtype);
      }
    }

    return input;
  }

  _decodeAction(pred) {
    const result = {};

    for (const group of this.meta.groups) {
      if (!this.skill.act[group.name]) continue;

      const attrData = {};
      for (const attr of group.actAttrs) {
        attrData[attr.name] = pred[group.name][attr.name].dataSync();
      }

      const tuples = [];
      for (let i = 0; i < group.outputObjects; i++) {
        const tuple = [];
        for (const attr of group.actAttrs) {
          if (attr.type === "label") {
            const numOptions = attr.options.length;
            const offset = i * numOptions;
            let maxIdx = 0;
            for (let j = 1; j < numOptions; j++) {
              if (attrData[attr.name][offset + j] > attrData[attr.name][offset + maxIdx]) maxIdx = j;
            }
            tuple.push(attr.options[maxIdx]);
          } else if (attr.type === "space") {
            tuple.push(Math.round(attrData[attr.name][i]));
          } else {
            tuple.push(attrData[attr.name][i]);
          }
        }
        tuples.push(tuple);
      }

      result[group.name] = tuples;
    }

    return result;
  }

  _flattenInput(input) {
    // Convert nested { groupName: { attrName: tensor } } to flat array matching model input order
    const flatInputs = [];
    for (const group of this.meta.groups) {
      for (const attr of group.observeAttrs) {
        const tensor = input[group.name][attr.name];
        flatInputs.push(tensor);
      }
    }
    return flatInputs;
  }

  _flattenTargets(targets) {
    // Convert nested { groupName_attrName_out: tensor } or { groupName: { attrName: tensor } } to flat array
    const flatTargets = [];
    for (const group of this.meta.groups) {
      if (!this.skill.act[group.name]) continue;
      for (const attr of group.actAttrs) {
        const outputName = `${group.name}_${attr.name}_out`;
        let tensor;
        if (targets[outputName]) {
          tensor = targets[outputName];
        } else if (targets[group.name] && targets[group.name][attr.name]) {
          tensor = targets[group.name][attr.name];
        }
        flatTargets.push(tensor);
      }
    }
    return flatTargets;
  }

  _groupOutput(flatOutputs) {
    const result = {};

    // flatOutputs is a single tensor (1 output) or array of tensors
    const outputArray = Array.isArray(flatOutputs) ? flatOutputs
      : (flatOutputs instanceof tf.Tensor) ? [flatOutputs]
      : flatOutputs;

    let idx = 0;
    for (const group of this.meta.groups) {
      if (!this.skill.act[group.name]) continue;
      result[group.name] = {};
      for (const attr of group.actAttrs) {
        result[group.name][attr.name] = outputArray[idx++];
      }
    }

    return result;
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
