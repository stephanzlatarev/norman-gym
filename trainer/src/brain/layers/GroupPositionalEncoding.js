import tf from "../tf.js";

// Adds a fixed sinusoidal encoding based on group index to each object.
// Input: (batch, totalObjects, objectWidth)
// Config: { objectWidth, groupAssignments: [groupIndex for each object position], numGroups }
export default class GroupPositionalEncoding extends tf.layers.Layer {
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
    // Precompute the encoding table: (totalObjects, objectWidth)
    const totalObjects = this.groupAssignments.length;
    const halfWidth = this.objectWidth / 2;
    const freqs = [];
    for (let i = 0; i < halfWidth; i++) {
      freqs.push(Math.pow(10000, i / Math.max(halfWidth - 1, 1)));
    }

    const data = new Float32Array(totalObjects * this.objectWidth);
    for (let t = 0; t < totalObjects; t++) {
      const normalized = this.numGroups > 1 ? this.groupAssignments[t] / (this.numGroups - 1) : 0;
      for (let i = 0; i < halfWidth; i++) {
        const angle = normalized * freqs[i];
        data[t * this.objectWidth + i] = Math.sin(angle);
        data[t * this.objectWidth + halfWidth + i] = Math.cos(angle);
      }
    }

    this.encodingTable = tf.tensor2d(data, [totalObjects, this.objectWidth]);
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
