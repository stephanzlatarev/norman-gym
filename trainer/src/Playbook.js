import fs from "fs";
import { spawnSync } from "child_process";
import { skillToShape } from "./shape.js";

const REPO_FOLDER = "./repo";
const BATCH_SIZE = 10000;
const COLORS = ["green", "blue", "orange", "red", "pink", "brown"];

export default class Playbook {

  constructor(skill) {
    this.skill = skill;
    this.repo = skill.split("/").slice(0, 5).join("/");
    this.folder = REPO_FOLDER + "/" + skill.split("/").slice(4).join("/");
  }

  async load() {
    fs.rmSync(REPO_FOLDER, { recursive: true, force: true });
    fs.mkdirSync(REPO_FOLDER);

    const result = spawnSync("git", ["clone", this.repo], { cwd: REPO_FOLDER });
    for (const line of result.output) if (line) console.log(line.toString());
    console.log(result.stdout.toString());
    console.log(result.stderr.toString());
    if (result.status) throw new Error("Could not clone repo. Status: " + result.status);

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