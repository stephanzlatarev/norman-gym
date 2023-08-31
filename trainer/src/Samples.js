import fs from "fs";

const BATCH_SIZE = 10000;

export default class Samples {

  async init() {
    this.playbooks = [];

    const scripts = fs.readdirSync("./src/playbook/").filter(name => name.endsWith(".js"));

    for (const script of scripts) {
      const module = await import("./playbook/" + script);
      this.playbooks.push({
        name: script.substring(0, script.length - 3),
        sample: module.default,
      });
    }
  }

  batch() {
    return batch(...this.playbooks);
  }

  batches() {
    return this.playbooks.map(playbook => batch(playbook));
  }

}

function batch(...playbooks) {
  const countPerPlaybook = Math.ceil(BATCH_SIZE / playbooks.length);

  const source = [];
  const input = [];
  const output = [];

  for (const playbook of playbooks) {
    for (let i = 0; i < countPerPlaybook; i++) {
      const sample = playbook.sample();
      source.push(playbook.name);
      input.push(sample.input);
      output.push(sample.output);
    }
  }

  source.length = BATCH_SIZE;
  input.length = BATCH_SIZE;
  output.length = BATCH_SIZE;

  return {
    length: BATCH_SIZE,
    source: source,
    input: input,
    inputSize: input.length ? input[0].length : 0,
    output: output,
    outputSize: output.length ? output[0].length : 0,
  };
}
