import tf from "./tf.js";

// --- SinusoidalEncoding layer ---
// Takes raw values (batch, limit, 1) and produces sinusoidal encoding (batch, limit, attributeWidth).
// Config: { attributeWidth, min, max }
// Normalized to [0,1] using [min, max], then encoded with attributeWidth/2 sin+cos frequency bands.
class SinusoidalEncoding extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.attributeWidth = config.attributeWidth;
    this.min = config.min;
    this.max = config.max;
  }

  computeOutputShape(inputShape) {
    return [inputShape[0], inputShape[1], this.attributeWidth];
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const rawValues = Array.isArray(inputs) ? inputs[0] : inputs;
      // rawValues shape: (batch, limit, 1)

      const range = this.max - this.min;
      const normalized = rawValues.sub(this.min).div(range); // (batch, limit, 1)

      const halfWidth = this.attributeWidth / 2;
      const freqs = [];
      for (let i = 0; i < halfWidth; i++) {
        freqs.push(Math.pow(10000, i / Math.max(halfWidth - 1, 1)));
      }
      const freqTensor = tf.tensor1d(freqs); // (halfWidth,)

      const angles = normalized.mul(freqTensor); // (batch, limit, halfWidth)
      const sinPart = angles.sin();
      const cosPart = angles.cos();
      return tf.concat([sinPart, cosPart], -1); // (batch, limit, attributeWidth)
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.attributeWidth = this.attributeWidth;
    config.min = this.min;
    config.max = this.max;
    return config;
  }

  static get className() { return "SinusoidalEncoding"; }
}
tf.serialization.registerClass(SinusoidalEncoding);

// --- GroupPositionalEncoding layer ---
// Adds a fixed sinusoidal encoding based on group index to each token.
// Input: (batch, totalTokens, objectWidth)
// Config: { objectWidth, groupAssignments: [groupIndex for each token position], numGroups }
class GroupPositionalEncoding extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.objectWidth = config.objectWidth;
    this.groupAssignments = config.groupAssignments;
    this.numGroups = config.numGroups;
  }

  computeOutputShape(inputShape) {
    return inputShape;
  }

  build(inputShape) {
    // Precompute the encoding table: (totalTokens, objectWidth)
    const totalTokens = this.groupAssignments.length;
    const halfWidth = this.objectWidth / 2;
    const freqs = [];
    for (let i = 0; i < halfWidth; i++) {
      freqs.push(Math.pow(10000, i / Math.max(halfWidth - 1, 1)));
    }

    const data = new Float32Array(totalTokens * this.objectWidth);
    for (let t = 0; t < totalTokens; t++) {
      const normalized = this.numGroups > 1 ? this.groupAssignments[t] / (this.numGroups - 1) : 0;
      for (let i = 0; i < halfWidth; i++) {
        const angle = normalized * freqs[i];
        data[t * this.objectWidth + i] = Math.sin(angle);
        data[t * this.objectWidth + halfWidth + i] = Math.cos(angle);
      }
    }

    this.encodingTable = tf.tensor2d(data, [totalTokens, this.objectWidth]);
    this.built = true;
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const x = Array.isArray(inputs) ? inputs[0] : inputs;
      return x.add(this.encodingTable);
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.objectWidth = this.objectWidth;
    config.groupAssignments = this.groupAssignments;
    config.numGroups = this.numGroups;
    return config;
  }

  static get className() { return "GroupPositionalEncoding"; }
}
tf.serialization.registerClass(GroupPositionalEncoding);

// --- CreateTokens layer ---
// Outputs learned embeddings for create tokens, broadcasting over the batch dimension.
// Config: { numTokens, objectWidth }
// Output: (batch, numTokens, objectWidth)
class CreateTokens extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.numTokens = config.numTokens;
    this.objectWidth = config.objectWidth;
  }

  build(inputShape) {
    this.tokens = this.addWeight(
      "create_tokens",
      [this.numTokens, this.objectWidth],
      "float32",
      tf.initializers.glorotUniform({})
    );
    this.built = true;
  }

  computeOutputShape(inputShape) {
    return [inputShape[0], this.numTokens, this.objectWidth];
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      // inputs is a dummy tensor used only to derive batch size
      const x = Array.isArray(inputs) ? inputs[0] : inputs;
      const batchSize = x.shape[0] || tf.shape(x).arraySync()[0];
      const tokenValues = this.tokens.read(); // (numTokens, objectWidth)
      return tokenValues.expandDims(0).tile([batchSize, 1, 1]);
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.numTokens = this.numTokens;
    config.objectWidth = this.objectWidth;
    return config;
  }

  static get className() { return "CreateTokens"; }
}
tf.serialization.registerClass(CreateTokens);

// --- SliceTokens layer ---
// Slices a range of tokens from the sequence dimension.
// Config: { start, size }
// Input: (batch, totalTokens, width) -> Output: (batch, size, width)
class SliceTokens extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.start = config.start;
    this.size = config.size;
  }

  computeOutputShape(inputShape) {
    return [inputShape[0], this.size, inputShape[2]];
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const x = Array.isArray(inputs) ? inputs[0] : inputs;
      const batch = x.shape[0];
      const width = x.shape[2];
      return x.slice([0, this.start, 0], [batch, this.size, width]);
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.start = this.start;
    config.size = this.size;
    return config;
  }

  static get className() { return "SliceTokens"; }
}
tf.serialization.registerClass(SliceTokens);

// --- GQAAttention layer ---
// Performs the attention computation given pre-projected Q, K, V tensors.
// Config: { objectWidth, attentionHeads, attentionGroups, dropoutRate }
// Inputs: [Q, K, V] where:
//   Q: (batch, seq, attentionHeads * headDim)
//   K: (batch, seq, attentionGroups * headDim)
//   V: (batch, seq, attentionGroups * headDim)
// Output: (batch, seq, attentionHeads * headDim)
class GQAAttention extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.objectWidth = config.objectWidth;
    this.attentionHeads = config.attentionHeads;
    this.attentionGroups = config.attentionGroups;
    this.dropoutRate = config.dropoutRate || 0;
    this.headDim = this.objectWidth / this.attentionHeads;
    this.headsPerGroup = this.attentionHeads / this.attentionGroups;
  }

  computeOutputShape(inputShape) {
    // inputShape is an array of shapes: [Q_shape, K_shape, V_shape]
    return inputShape[0];
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const [rawQ, rawK, rawV] = inputs;
      const training = kwargs && kwargs.training;
      const [batch, seq] = rawQ.shape;

      let Q = rawQ.reshape([batch, seq, this.attentionHeads, this.headDim]).transpose([0, 2, 1, 3]);
      let K = rawK.reshape([batch, seq, this.attentionGroups, this.headDim]).transpose([0, 2, 1, 3]);
      let V = rawV.reshape([batch, seq, this.attentionGroups, this.headDim]).transpose([0, 2, 1, 3]);

      if (this.headsPerGroup > 1) {
        K = K.tile([1, this.headsPerGroup, 1, 1]);
        V = V.tile([1, this.headsPerGroup, 1, 1]);
      }

      const scale = Math.sqrt(this.headDim);
      let scores = Q.matMul(K.transpose([0, 1, 3, 2])).div(scale);
      let weights = scores.softmax(-1);

      if (training && this.dropoutRate > 0) {
        weights = tf.dropout(weights, this.dropoutRate);
      }

      let output = weights.matMul(V);
      output = output.transpose([0, 2, 1, 3]).reshape([batch, seq, this.attentionHeads * this.headDim]);

      return output;
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.objectWidth = this.objectWidth;
    config.attentionHeads = this.attentionHeads;
    config.attentionGroups = this.attentionGroups;
    config.dropoutRate = this.dropoutRate;
    return config;
  }

  static get className() { return "GQAAttention"; }
}
tf.serialization.registerClass(GQAAttention);

// --- FinalLayerNorm layer ---
// Simple layer norm as a custom layer for the final normalization.
// Config: { width }
class FinalLayerNorm extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.width = config.width;
  }

  build(inputShape) {
    this.gamma = this.addWeight("gamma", [this.width], "float32", tf.initializers.ones());
    this.beta = this.addWeight("beta", [this.width], "float32", tf.initializers.zeros());
    this.built = true;
  }

  computeOutputShape(inputShape) {
    return inputShape;
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const x = Array.isArray(inputs) ? inputs[0] : inputs;
      const mean = x.mean(-1, true);
      const variance = x.sub(mean).square().mean(-1, true);
      const normalized = x.sub(mean).div(variance.add(1e-5).sqrt());
      return normalized.mul(this.gamma.read()).add(this.beta.read());
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.width = this.width;
    return config;
  }

  static get className() { return "FinalLayerNorm"; }
}
tf.serialization.registerClass(FinalLayerNorm);

export {
  SinusoidalEncoding,
  GroupPositionalEncoding,
  CreateTokens,
  SliceTokens,
  GQAAttention,
  FinalLayerNorm,
};
