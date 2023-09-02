import { leaderboard } from "./mongo.js";

export function skillToShape(mapping) {
  let input = 0;
  let output = 0;

  for (const info of mapping.when.infos) {
    input += info.length ? info.length : 1;
  }

  for (const info of mapping.then.infos) {
    output += info.length ? info.length : 1;
  }

  return input + ":" + input + ":" + output;
}

export function modelToShape(model) {
  return model.inputLayers[0].batchInputShape.concat(model.layers.map(layer => layer.units)).filter(units => !!units).join(":");
}

export async function bestShape(brain) {
  const list = await leaderboard();

  if (list.length > 1) {
    list.sort((a, b) => (a.record - b.record));

    const brainShape = brain.shape.split(":");
    const leaderShape = list[0].shape.split(":");
    const input = Number(leaderShape[0]);
    const hidden = Number(leaderShape[1]);
    const output = Number(leaderShape[2]);
    const minHidden = Math.max(hidden - input * Math.floor(list.length / 2 - 1), input);
    const maxHidden = minHidden + input * (list.length - 1);

    if ((minHidden <= brainShape[1]) && (brainShape[1] <= maxHidden)) {
      // This brain is already in range. If it is the best ranking of all with the exact same shape then it must not change shape.
      for (const one of list) {
        if (one.shape === brain.shape) {
          if (one.brain === brain.name) return;
          break;
        }
      }
    }

    for (let h = minHidden; h <= maxHidden; h += input) {
      const shape = [input, h, output].join(":");

      let exists = false;
      for (const one of list) {
        if (one.shape === shape) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        return shape;
      }
    }
  }
}
