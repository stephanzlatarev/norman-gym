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

export function shapeToInfo(shape) {
  const units = shape.split(":");

  return {
    input: Number(units[0]),
    layers: units.length - 2,
    units: Number(units[1]),
    multi: Number(units[1]) / Number(units[0]),
    output: Number(units[units.length - 1]),
  };
}

export function infoToShape(info) {
  const layers = [];

  layers.push(info.input);
  for (let i = 0; i < info.layers; i++) {
    layers.push(info.units);
  }
  layers.push(info.output);

  return layers.join(":");
}

export async function bestShape(brain) {
  const list = await leaderboard();

  if (list.length > 1) {
    list.sort((a, b) => (a.record - b.record));

    const leader = shapeToInfo(list[0].shape);
    const input = leader.input;
    const output = leader.output;

    const infos = [];
    const minLayers = Math.max(leader.layers - 2, 1);
    const maxLayers = minLayers + 4;
    for (let layers = minLayers; layers <= maxLayers; layers++) {
      for (let multi = 1; multi < leader.multi + 5; multi++) {
        const units = input * multi;
        const parameters = input * units + units * units * Math.max(layers - 1, 0) + units * output;

        infos.push({
          input: input,
          layers: layers,
          units: units,
          multi: multi,
          output: output,
          parameters: parameters,
          leader: (layers === leader.layers) && (units === leader.units),
        });
      }
    }
    infos.sort((a, b) => (a.parameters - b.parameters));

    let leaderIndex;
    for (leaderIndex = 0; leaderIndex < infos.length; leaderIndex++) {
      if (infos[leaderIndex].leader) break;
    }

    const startIndex = Math.max(leaderIndex - Math.floor(list.length / 2 - 1), 0);
    const shapes = infos.slice(startIndex, startIndex + list.length).map(info => infoToShape(info));

    if (shapes.indexOf(brain.shape) >= 0) {
      // This brain is already in range. If it is the best ranking of all with the exact same shape then it must not change shape.
      for (const one of list) {
        if (one.shape === brain.shape) {
          if (one.brain === brain.name) return;
          break;
        }
      }
    }

    for (const shape of shapes) {
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
