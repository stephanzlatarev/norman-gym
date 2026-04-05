import tf from "../tf.js";

// Outputs learned embeddings for create objects, broadcasting over the batch dimension.
// Config: { numObjects, objectWidth }
// Output: (batch, numObjects, objectWidth)
export default class CreateObjects extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.numObjects = config.numObjects;
    this.objectWidth = config.objectWidth;
  }

  build(inputShape) {
    this.objects = this.addWeight(
      "create_objects",
      [this.numObjects, this.objectWidth],
      "float32",
      tf.initializers.glorotUniform({})
    );
    this.built = true;
  }

  computeOutputShape(inputShape) {
    return [inputShape[0], this.numObjects, this.objectWidth];
  }

  call(inputs, kwargs) {
    return tf.tidy(() => {
      // inputs is a dummy tensor used only to derive batch size
      const x = Array.isArray(inputs) ? inputs[0] : inputs;
      const batchSize = x.shape[0] || tf.shape(x).arraySync()[0];
      const objectValues = this.objects.read(); // (numObjects, objectWidth)
      return objectValues.expandDims(0).tile([batchSize, 1, 1]);
    });
  }

  getConfig() {
    const config = super.getConfig();
    config.numObjects = this.numObjects;
    config.objectWidth = this.objectWidth;
    return config;
  }

  static get className() { return "CreateObjects"; }
}
