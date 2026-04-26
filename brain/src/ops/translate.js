import tf from "../tf.js";

export function encodeObservation(meta, skill, observation) {
  const input = {};
  const counts = {};

  for (const group of meta.groups) {
    const objects = observation[group.name] || [];
    input[group.name] = {};
    counts[group.name] = objects.length;

    for (let ai = 0; ai < group.observeAttributes.length; ai++) {
      const attr = group.observeAttributes[ai];

      if (attr.type === "space") {
        // Multi-axis space: read tupleWidth values from each object
        const axisValues = [];
        for (let i = 0; i < group.limit; i++) {
          const row = [];
          for (let a = 0; a < attr.tupleWidth; a++) {
            row.push(i < objects.length ? objects[i][attr.tupleOffset + a] : 0);
          }
          axisValues.push(row);
        }
        input[group.name][attr.name] = tf.tensor3d([axisValues], [1, group.limit, attr.tupleWidth], "float32");
      } else if (attr.type === "label") {
        const values = [];
        for (let i = 0; i < group.limit; i++) {
          if (i < objects.length) {
            values.push(attr.options.indexOf(objects[i][attr.tupleOffset]) + 1);
          } else {
            values.push(0);
          }
        }
        input[group.name][attr.name] = tf.tensor2d([values], [1, group.limit], "int32");
      } else {
        // scalar
        const values = [];
        for (let i = 0; i < group.limit; i++) {
          values.push(i < objects.length ? objects[i][attr.tupleOffset] : 0);
        }
        input[group.name][attr.name] = tf.tensor2d([values], [1, group.limit], "float32");
      }
    }
  }

  input._counts = counts;

  return input;
}

export function encodeAction(meta, skill, action) {
  const targets = [];

  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;

    const tuples = action[group.name] || [];

    for (const attr of group.actAttributes) {

      if (attr.type === "label") {
        const numOptions = attr.options.length;
        const oneHot = [];
        for (let i = 0; i < group.outputObjects; i++) {
          const row = new Array(numOptions).fill(0);
          if (i < tuples.length) {
            const idx = attr.options.indexOf(tuples[i][attr.actTupleOffset]);
            if (idx >= 0) row[idx] = 1;
          }
          oneHot.push(row);
        }
        targets.push(tf.tensor3d([oneHot], [1, group.outputObjects, numOptions]));
      } else if (attr.type === "space") {
        // Multi-axis space: output (batch, outputObjects, numAxes)
        const rows = [];
        for (let i = 0; i < group.outputObjects; i++) {
          const row = [];
          for (let a = 0; a < attr.tupleWidth; a++) {
            row.push(i < tuples.length ? tuples[i][attr.actTupleOffset + a] : 0);
          }
          rows.push(row);
        }
        targets.push(tf.tensor3d([rows], [1, group.outputObjects, attr.tupleWidth]));
      } else {
        // scalar
        const values = [];
        for (let i = 0; i < group.outputObjects; i++) {
          values.push(i < tuples.length ? tuples[i][attr.actTupleOffset] : 0);
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
  const weightArrays = [];

  for (const sample of samples) {
    const input = encodeObservation(meta, skill, sample.observe);
    inputArrays.push(flattenInput(meta, input));
    targetArrays.push(encodeAction(meta, skill, sample.act));
    weightArrays.push(encodeSampleWeights(meta, skill, sample.observe));
  }

  const flatInputs = inputArrays[0].map((_, i) =>
    tf.concat(inputArrays.map(a => a[i]), 0)
  );
  const flatTargets = targetArrays[0].map((_, i) =>
    tf.concat(targetArrays.map(a => a[i]), 0)
  );
  const flatWeights = weightArrays[0].map((_, i) =>
    tf.concat(weightArrays.map(a => a[i]), 0)
  );

  // Dispose per-sample tensors
  for (const arr of inputArrays) arr.forEach(t => t.dispose());
  for (const arr of targetArrays) arr.forEach(t => t.dispose());
  for (const arr of weightArrays) arr.forEach(t => t.dispose());

  return [...flatInputs, ...flatTargets, ...flatWeights];
}

function encodeSampleWeights(meta, skill, observation) {
  const weights = [];

  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;

    const observedCount = (observation[group.name] || []).length;
    const modifyCount = group.modify ? Math.min(observedCount, group.limit) : 0;
    const values = [];

    // Modify slots: real up to modifyCount, padding after
    if (group.modify) {
      for (let i = 0; i < group.limit; i++) {
        values.push(i < modifyCount ? 1.0 : 0.0);
      }
    }

    // Create slots are always real
    for (let i = 0; i < group.create; i++) {
      values.push(1.0);
    }

    // One weight tensor per output attribute (same mask for all attributes in the group)
    for (const attr of group.actAttributes) {
      weights.push(tf.tensor2d([values], [1, group.outputObjects]));
    }
  }

  return weights;
}

export function decodeAction(meta, skill, pred, observation = {}) {
  const result = {};

  for (const group of meta.groups) {
    if (!skill.act[group.name]) continue;

    const attrData = {};
    for (const attr of group.actAttributes) {
      attrData[attr.name] = pred[group.name][attr.name].dataSync();
    }

    const observedObjects = observation[group.name] || [];
    const observedCount = Array.isArray(observedObjects) ? observedObjects.length : 0;
    const modifyCount = group.modify ? Math.min(observedCount, group.limit) : 0;
    const tupleCount = modifyCount + group.create;

    const tuples = [];
    for (let i = 0; i < tupleCount; i++) {
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
          // Multi-axis: read tupleWidth values per object
          for (let a = 0; a < attr.tupleWidth; a++) {
            tuple.push(attrData[attr.name][i * attr.tupleWidth + a]);
          }
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

  // Append RoPE coordinate tensor if spatial axes exist
  if (meta.spatialAxes > 0) {
    const coordParts = [];

    for (const group of meta.groups) {
      if (group.spatialAttribute) {
        // First space attribute input: (batch, limit, spatialAxes)
        coordParts.push(input[group.name][group.spatialAttribute]);
      } else {
        // No spatial attribute in this group: pad with zeros
        const batchSize = flatInputs[0].shape[0];
        coordParts.push(tf.zeros([batchSize, group.limit, meta.spatialAxes]));
      }
    }

    // Pad create objects with zeros
    if (meta.totalCreateObjects > 0) {
      const batchSize = flatInputs[0].shape[0];
      coordParts.push(tf.zeros([batchSize, meta.totalCreateObjects, meta.spatialAxes]));
    }

    const coords = coordParts.length === 1
      ? coordParts[0]
      : tf.concat(coordParts, 1); // (batch, totalObjects, spatialAxes)
    flatInputs.push(coords);
  }

  // Build padding mask: (batch, totalObjects) — 1.0 for real, 0.0 for padding
  const batchSize = flatInputs[0].shape[0];
  const counts = input._counts;
  const maskParts = [];

  for (const group of meta.groups) {
    const count = counts ? (counts[group.name] || 0) : group.limit;
    const ones = count > 0 ? tf.ones([batchSize, count]) : null;
    const zeros = count < group.limit ? tf.zeros([batchSize, group.limit - count]) : null;
    if (ones && zeros) {
      maskParts.push(tf.concat([ones, zeros], 1));
    } else if (ones) {
      maskParts.push(ones);
    } else {
      maskParts.push(zeros);
    }
  }

  // Create objects are always real (not padding)
  if (meta.totalCreateObjects > 0) {
    maskParts.push(tf.ones([batchSize, meta.totalCreateObjects]));
  }

  const mask = maskParts.length === 1
    ? maskParts[0]
    : tf.concat(maskParts, 1); // (batch, totalObjects)
  flatInputs.push(mask);

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
