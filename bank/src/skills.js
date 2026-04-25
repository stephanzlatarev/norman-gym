import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { spawnSync, execSync } from "child_process";
import YAML from "yaml";
import { collection, downloadFile, uploadFile } from "./db.js";

const REPO_FOLDER = "./repo";
const SKILL_FOLDER = "./skill";

const KIND_SKILL = "skill";
const FILE_SKILL = "skill.zip";

const downloaded = new Map();

class Skill {

  constructor(definition, playbooks) {
    Object.assign(this, definition);

    this.playbooks = playbooks;
  }

  createSamples(count) {
    const sources = Object.values(this.playbooks);
    const samples = [];

    while (samples.length < count) {
      for (let i = 0; i < sources.length && samples.length < count; i++) {
        samples.push(sources[i]());
      }
    }

    return samples;
  }

}

export async function readSkill(url) {
  const skills = await collection("skills");

  return skills.findOne({ skill: url });
}

export async function updateSkill(url, data) {
  const skills = await collection("skills");

  await skills.updateOne({ skill: url }, { $set: data }, { upsert: true });
}

export async function syncSkill(url) {
  const { folder, version } = cloneRepo(url);

  const skill = YAML.parse(fs.readFileSync(path.join(folder, "skill.yaml"), "utf8"));
  skill.version = version;
  skill.time = Date.now();

  const zipath = path.join(REPO_FOLDER, FILE_SKILL);
  execSync(`tar -a -cf "${zipath}" -C "${folder}" .`);

  await uploadFile(KIND_SKILL, url, FILE_SKILL, REPO_FOLDER, version);
  await updateSkill(url, skill);
}

export async function getSkill(url) {
  if (!downloaded.has(url)) {
    await downloadSkill(url);
  }

  return downloaded.get(url);
}

function cloneRepo(url) {
  const repo = url.split("/").slice(0, 5).join("/");
  const folder = REPO_FOLDER + "/" + url.split("/").slice(4).join("/");

  console.log(`Cloning skill ${url} from ${repo} into ${folder}`);

  fs.rmSync(REPO_FOLDER, { recursive: true, force: true });
  fs.mkdirSync(REPO_FOLDER, { recursive: true });

  const result = spawnSync("git", ["clone", repo], { cwd: REPO_FOLDER });
  for (const line of result.output) if (line) console.log(line.toString());
  console.log(result.stdout.toString());
  console.log(result.stderr.toString());
  if (result.status) throw new Error("Could not clone repo. Status: " + result.status);

  const version = spawnSync("git", ["rev-parse", "HEAD"], { cwd: folder }).stdout.toString().trim();

  return { folder, version };
}

async function downloadSkill(url) {
  fs.rmSync(SKILL_FOLDER, { recursive: true, force: true });
  fs.mkdirSync(SKILL_FOLDER, { recursive: true });

  const version = await downloadFile(KIND_SKILL, url, FILE_SKILL, SKILL_FOLDER);
  if (!version) return;

  execSync(`tar -xf "${path.join(SKILL_FOLDER, FILE_SKILL)}" -C "${SKILL_FOLDER}"`);

  const skill = YAML.parse(fs.readFileSync(path.join(SKILL_FOLDER, "skill.yaml"), "utf8"));

  skill.url = url;
  skill.version = version;

  const playbooks = {};

  for (const [name, script] of Object.entries(skill.playbooks)) {
    const modulePath = pathToFileURL(path.resolve(SKILL_FOLDER, script)).href;
    const mod = await import(modulePath);

    playbooks[name] = mod.default;
  }

  downloaded.set(url, new Skill(skill, playbooks));
}
