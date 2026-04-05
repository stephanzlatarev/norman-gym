import tf from "../tf.js";

// Takes raw values (batch, limit, 1) and produces sinusoidal encoding (batch, limit, attributeWidth).
// Config: { attributeWidth, min, max }
// Normalized to [0,1] using [min, max], then encoded with attributeWidth/2 sin+cos frequency bands.
export default class SinusoidalEncoding extends tf.layers.Layer {
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
