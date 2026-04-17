import tf from "../tf.js";

// Performs the attention computation given pre-projected Q, K, V tensors.
// Config: { objectWidth, attentionHeads, attentionGroups, dropoutRate }
// Inputs: [Q, K, V] where:
//   Q: (batch, seq, attentionHeads * headDim)
//   K: (batch, seq, attentionGroups * headDim)
//   V: (batch, seq, attentionGroups * headDim)
// Output: (batch, seq, attentionHeads * headDim)
export default class GroupedQueryAttention extends tf.layers.Layer {
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

  static get className() { return "GroupedQueryAttention"; }
}
