import tf from "../tf.js";

// Outputs learned embeddings for create tokens, broadcasting over the batch dimension.
// Config: { numTokens, objectWidth }
// Output: (batch, numTokens, objectWidth)
export default class CreateTokens extends tf.layers.Layer {
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
