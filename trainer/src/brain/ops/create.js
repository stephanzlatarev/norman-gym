import tf from "../tf.js";
import SinusoidalEncoding from "../layers/SinusoidalEncoding.js";
import GroupPositionalEncoding from "../layers/GroupPositionalEncoding.js";
import CreateTokens from "../layers/CreateTokens.js";
import SliceTokens from "../layers/SliceTokens.js";
import GroupedQueryAttention from "../layers/GroupedQueryAttention.js";
import FinalLayerNorm from "../layers/FinalLayerNorm.js";

// --- Validation ---

function validateConfig(config) {
  const errors = [];

  if (!Number.isInteger(config.objectWidth) || config.objectWidth <= 0)
    errors.push("objectWidth must be a positive integer.");
  if (!Number.isInteger(config.attentionHeads) || config.attentionHeads <= 0)
    errors.push("attentionHeads must be a positive integer.");
  if (!Number.isInteger(config.attentionGroups) || config.attentionGroups <= 0)
    errors.push("attentionGroups must be a positive integer.");
  if (!Number.isInteger(config.brainLayers) || config.brainLayers <= 0)
    errors.push("brainLayers must be a positive integer.");

  if (config.objectWidth > 0 && config.attentionHeads > 0 && config.objectWidth % config.attentionHeads !== 0)
    errors.push(`objectWidth (${config.objectWidth}) must be divisible by attentionHeads (${config.attentionHeads}).`);
  if (config.attentionHeads > 0 && config.attentionGroups > 0 && config.attentionHeads % config.attentionGroups !== 0)
    errors.push(`attentionHeads (${config.attentionHeads}) must be divisible by attentionGroups (${config.attentionGroups}).`);

  if (config.brainWidth !== undefined && config.brainWidth !== null) {
    if (!Number.isInteger(config.brainWidth) || config.brainWidth <= 0)
      errors.push("brainWidth, if provided, must be a positive integer.");
  }

  if (config.attributeWidth !== undefined && config.attributeWidth !== null) {
    if (!Number.isInteger(config.attributeWidth) || config.attributeWidth <= 0)
      errors.push("attributeWidth, if provided, must be a positive integer.");
  }

  if (typeof config.dropoutRate !== "number" || config.dropoutRate < 0 || config.dropoutRate > 1)
    errors.push("dropoutRate must be a number in [0, 1].");

  return errors;
}

function validateSkill(skill) {
  const errors = [];

  if (!skill || typeof skill !== "object")
    return ["Skill must be a non-null object."];

  if (typeof skill.name !== "string" || !skill.name.trim())
    errors.push("Skill name must be a non-empty string.");

  if (!skill.observe || typeof skill.observe !== "object" || Object.keys(skill.observe).length === 0)
    errors.push("observe must be a non-empty object of named groups.");

  if (!skill.act || typeof skill.act !== "object" || Object.keys(skill.act).length === 0)
    errors.push("act must be a non-empty object of named groups.");

  if (errors.length > 0) return errors;

  // Validate observe groups
  for (const [groupName, group] of Object.entries(skill.observe)) {
    if (groupName.includes("_"))
      errors.push(`Observe group name "${groupName}" must not contain underscores.`);

    if (!Number.isInteger(group.limit) || group.limit <= 0)
      errors.push(`Observe group "${groupName}": limit must be a positive integer.`);

    if (!Array.isArray(group.attributes) || group.attributes.length === 0)
      errors.push(`Observe group "${groupName}": attributes must be a non-empty array.`);
    else {
      const attrNames = new Set();
      for (const attr of group.attributes) {
        if (typeof attr.name !== "string" || !attr.name.trim())
          errors.push(`Observe group "${groupName}": attribute name must be a non-empty string.`);
        if (attr.name && attr.name.includes("_"))
          errors.push(`Observe group "${groupName}": attribute name "${attr.name}" must not contain underscores.`);
        if (attrNames.has(attr.name))
          errors.push(`Observe group "${groupName}": duplicate attribute name "${attr.name}".`);
        attrNames.add(attr.name);

        if (!["space", "scalar", "label"].includes(attr.type))
          errors.push(`Observe group "${groupName}", attribute "${attr.name}": type must be one of space, scalar, label.`);

        if (attr.type === "space" || attr.type === "scalar") {
          if (!Array.isArray(attr.range) || attr.range.length !== 2)
            errors.push(`Observe group "${groupName}", attribute "${attr.name}": range must be [min, max].`);
          else if (attr.range[0] >= attr.range[1])
            errors.push(`Observe group "${groupName}", attribute "${attr.name}": range min must be less than max.`);
        }

        if (attr.type === "label") {
          if (!Array.isArray(attr.options) || attr.options.length < 2)
            errors.push(`Observe group "${groupName}", attribute "${attr.name}": options must have at least 2 entries.`);
        }
      }
    }
  }

  // Validate act groups
  for (const [groupName, group] of Object.entries(skill.act)) {
    if (!(groupName in skill.observe))
      errors.push(`Act group "${groupName}" must match an observe group name.`);

    if (typeof group.modify !== "boolean")
      errors.push(`Act group "${groupName}": modify must be a boolean.`);

    if (!Number.isInteger(group.create) || group.create < 0)
      errors.push(`Act group "${groupName}": create must be a non-negative integer.`);

    if (group.modify !== true && (!Number.isInteger(group.create) || group.create <= 0))
      errors.push(`Act group "${groupName}": at least one of modify or create must be active.`);

    if (!Array.isArray(group.attributes) || group.attributes.length === 0)
      errors.push(`Act group "${groupName}": attributes must be a non-empty array.`);
    else if (groupName in skill.observe) {
      const observeAttrNames = new Set(skill.observe[groupName].attributes.map(a => a.name));
      for (const actAttr of group.attributes) {
        if (!observeAttrNames.has(actAttr.name))
          errors.push(`Act group "${groupName}", attribute "${actAttr.name}": must match an attribute in observe group "${groupName}".`);
      }
    }
  }

  return errors;
}

export function validate(skill, config) {
  const errors = [...validateSkill(skill), ...validateConfig(config)];
  if (errors.length > 0) {
    throw new Error("Invalid brain configuration:\n  - " + errors.join("\n  - "));
  }
}

// --- Metadata computation ---

export function computeMetadata(skill, config) {
  const attributeWidth = config.attributeWidth || 128;
  const objectWidth = config.objectWidth;
  const brainWidth = config.brainWidth || 4 * objectWidth;

  const groups = [];
  let tokenOffset = 0;
  const groupAssignments = [];

  const observeGroupNames = Object.keys(skill.observe);

  for (let gi = 0; gi < observeGroupNames.length; gi++) {
    const groupName = observeGroupNames[gi];
    const observeGroup = skill.observe[groupName];
    const actGroup = skill.act[groupName];

    const limit = observeGroup.limit;
    const modify = actGroup ? actGroup.modify : false;
    const create = actGroup ? actGroup.create : 0;

    const observeAttrs = observeGroup.attributes.map(attr => {
      const base = { name: attr.name, type: attr.type };
      if (attr.type === "space" || attr.type === "scalar") base.range = attr.range;
      if (attr.type === "label") base.options = attr.options;
      return base;
    });

    const actAttrs = actGroup ? actGroup.attributes.map(actAttr => {
      return observeAttrs.find(a => a.name === actAttr.name);
    }) : [];

    const outputObjects = (modify ? limit : 0) + create;

    const groupMeta = {
      name: groupName,
      groupIndex: gi,
      limit,
      modify,
      create,
      observeOffset: tokenOffset,
      observeAttrs,
      actAttrs,
      outputObjects,
    };

    // Observe tokens
    for (let t = 0; t < limit; t++) {
      groupAssignments.push(gi);
    }
    tokenOffset += limit;

    groups.push(groupMeta);
  }

  // Second pass: assign create token offsets
  for (const group of groups) {
    if (group.create > 0) {
      group.createOffset = tokenOffset;
      for (let t = 0; t < group.create; t++) {
        groupAssignments.push(group.groupIndex);
      }
      tokenOffset += group.create;
    }
  }

  const totalTokens = tokenOffset;
  const totalCreateTokens = groups.reduce((sum, g) => sum + g.create, 0);

  return {
    attributeWidth,
    objectWidth,
    brainWidth,
    groups,
    groupAssignments,
    totalTokens,
    totalCreateTokens,
    numGroups: observeGroupNames.length,
  };
}

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

  // Collect tokens for this output head
  const tokenSlices = [];

  if (groupMeta.modify) {
    // Slice observe tokens
    const observeSlice = new SliceTokens({
      start: groupMeta.observeOffset,
      size: groupMeta.limit,
      name: `${groupMeta.name}_${attr.name}_modify_slice`,
    }).apply(transformerOutput);
    tokenSlices.push(observeSlice);
  }

  if (groupMeta.create > 0) {
    // Slice create tokens
    const createSlice = new SliceTokens({
      start: groupMeta.createOffset,
      size: groupMeta.create,
      name: `${groupMeta.name}_${attr.name}_create_slice`,
    }).apply(transformerOutput);
    tokenSlices.push(createSlice);
  }

  let tokens;
  if (tokenSlices.length === 1) {
    tokens = tokenSlices[0];
  } else {
    tokens = tf.layers.concatenate({ axis: 1, name: `${groupMeta.name}_${attr.name}_cat` }).apply(tokenSlices);
  }

  // Output head: single dense layer
  if (attr.type === "space" || attr.type === "scalar") {
    return tf.layers.dense({
      units: 1,
      name: outputName,
      useBias: true,
    }).apply(tokens);
  } else {
    // label: output probabilities over options
    return tf.layers.dense({
      units: attr.options.length,
      activation: "softmax",
      name: outputName,
      useBias: true,
    }).apply(tokens);
  }
}

export function build(skill, config) {
  validate(skill, config);

  const meta = computeMetadata(skill, config);
  const { attributeWidth, objectWidth, brainWidth, groups, groupAssignments, totalTokens, totalCreateTokens, numGroups } = meta;

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

  // Build create tokens if needed
  let createTokensTensor = null;
  let batchRefTensor = mixedGroups[0]; // reference for batch size

  if (totalCreateTokens > 0) {
    createTokensTensor = new CreateTokens({
      numTokens: totalCreateTokens,
      objectWidth,
      name: "create_tokens",
    }).apply(batchRefTensor);
  }

  // Concatenate all tokens: observe groups + create tokens
  const tokenParts = [...mixedGroups];
  if (createTokensTensor) {
    tokenParts.push(createTokensTensor);
  }

  let allTokens;
  if (tokenParts.length === 1) {
    allTokens = tokenParts[0];
  } else {
    allTokens = tf.layers.concatenate({ axis: 1, name: "token_concat" }).apply(tokenParts);
  }

  // Apply group-level positional encoding
  allTokens = new GroupPositionalEncoding({
    objectWidth,
    groupAssignments,
    numGroups,
    name: "group_pe",
  }).apply(allTokens);

  // Stack transformer blocks using standard functional API layers
  for (let i = 0; i < config.brainLayers; i++) {
    allTokens = buildTransformerBlock(allTokens, i, objectWidth, brainWidth, config);
  }

  // Final layer norm
  allTokens = new FinalLayerNorm({
    width: objectWidth,
    name: "final_ln",
  }).apply(allTokens);

  // Build output heads
  const outputList = [];
  const outputNames = [];
  for (const group of groups) {
    if (!skill.act[group.name]) continue;

    for (const attr of group.actAttrs) {
      const outputName = `${group.name}_${attr.name}_out`;
      outputList.push(buildOutputHead(group, attr, objectWidth, allTokens));
      outputNames.push(outputName);
    }
  }

  // Build the tf.LayersModel
  const model = tf.model({
    inputs: allInputs,
    outputs: outputList,
    name: "brain",
  });

  // Build loss mapping
  const lossMap = {};
  for (const group of groups) {
    if (!skill.act[group.name]) continue;
    for (const attr of group.actAttrs) {
      const outputName = `${group.name}_${attr.name}_out`;
      lossMap[outputName] = (attr.type === "label") ? "categoricalCrossentropy" : "meanSquaredError";
    }
  }

  return { model, meta, lossMap, outputNames };
}
