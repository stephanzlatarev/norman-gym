import fs from "fs";
import tf from "../tf.js";

const STORE_FOLDER = process.cwd();

export async function saveModel(model, folder) {
  folder = folder || STORE_FOLDER;

  await model.save("file://" + folder, { includeOptimizer: true });

  await model.save({
    save: function(record) {
      record.weightData = Array.from(new Uint8Array(record.weightData));
      fs.writeFileSync(folder + "/brain.tf", JSON.stringify(record));
    }
  });
}

export async function loadModel(folder) {
  folder = folder || STORE_FOLDER;

  const modelPath = "file://" + folder + "/model.json";

  if (!fs.existsSync(folder + "/model.json")) {
    return null;
  }

  return await tf.loadLayersModel(modelPath);
}
