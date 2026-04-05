import tf from "../tf.js";
import SinusoidalEncoding from "../layers/SinusoidalEncoding.js";
import GroupPositionalEncoding from "../layers/GroupPositionalEncoding.js";
import CreateObjects from "../layers/CreateObjects.js";
import SliceObjects from "../layers/SliceObjects.js";
import GroupedQueryAttention from "../layers/GroupedQueryAttention.js";
import FinalLayerNorm from "../layers/FinalLayerNorm.js";
import validate from "./validate.js";
import computeMetadata from "./meta.js";

// --- Transformer block wiring (functional API) ---

function buildTransformerBlock(input, blockIdx, objectWidth, brainWidth, config) {
  const p = `block${blockIdx}`;
  const headDim = objectWidth / config.attentionHeads;

  // Pre-norm attention
  let normed = tf.layers.layerNormalization({ axis: -1, name: `${p}_ln1` }).apply(input);

  // Q/K/V projections as standard dense layers
  let Q = tf.layers.dense({ units: config.attentionHeads * headDim, name: `${p}_Q` }).apply(normed);
  let K = tf.layers.dense({ units: config.attentionGroups * headDim, name: `${p}_K` }).apply(normed);
  let V = tf.layers.dense({ units: config.attentionGroups * headDim, name: `${p}_V` }).apply(normed);

  // GQA attention (reshape + scaled dot-product, no learnable weights)
  let attnOut = new GroupedQueryAttention({
    objectWidth,
    attentionHeads: config.attentionHeads,
    attentionGroups: config.attentionGroups,
    dropoutRate: config.dropoutRate,
    name: `${p}_gqa`,
  }).apply([Q, K, V]);

  // Output projection
  attnOut = tf.layers.dense({ units: objectWidth, name: `${p}_O` }).apply(attnOut);
  if (config.dropoutRate > 0) {
    attnOut = tf.layers.dropout({ rate: config.dropoutRate, name: `${p}_attn_drop` }).apply(attnOut);
  }

  // Residual
  let x = tf.layers.add({ name: `${p}_res1` }).apply([input, attnOut]);

  // Pre-norm FFN
  normed = tf.layers.layerNormalization({ axis: -1, name: `${p}_ln2` }).apply(x);
  let ffnOut = tf.layers.dense({ units: brainWidth, activation: "relu", name: `${p}_ffn1` }).apply(normed);
  ffnOut = tf.layers.dense({ units: objectWidth, name: `${p}_ffn2` }).apply(ffnOut);
  if (config.dropoutRate > 0) {
    ffnOut = tf.layers.dropout({ rate: config.dropoutRate, name: `${p}_ffn_drop` }).apply(ffnOut);
  }

  // Residual
  x = tf.layers.add({ name: `${p}_res2` }).apply([x, ffnOut]);

  return x;
}

// --- Model building ---

function buildEncoderForAttribute(attr, attributeWidth, groupName, limit, inputTensors) {
  const inputName = `${groupName}_${attr.name}_in`;

  if (attr.type === "space" || attr.type === "scalar") {
    // Input: (batch, limit) -> expand to (batch, limit, 1)
    const input = tf.input({ shape: [limit], name: inputName, dtype: "float32" });
    inputTensors.push(input);

    let expanded = tf.layers.reshape({ targetShape: [limit, 1], name: `${groupName}_${attr.name}_expand` }).apply(input);
    let projected = tf.layers.dense({ units: attributeWidth, name: `${groupName}_${attr.name}_proj`, useBias: true }).apply(expanded);

    if (attr.type === "space") {
      // Compute sinusoidal encoding from raw values and add to projection
      const encoding = new SinusoidalEncoding({
        attributeWidth,
        min: attr.range[0],
        max: attr.range[1],
        name: `${groupName}_${attr.name}_spatial`,
      }).apply(expanded);
      projected = tf.layers.add({ name: `${groupName}_${attr.name}_spatialadd` }).apply([projected, encoding]);
    }

    return { input, encoded: projected };
  } else {
    // label: embedding
    const input = tf.input({ shape: [limit], name: inputName, dtype: "int32" });
    inputTensors.push(input);

    const inputDim = attr.options.length + 1; // +1 for padding index 0
    const embedded = tf.layers.embedding({
      inputDim,
      outputDim: attributeWidth,
      name: `${groupName}_${attr.name}_embed`,
    }).apply(input);

    return { input, encoded: embedded };
  }
}

function buildMixer(group, attributeWidth, objectWidth, encodedAttrs) {
  // Concatenate all attribute encodings along last axis: (batch, limit, numAttrs * attributeWidth)
  let concatenated;
  if (encodedAttrs.length === 1) {
    concatenated = encodedAttrs[0];
  } else {
    concatenated = tf.layers.concatenate({ axis: -1, name: `${group.name}_concat` }).apply(encodedAttrs);
  }

  // Project to objectWidth: (batch, limit, objectWidth)
  const mixed = tf.layers.dense({
    units: objectWidth,
    name: `${group.name}_mixer`,
    useBias: true,
  }).apply(concatenated);

  return mixed;
}

function buildOutputHead(groupMeta, attr, objectWidth, transformerOutput) {
  const outputName = `${groupMeta.name}_${attr.name}_out`;
  const outputObjects = groupMeta.outputObjects;

  // Collect objects for this output head
  const objectSlices = [];

  if (groupMeta.modify) {
    // Slice observe objects
    const observeSlice = new SliceObjects({
      start: groupMeta.observeOffset,
      size: groupMeta.limit,
      name: `${groupMeta.name}_${attr.name}_modify_slice`,
    }).apply(transformerOutput);
    objectSlices.push(observeSlice);
  }

  if (groupMeta.create > 0) {
    // Slice create objects
    const createSlice = new SliceObjects({
      start: groupMeta.createOffset,
      size: groupMeta.create,
      name: `${groupMeta.name}_${attr.name}_create_slice`,
    }).apply(transformerOutput);
    objectSlices.push(createSlice);
  }

  let objects;
  if (objectSlices.length === 1) {
    objects = objectSlices[0];
  } else {
    objects = tf.layers.concatenate({ axis: 1, name: `${groupMeta.name}_${attr.name}_cat` }).apply(objectSlices);
  }

  // Output head: single dense layer
  if (attr.type === "space" || attr.type === "scalar") {
    return tf.layers.dense({
      units: 1,
      name: outputName,
      useBias: true,
    }).apply(objects);
  } else {
    // label: output probabilities over options
    return tf.layers.dense({
      units: attr.options.length,
      activation: "softmax",
      name: outputName,
      useBias: true,
    }).apply(objects);
  }
}

export default function build(skill, config) {
  validate(skill, config);

  const meta = computeMetadata(skill, config);
  const { attributeWidth, objectWidth, brainWidth, groups, groupAssignments, totalObjects, totalCreateObjects, numGroups } = meta;

  const allInputs = [];
  const mixedGroups = [];

  // Build encoders and mixers for each observe group
  for (const group of groups) {
    const encodedAttrs = [];

    for (const attr of group.observeAttrs) {
      const { input, encoded } = buildEncoderForAttribute(attr, attributeWidth, group.name, group.limit, allInputs);
      encodedAttrs.push(encoded);
    }

    const mixed = buildMixer(group, attributeWidth, objectWidth, encodedAttrs);
    mixedGroups.push(mixed);
  }

  // Build create objects if needed
  let createObjectsTensor = null;
  let batchRefTensor = mixedGroups[0]; // reference for batch size

  if (totalCreateObjects > 0) {
    createObjectsTensor = new CreateObjects({
      numObjects: totalCreateObjects,
      objectWidth,
      name: "create_objects",
    }).apply(batchRefTensor);
  }

  // Concatenate all objects: observe groups + create objects
  const objectParts = [...mixedGroups];
  if (createObjectsTensor) {
    objectParts.push(createObjectsTensor);
  }

  let allObjects;
  if (objectParts.length === 1) {
    allObjects = objectParts[0];
  } else {
    allObjects = tf.layers.concatenate({ axis: 1, name: "object_concat" }).apply(objectParts);
  }

  // Apply group-level positional encoding
  allObjects = new GroupPositionalEncoding({
    objectWidth,
    groupAssignments,
    numGroups,
    name: "group_pe",
  }).apply(allObjects);

  // Stack transformer blocks using standard functional API layers
  for (let i = 0; i < config.brainLayers; i++) {
    allObjects = buildTransformerBlock(allObjects, i, objectWidth, brainWidth, config);
  }

  // Final layer norm
  allObjects = new FinalLayerNorm({
    width: objectWidth,
    name: "final_ln",
  }).apply(allObjects);

  // Build output heads
  const outputList = [];
  for (const group of groups) {
    if (!skill.act[group.name]) continue;

    for (const attr of group.actAttrs) {
      outputList.push(buildOutputHead(group, attr, objectWidth, allObjects));
    }
  }

  // Build the tf.LayersModel
  const model = tf.model({
    inputs: allInputs,
    outputs: outputList,
    name: "brain",
  });

  return { model, meta };
}
