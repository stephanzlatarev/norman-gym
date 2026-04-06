import tf from "../tf.js";

export function encodeObservation(meta, skill, observation) {
  const input = {};

  for (const group of meta.groups) {
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

export function decodeAction(meta, skill, pred) {
  const result = {};

  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;

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

export function flattenInput(meta, input) {
  const flatInputs = [];
  for (const group of meta.groups) {
    for (const attr of group.observeAttrs) {
      flatInputs.push(input[group.name][attr.name]);
    }
  }
  return flatInputs;
}

export function flattenTargets(meta, skill, targets) {
  const flatTargets = [];
  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;
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

export function groupOutput(meta, skill, flatOutputs) {
  const result = {};

  const outputArray = Array.isArray(flatOutputs) ? flatOutputs
    : (flatOutputs instanceof tf.Tensor) ? [flatOutputs]
    : flatOutputs;

  let idx = 0;
  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;
    result[group.name] = {};
    for (const attr of group.actAttrs) {
      result[group.name][attr.name] = outputArray[idx++];
    }
  }

  return result;
}
