
export default class Mode {

  constructor(samples) {
    this.name = "dive";
    this.samples = samples;
    this.studyBatch = samples.batch();
  }

  batch() {
    return this.studyBatch;
  }

  onEpochEnd(controlLoss, studyLoss) {
    if (studyLoss + studyLoss < controlLoss) {
      this.studyBatch = this.samples.batch();
    }
  }

}
