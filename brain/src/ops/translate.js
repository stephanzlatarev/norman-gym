import tf from "../tf.js";

export function encodeObservation(meta, skill, observation) {
  const input = {};

  for (const group of meta.groups) {
    const objects = observation[group.name] || [];
    input[group.name] = {};

    for (let ai = 0; ai < group.observeAttributes.length; ai++) {
      const attr = group.observeAttributes[ai];
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

export function encodeAction(meta, skill, action) {
  const targets = [];

  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;

    const tuples = action[group.name] || [];

    for (const attr of group.actAttributes) {
      const ai = group.actAttributes.indexOf(attr);

      if (attr.type === "label") {
        const numOptions = attr.options.length;
        const oneHot = [];
        for (let i = 0; i < group.outputObjects; i++) {
          const row = new Array(numOptions).fill(0);
          if (i < tuples.length) {
            const idx = attr.options.indexOf(tuples[i][ai]);
            if (idx >= 0) row[idx] = 1;
          }
          oneHot.push(row);
        }
        targets.push(tf.tensor3d([oneHot], [1, group.outputObjects, numOptions]));
      } else {
        const values = [];
        for (let i = 0; i < group.outputObjects; i++) {
          values.push(i < tuples.length ? tuples[i][ai] : 0);
        }
        targets.push(tf.tensor3d([values.map(v => [v])], [1, group.outputObjects, 1]));
      }
    }
  }

  return targets;
}

export function encodeBatch(meta, skill, samples) {
  const inputArrays = [];
  const targetArrays = [];

  for (const sample of samples) {
    const input = encodeObservation(meta, skill, sample.observe);
    inputArrays.push(flattenInput(meta, input));
    targetArrays.push(encodeAction(meta, skill, sample.act));
  }

  const flatInputs = inputArrays[0].map((_, i) =>
    tf.concat(inputArrays.map(a => a[i]), 0)
  );
  const flatTargets = targetArrays[0].map((_, i) =>
    tf.concat(targetArrays.map(a => a[i]), 0)
  );

  // Dispose per-sample tensors
  for (const arr of inputArrays) arr.forEach(t => t.dispose());
  for (const arr of targetArrays) arr.forEach(t => t.dispose());

  return [...flatInputs, ...flatTargets];
}

export function decodeAction(meta, skill, pred) {
  const result = {};

  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;

    const attrData = {};
    for (const attr of group.actAttributes) {
      attrData[attr.name] = pred[group.name][attr.name].dataSync();
    }

    const tuples = [];
    for (let i = 0; i < group.outputObjects; i++) {
      const tuple = [];
      for (const attr of group.actAttributes) {
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
    for (const attr of group.observeAttributes) {
      flatInputs.push(input[group.name][attr.name]);
    }
  }
  return flatInputs;
}

export function flattenTargets(meta, skill, targets) {
  const flatTargets = [];
  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;
    for (const attr of group.actAttributes) {
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
    for (const attr of group.actAttributes) {
      result[group.name][attr.name] = outputArray[idx++];
    }
  }

  return result;
}
