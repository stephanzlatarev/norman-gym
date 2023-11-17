
export function shape(brain) {
  const units = multiplier(brain.shape);
  const size = (units !== Math.floor(units)) ? Math.floor(units + 1) + "*" : units;

  return layers(brain.shape) + " x " + size;
}

function layers(shape) {
  return shape.split(":").length - 1;
}

function multiplier(shape) {
  const layers = shape.split(":");
  return Number(layers[1]) / Number(layers[0]);
}
