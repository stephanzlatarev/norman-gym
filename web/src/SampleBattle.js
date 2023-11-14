import React from "react";

export default class SampleBoard extends React.Component {

  render() {
    const sample = this.props.sample;
    const objects = [];
    let key = 0;

    objects.push(<rect key={ key++ } x={ 100 } y={ 100 } width="10" height="10" stroke="none" fill="lightGray" />);

    for (let y = 0, spot = 0; y < 210; y += 10) {
      for (let x = 0; x < 210; x += 10, spot++) {
        // Grid
        objects.push(<rect key={ key++ } x={ x } y={ y } width="10" height="10" stroke="lightGray" strokeWidth="0.1" fill="none" />);

        // Enemy health
        objects.push(<text key={ key++ } x={ x } y={ y + 10 } fill="red" fillOpacity={ opacity(sample.input[spot]) } style={{ fontSize: 12 }}>♜</text>);
        objects.push(<text key={ key++ } x={ x } y={ y + 10 } fill="red" fillOpacity={ opacity(sample.input[spot + 441]) } style={{ fontSize: 12 }}>♜</text>);

        // Target
        if (sample.prediction.length >= 441) {
          objects.push(<text key={ key++ } x={ x + 2 } y={ y + 10 } fill="black" fillOpacity={ opacity(sample.prediction[spot]) } style={{ fontSize: 12 }}>O</text>);
        }
      }
    }

    if (sample.prediction.length === 2) {
      const x = (sample.prediction[0] + 10) * 10 + 5;
      const y = (sample.prediction[1] + 10) * 10 + 5;

      objects.push(
        <defs key={ key++ }>
          <marker id="head" orient="auto" markerWidth="6" markerHeight="6" refX="3" refY="3">
            <circle cx="3" cy="3" r="0.8" fill="black" />
            <path d="M0,1.5 L0,4.5 L3,3 Z" fill="black" />
          </marker>
        </defs>
      );
      objects.push(<line key={ key++ } x1="105" y1="105" x2={ x } y2={ y } fill="none" strokeWidth="3" stroke="black" markerEnd="url(#head)" />);
    }

    return (
      <svg width="300" height="300" viewBox={ "0 0 210 210" }>
        { objects }
      </svg>
    );
  }
}

function opacity(health) {
  return health ? 0.1 + (health / 200) * 0.9 : 0;
}
