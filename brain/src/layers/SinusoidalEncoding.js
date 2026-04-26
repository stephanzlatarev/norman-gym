import tf from "../tf.js";

// Takes raw values (batch, limit, numAxes) and produces sinusoidal encoding (batch, limit, attributeWidth).
// Config: { attributeWidth, numAxes, min, max }
// Normalized to [0,1] using [min, max], then encoded with frequency bands split across axes.
export default class SinusoidalEncoding extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.attributeWidth = config.attributeWidth;
    this.numAxes = config.numAxes || 1;
    this.min = config.min;
    this.max = config.max;
  }

  computeOutputShape(inputShape) {
    return [inputShape[0], inputShape[1], this.attributeWidth];
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      const rawValues = Array.isArray(inputs) ? inputs[0] : inputs;
      // rawValues shape: (batch, limit, numAxes)

      const range = this.max - this.min;
      const normalized = rawValues.sub(this.min).div(range); // (batch, limit, numAxes)

      const axisWidth = this.attributeWidth / this.numAxes;
      const halfAxisWidth = axisWidth / 2;
      const freqs = [];
      for (let i = 0; i < halfAxisWidth; i++) {
        freqs.push(Math.pow(10000, i / Math.max(halfAxisWidth - 1, 1)));
      }
      const freqTensor = tf.tensor1d(freqs); // (halfAxisWidth,)

      const parts = [];
      for (let a = 0; a < this.numAxes; a++) {
        const axisValues = normalized.slice([0, 0, a], [-1, -1, 1]); // (batch, limit, 1)
        const angles = axisValues.mul(freqTensor); // (batch, limit, halfAxisWidth)
        parts.push(angles.sin());
        parts.push(angles.cos());
      }

      return tf.concat(parts, -1); // (batch, limit, attributeWidth)
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.attributeWidth = this.attributeWidth;
    config.numAxes = this.numAxes;
    config.min = this.min;
    config.max = this.max;
    return config;
  }

  static get className() { return "SinusoidalEncoding"; }
}
