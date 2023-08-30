
function compare(samples, predictions) {
  const result = {};

  for (let i = 0; i < predictions.length; i++) {
    const playbook = samples.source[i];

    let error = 0;
    for (let j = 0; j < predictions[i].length; j++) {
      error = Math.max(error, Math.abs(samples.output[i][j] - predictions[i][j]));
    }

    let stats = result[playbook];
    if (!stats) {
      stats = { share: 0, error: 0, errorMax: -Infinity, errorMin: Infinity, pass: 0, fail: 0, count: 0 };
      result[playbook] = stats;
    }

    stats.count++;
    stats.error += error;
    stats.errorMax = Math.max(stats.errorMax, error);
    stats.errorMin = Math.min(stats.errorMin, error);

    if (error < 0.01) {
      stats.pass++;
    } else if (error > 0.99) {
      stats.fail++;
    }
  }

  for (const playbook in result) {
    const stats = result[playbook];
    stats.pass /= stats.count;
    stats.error /= stats.count;
    stats.share = stats.count / predictions.length;
  }

  return result;
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

  return {
    playbook: samples.source[worstIndex],
    input: samples.input[worstIndex],
    output: samples.output[worstIndex],
    prediction: predictions[worstIndex],
    spot: worstSpot,
  };
}

function findOppositeSample(sample, samples, predictions) {
  const spot = sample.spot;
  const sampleExpectated = sample.output[spot];
  const samplePredicted = sample.prediction[spot];

  let worstError = -Infinity;
  let worstIndex = -1;

  for (let i = 0; i < predictions.length; i++) {
    const thisExpected = samples.output[i][spot];
    const thisPredicted = predictions[i][spot];

    if ((samplePredicted < sampleExpectated) && (samplePredicted < thisExpected)) continue;
    if ((samplePredicted > sampleExpectated) && (samplePredicted > thisExpected)) continue;

    if ((thisPredicted < sampleExpectated) && (thisPredicted < thisExpected)) continue;
    if ((thisPredicted > sampleExpectated) && (thisPredicted > thisExpected)) continue;

    const error = Math.abs(thisExpected - thisPredicted);

    if (error > worstError) {
      worstError = error;
      worstIndex = i;
    }
  }

  return {
    playbook: samples.source[worstIndex],
    input: samples.input[worstIndex],
    output: samples.output[worstIndex],
    prediction: predictions[worstIndex],
    spot: spot,
  };
}

function overall(stats, field) {
  let error = 0;

  for (const playbook in stats) {
    error += stats[playbook][field] * stats[playbook].share;
  }

  return error;
}
