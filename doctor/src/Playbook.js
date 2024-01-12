import fs from "fs";
import { spawnSync } from "child_process";

const REPO_FOLDER = "./repo";
const DEFAULT_FIDELITY = 0.01;

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
      fidelity: mapping.fidelity ? mapping.fidelity : DEFAULT_FIDELITY,
    };

    const scripts = fs.readdirSync(this.folder + "/playbook/").filter(name => name.endsWith(".js"));

    for (const script of scripts) {
      const module = await import("." + this.folder + "/playbook/" + script);
      const name = script.substring(0, script.length - 3);

      this.playbooks.push({
        name: name,
        sample: module.default,
      });
    }
  }

  batch(size, playbook) {
    const input = [];
    const output = [];

    while ((input.length < size) || (output.length < size)) {
      const sample = playbook.sample();

      input.push(sample.input);
      output.push(sample.output);
    }

    input.length = size;
    output.length = size;

    return {
      length: size,
      input: input,
      inputSize: input.length ? input[0].length : 0,
      output: output,
      outputSize: output.length ? output[0].length : 0,
    };
  }

}
