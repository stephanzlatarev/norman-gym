import fs from "fs";

const BATCH_SIZE = 10000;
const COLORS = ["green", "blue", "orange", "red", "pink", "brown"];

export default class Samples {

  async init() {
    this.playbooks = [];

    const mapping = JSON.parse(fs.readFileSync("./src/playbook/mapping.json"));

    this.shape = shape(mapping);

    const meta = { skill: mapping.label, playbooks: {} };

    const colors = [...COLORS];
    const scripts = fs.readdirSync("./src/playbook/").filter(name => name.endsWith(".js"));

    for (const script of scripts) {
      const module = await import("./playbook/" + script);
      const name = script.substring(0, script.length - 3);

      meta.playbooks[name] = { color: colors.shift() };
      this.playbooks.push({
        name: name,
        sample: module.default,
      });
    }

    return meta;
  }

  batch() {
    return batch(...this.playbooks);
  }

  batches() {
    return this.playbooks.map(playbook => batch(playbook));
  }

}

function shape(mapping) {
  let input = 0;
  let output = 0;

  for (const info of mapping.when.infos) {
    input += info.length ? info.length : 1;
  }

  for (const info of mapping.then.infos) {
    output += info.length ? info.length : 1;
  }

  return [input, output];
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
