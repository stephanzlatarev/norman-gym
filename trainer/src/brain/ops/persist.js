import fs from "fs";
import Brain from "../Brain.js";

const STORE_FOLDER = process.cwd();

export async function saveBrainModel(brain, folder) {
  folder = folder || STORE_FOLDER;

  await brain.save("file://" + folder, { includeOptimizer: true });

  await brain.save({
    save: function(model) {
      model.weightData = Array.from(new Uint8Array(model.weightData));
      fs.writeFileSync(folder + "/brain.tf", JSON.stringify(model));
    }
  });
}

export async function loadBrainModel(skill, config, folder) {
  folder = folder || STORE_FOLDER;

  const modelPath = "file://" + folder + "/model.json";

  if (!fs.existsSync(folder + "/model.json")) {
    return null;
  }

  const brain = await Brain.load(modelPath, skill, config);

  return brain;
}
