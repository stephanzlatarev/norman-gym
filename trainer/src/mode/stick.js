
export default class Mode {

  constructor(samples) {
    this.name = "stick";
    this.samples = samples;
    this.studyBatch = samples.batch();
  }

  batch() {
    return this.studyBatch;
  }

  onEpochEnd(_, studyLoss) {
    if (studyLoss < 0.00001) {
      this.studyBatch = this.samples.batch();
    }
  }

}
