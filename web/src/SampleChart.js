import React from "react";

export default class SampleChart extends React.Component {

  render() {
    const sample = this.props.sample;
    const objects = [];

    const chartType = (sample.input.length > 200);

    const offsetHeadOpen = chartType ? 7 + 24 : -1;
    const offsetHeadHigh = chartType ? 7 + 24 + 24 : 0;
    const offsetHeadLow = chartType ? 7 + 24 + 24 + 24 : 24;
    const offsetHeadClose = chartType ? 7 + 24 + 24 + 24 + 24 : -1;
    const offsetTailHigh = 0;
    const offsetTailLow = 24;

    const anchor = sample.input[offsetHeadClose + 24 - 1];
    let diffY = 0;
    for (let i = 0; i < 24; i++) {
      diffY = Math.max(diffY,
        Math.abs(sample.input[offsetHeadHigh + i] + 0.01 - anchor),
        Math.abs(sample.input[offsetHeadLow + i] - 0.01 - anchor),
        Math.abs(sample.output[offsetTailHigh + i] + 0.01 - anchor),
        Math.abs(sample.output[offsetTailLow + i] - 0.01 - anchor),
      );
    }

    const midX = 50;
    const stepX = 50 / 24;
    const midY = 50;
    const stepY = 50 / diffY;

    const head = [];
    for (let i = 0; i < 24; i++) {
      const openCloseY = midY + ((sample.input[offsetHeadHigh + i] + sample.input[offsetHeadLow + i]) / 2 - 1) * stepY;

      if (offsetHeadOpen >= 0) {
        head.push((i * stepX) + " " + (midY + (sample.input[offsetHeadOpen + i] - 1) * stepY));
      } else {
        head.push((i * stepX) + " " + openCloseY);
      }

      head.push((i * stepX) + " " + (midY + (sample.input[offsetHeadHigh + i] - 1) * stepY));
      head.push((i * stepX) + " " + (midY + (sample.input[offsetHeadLow + i] - 1) * stepY));

      if (offsetHeadClose >= 0) {
        head.push((i * stepX) + " " + (midY + (sample.input[offsetHeadClose + i] - 1) * stepY));
      } else {
        head.push((i * stepX) + " " + openCloseY);
      }
    }
    objects.push(<path key="head" d={ "M " + head.join(" L ") } stroke="black" strokeWidth="0.5" fill="none" />);

    const tail = [];
    const passHigh = [];
    const passLow = [];
    for (let i = 0; i < 24; i++) {
      const average = (sample.output[offsetTailHigh + i] + sample.output[offsetTailLow + i]) / 2;
      tail.push((midX + i * stepX) + " " + (midY + ((average - 1) * stepY)));
      tail.push((midX + i * stepX) + " " + (midY + (sample.output[offsetTailHigh + i] - 1) * stepY));
      tail.push((midX + i * stepX) + " " + (midY + (sample.output[offsetTailLow + i] - 1) * stepY));
      tail.push((midX + i * stepX) + " " + (midY + ((average - 1) * stepY)));
      passHigh.push((midX + i * stepX) + " " + (midY + ((sample.output[offsetTailHigh + i] - 1) + 0.01) * stepY));
      passLow.push((midX + i * stepX) + " " + (midY + ((sample.output[offsetTailLow + i] - 1) - 0.01) * stepY));
    }
    objects.push(<path key="tail" d={ "M " + tail.join(" L ") } stroke="black" strokeWidth="0.5" fill="none" />);
    objects.push(<path key="pass-high" d={ "M " + passHigh.join(" L ") } stroke="gray" strokeWidth="0.5" fill="none" />);
    objects.push(<path key="pass-low" d={ "M " + passLow.join(" L ") } stroke="gray" strokeWidth="0.5" fill="none" />);

    const predictionHigh = [];
    const predictionLow = [];
    for (let i = 0; i < 24; i++) {
      predictionHigh.push((midX + i * stepX) + " " + (midY + (sample.prediction[offsetTailHigh + i] - 1) * stepY));
      predictionLow.push((midX + i * stepX) + " " + (midY + (sample.prediction[offsetTailLow + i] - 1) * stepY));
    }
    objects.push(<path key="high" d={ "M 50 50 L " + predictionHigh.join(" L ") } stroke="blue" strokeWidth="0.5" fill="none" />);
    objects.push(<path key="low" d={ "M 50 50 L " + predictionLow.join(" L ") } stroke="green" strokeWidth="0.5" fill="none" />);

    return (
      <svg width="300" height="300" viewBox={ "0 0 100 100" }>
        { objects }
      </svg>
    );
  }
}
