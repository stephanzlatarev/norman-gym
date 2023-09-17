import fs from "fs";
import { skillToShape } from "./shape.js";

const BATCH_SIZE = 10000;
const COLORS = ["green", "blue", "orange", "red", "pink", "brown"];

export default class Playbook {

  constructor(skill) {
    this.skill = skill;
    this.folder = "./repo/" + skill.split("/").slice(5).join("/");
  }

  async load() {
    const mapping = JSON.parse(fs.readFileSync(this.folder + "/mapping.json"));

    this.playbooks = [];
    this.meta = {
      skill: this.skill,
      shape: skillToShape(mapping),
      playbooks: {},
    };

    const colors = [...COLORS];
    const scripts = fs.readdirSync(this.folder + "/playbook/").filter(name => name.endsWith(".js"));

    for (const script of scripts) {
      const module = await import("." + this.folder + "/playbook/" + script);
      const name = script.substring(0, script.length - 3);

      this.meta.playbooks[name] = { color: colors.shift() };
      this.playbooks.push({
        name: name,
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
