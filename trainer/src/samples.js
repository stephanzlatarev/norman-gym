import fs from "fs";
import * as tf from "@tensorflow/tfjs-node";

const BATCH_SIZE = 10000;
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;

export default class Samples {

  constructor() {
    this.mode = "easy";
    this.stream = () => this;
  }

  async init() {
    this.playbooks = [];
    this.share = {};

    const scripts = fs.readdirSync("./src/playbook/").filter(name => name.endsWith(".js"));

    for (const script of scripts) {
      const module = await import("./playbook/" + script);
      this.playbooks.push({
        name: script.substring(0, script.length - 3),
        sample: module.default,
        share: 1 / scripts.length,
      });
    }

    for (const playbook of this.playbooks) {
      this.share[playbook.name] = 1 / this.playbooks.length;
    }
  }

  batch() {
    if ((this.mode === "hard") && this.hardSamples) return this.hardSamples;

    const source = [];
    const input = [];
    const output = [];

    for (const playbook of this.playbooks) {
      const count = BATCH_SIZE * (this.share ? this.share[playbook.name] : 1 / this.playbooks.length);

      for (let i = 0; i < count; i++) {
        const sample = playbook.sample();
        source.push(playbook.name);
        input.push(sample.input);
        output.push(sample.output);
      }
    }

    this.hardSamples = {
      length: input.length,
      source: source,
      input: input,
      inputSize: INPUT_SIZE,
      output: output,
      outputSize: OUTPUT_SIZE,
    };

    return this.hardSamples;
  }

  next() {
    const batch = this.batch();
    const input = tf.tensor(batch.input, [batch.length, batch.inputSize]);
    const output = tf.tensor(batch.output, [batch.length, batch.outputSize]);

    const now = new Date().getMinutes();
    const done = (this.time > 0) && (this.time !== now);
    this.time = now;

    return { value: { xs: input, ys: output }, done: done };
  }
}
