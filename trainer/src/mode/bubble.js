
export default class Mode {

  constructor(samples, brain) {
    this.name = "bubble";
    this.samples = samples;
    this.brain = brain;

    this.bestBrain = this.brain.checkpoint();
    this.bestLoss = Infinity;
    this.bestBatch = null;
  }

  batch() {
    if (this.studyBatch && (this.studyBatch === this.bestBatch)) {
      // Start new epoch with the best batch from last epoch
      // Clear best batch to find which the best batch in this epoch is
      this.bestBatch = null;
    } else {
      this.studyBatch = this.samples.batch();
    }

    return this.studyBatch;
  }

  async onBatchEnd(controlLoss) {
    if (controlLoss < this.bestLoss) {
      this.bestLoss = controlLoss;
      this.bestBatch = this.studyBatch;
      this.bestBrain = await this.brain.checkpoint();
    }
  }

  async onEpochEnd() {
    if (this.bestLoss < Infinity) {
      await this.brain.restore(this.bestBrain);

      this.studyBatch = this.bestBatch;
    }

    this.bestLoss = Infinity;
  }

}
