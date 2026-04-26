import tf from "../tf.js";

// Performs the attention computation given pre-projected Q, K, V tensors.
// Config: { objectWidth, attentionHeads, attentionGroups, dropoutRate, spatialAxes }
// Inputs: [Q, K, V, mask] or [Q, K, V, mask, coords]
//   Q: (batch, seq, attentionHeads * headDim)
//   K: (batch, seq, attentionGroups * headDim)
//   V: (batch, seq, attentionGroups * headDim)
//   mask: (batch, seq) — 1.0 for real objects, 0.0 for padding
//   coords (optional): (batch, seq, spatialAxes) — raw spatial coordinates for RoPE
// Output: (batch, seq, attentionHeads * headDim)
export default class GroupedQueryAttention extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.objectWidth = config.objectWidth;
    this.attentionHeads = config.attentionHeads;
    this.attentionGroups = config.attentionGroups;
    this.dropoutRate = config.dropoutRate || 0;
    this.spatialAxes = config.spatialAxes || 0;
    this.headDim = this.objectWidth / this.attentionHeads;
    this.headsPerGroup = this.attentionHeads / this.attentionGroups;
  }

  computeOutputShape(inputShape) {
    // inputShape is an array of shapes: [Q_shape, K_shape, V_shape, mask_shape, ...]
    return inputShape[0];
  }

  build(inputShape) {
    // Precompute RoPE frequencies if spatial axes are present
    if (this.spatialAxes > 0) {
      const axisDim = this.headDim / this.spatialAxes;
      const numPairs = axisDim / 2;
      const freqValues = new Float32Array(numPairs);
      for (let i = 0; i < numPairs; i++) {
        freqValues[i] = 1.0 / Math.pow(10000, (2 * i) / axisDim);
      }
      this.ropeFreqs = tf.tensor1d(freqValues); // (numPairs,)
    }
    this.built = true;
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const [rawQ, rawK, rawV, mask] = inputs;
      const coords = inputs.length > 4 ? inputs[4] : null;
      const training = kwargs && kwargs.training;
      const [batch, seq] = rawQ.shape;

      let Q = rawQ.reshape([batch, seq, this.attentionHeads, this.headDim]).transpose([0, 2, 1, 3]);
      let K = rawK.reshape([batch, seq, this.attentionGroups, this.headDim]).transpose([0, 2, 1, 3]);
      let V = rawV.reshape([batch, seq, this.attentionGroups, this.headDim]).transpose([0, 2, 1, 3]);

      // Apply RoPE if spatial coordinates are provided
      if (coords && this.spatialAxes > 0) {
        Q = this.applyRoPE(Q, coords, this.attentionHeads);
        K = this.applyRoPE(K, coords, this.attentionGroups);
      }

      if (this.headsPerGroup > 1) {
        K = K.tile([1, this.headsPerGroup, 1, 1]);
        V = V.tile([1, this.headsPerGroup, 1, 1]);
      }

      const scale = Math.sqrt(this.headDim);
      let scores = Q.matMul(K.transpose([0, 1, 3, 2])).div(scale);

      // Apply padding mask: set padding key positions to -Infinity so softmax gives them zero weight
      // mask shape: (batch, seq) → (batch, 1, 1, seq) to broadcast over (batch, heads, querySeq, keySeq)
      const maskBias = tf.scalar(1).sub(mask).mul(-1e9); // 0 for real, -1e9 for padding
      scores = scores.add(maskBias.reshape([batch, 1, 1, seq]));

      let weights = scores.softmax(-1);

      if (training && this.dropoutRate > 0) {
        weights = tf.dropout(weights, this.dropoutRate);
      }

      let output = weights.matMul(V);
      output = output.transpose([0, 2, 1, 3]).reshape([batch, seq, this.attentionHeads * this.headDim]);

      return output;
    });
  }

  // Apply multi-axis Rotary Positional Embeddings.
  // tensor: (batch, numHeads, seq, headDim)
  // coords: (batch, seq, spatialAxes) — raw coordinate values
  applyRoPE(tensor, coords, numHeads) {
    const [batch, , seq] = tensor.shape;
    const halfDim = this.headDim / 2;
    const axisDim = this.headDim / this.spatialAxes;
    const numPairs = axisDim / 2;

    // Build angle tensor: (batch, seq, halfDim)
    const angleParts = [];
    for (let a = 0; a < this.spatialAxes; a++) {
      const axisCoords = coords.slice([0, 0, a], [-1, -1, 1]); // (batch, seq, 1)
      const angles = axisCoords.mul(this.ropeFreqs); // (batch, seq, numPairs)
      angleParts.push(angles);
    }
    const allAngles = tf.concat(angleParts, -1); // (batch, seq, halfDim)

    const cosAngles = allAngles.cos().expandDims(1); // (batch, 1, seq, halfDim)
    const sinAngles = allAngles.sin().expandDims(1); // (batch, 1, seq, halfDim)

    // Split tensor into even/odd pairs
    const pairs = tensor.reshape([batch, numHeads, seq, halfDim, 2]);
    const even = pairs.slice([0, 0, 0, 0, 0], [-1, -1, -1, -1, 1]).squeeze([-1]); // (batch, heads, seq, halfDim)
    const odd = pairs.slice([0, 0, 0, 0, 1], [-1, -1, -1, -1, 1]).squeeze([-1]);

    // Apply rotation
    const rotEven = even.mul(cosAngles).sub(odd.mul(sinAngles));
    const rotOdd = even.mul(sinAngles).add(odd.mul(cosAngles));

    // Interleave back: stack on last axis then reshape
    return tf.stack([rotEven, rotOdd], -1).reshape([batch, numHeads, seq, this.headDim]);
  }

  getConfig() {
    const config = super.getConfig();
    config.objectWidth = this.objectWidth;
    config.attentionHeads = this.attentionHeads;
    config.attentionGroups = this.attentionGroups;
    config.dropoutRate = this.dropoutRate;
    config.spatialAxes = this.spatialAxes;
    return config;
  }

  static get className() { return "GroupedQueryAttention"; }
}
