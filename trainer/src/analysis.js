
export function findBestSample(samples, predictions) {
  let bestError = Infinity;
  let bestIndex = -1;

  for (let i = 0; i < predictions.length; i++) {
    let error = 0;

    for (let j = 0; j < predictions[i].length; j++) {
      error += Math.abs(samples.output[i][j] - predictions[i][j]);
    }

    if (error < bestError) {
      bestError = error;
      bestIndex = i;
    }
  }

  return getSample(samples, predictions, bestIndex);
}

export function findRandomSample(samples, predictions) {
  return getSample(samples, predictions, Math.floor(samples.length * Math.random()));
}

export function findWorstSample(samples, predictions) {
  let worstError = -Infinity;
  let worstIndex = -1;
  let worstSpot = -1;

  for (let i = 0; i < predictions.length; i++) {
    let error = -Infinity;
    let spot = -1;

    for (let j = 0; j < predictions[i].length; j++) {
      const spotError = Math.abs(samples.output[i][j] - predictions[i][j]);

      if (spotError > error) {
        error = spotError;
        spot = j;
      }
    }

    if (error > worstError) {
      worstError = error;
      worstIndex = i;
      worstSpot = spot;
    }
  }

  return getSample(samples, predictions, worstIndex, worstSpot);
}

function getSample(samples, predictions, index, spot) {
  return {
    playbook: samples.source[index],
    input: samples.input[index],
    output: samples.output[index],
    prediction: predictions[index],
    spot: spot,
  };
}
