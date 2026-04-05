import tf from "../tf.js";

// Slices a range of tokens from the sequence dimension.
// Config: { start, size }
// Input: (batch, totalTokens, width) -> Output: (batch, size, width)
export default class SliceTokens extends tf.layers.Layer {
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
