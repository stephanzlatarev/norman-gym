
export default class Mode {

  constructor(samples) {
    this.name = "flow";
    this.samples = samples;
  }

  batch() {
    return this.samples.batch();
  }

}
