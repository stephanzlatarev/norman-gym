import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { spawnSync } from "child_process";
import YAML from "yaml";

const REPO_FOLDER = "./repo";

export default async function loadSkill(url) {
  const repo = url.split("/").slice(0, 5).join("/");
  const folder = REPO_FOLDER + "/" + url.split("/").slice(4).join("/");

  console.log(`Loading ${url} from ${repo} into ${folder}`);

  fs.rmSync(REPO_FOLDER, { recursive: true, force: true });
  fs.mkdirSync(REPO_FOLDER);

  const result = spawnSync("git", ["clone", repo], { cwd: REPO_FOLDER });
  for (const line of result.output) if (line) console.log(line.toString());
  console.log(result.stdout.toString());
  console.log(result.stderr.toString());
  if (result.status) throw new Error("Could not clone repo. Status: " + result.status);

  const skill = YAML.parse(fs.readFileSync(path.join(folder, "skill.yaml"), "utf8"));

  skill.url = url;

  for (const [name, script] of Object.entries(skill.playbooks)) {
    const modulePath = pathToFileURL(path.resolve(folder, script)).href;
    const mod = await import(modulePath);

    skill.playbooks[name] = mod.default;
  }

  return skill;
}