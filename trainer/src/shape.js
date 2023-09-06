import { leaderboard } from "./mongo.js";

const LIMIT_PARAMETERS = 4000000;

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
    for (let layers = 1; layers <= leader.layers + 2; layers++) {
      for (let multi = 1; multi < leader.multi + 5; multi++) {
        const units = input * multi;
        const parameters = input * units + units * units * Math.max(layers - 1, 0) + units * layers + units * output + output;

        if (parameters > LIMIT_PARAMETERS) continue;

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

    const endIndex = Math.min(infos.length, leaderIndex + Math.floor(list.length / 2) + 1);
    const startIndex = Math.max(0, endIndex - list.length);
    const shapes = infos.slice(startIndex, endIndex).map(info => infoToShape(info));

    if (!shouldChangeShape(list, shapes, brain.name, brain.shape)) return;

    const freeShapes = shapes.filter(shape => (list.findIndex(one => (one.shape === shape)) < 0));
    const challengers = list.filter(one => shouldChangeShape(list, shapes, one.brain, one.shape)).sort((a, b) => a.brain.localeCompare(b.brain));
    const peckingOrder = challengers.findIndex(one => (one.brain === brain.name));

    if (freeShapes[peckingOrder]) {
      return freeShapes[peckingOrder];
    }

    console.log("No best shape at", peckingOrder, "in", JSON.stringify(freeShapes), "among challengers", JSON.stringify(challengers));
  }
}

function shouldChangeShape(brains, shapes, name, shape) {
  if (shapes.indexOf(shape) < 0) return true;

  for (const one of brains) {
    if (one.shape === shape) {
      return (one.brain !== name);
    }
  }

  return true;
}
