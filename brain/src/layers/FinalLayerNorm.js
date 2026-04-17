import tf from "../tf.js";

// Simple layer norm as a custom layer for the final normalization.
// Config: { width }
export default class FinalLayerNorm extends tf.layers.Layer {
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
