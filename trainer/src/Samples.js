import fs from "fs";

const BATCH_SIZE = 10000;
const INPUT_SIZE = 400;
const OUTPUT_SIZE = 100;

export default class Samples {

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

    return {
      length: input.length,
      source: source,
      input: input,
      inputSize: INPUT_SIZE,
      output: output,
      outputSize: OUTPUT_SIZE,
    };
  }

}
