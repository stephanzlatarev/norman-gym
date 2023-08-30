import React from "react";

export default class Sample extends React.Component {

  render() {
    if (!this.props.visible || !this.props.sample || !this.props.sample.input || !this.props.sample.output || !this.props.sample.prediction) return null;

    const sample = this.props.sample;
    const objects = [];
    let key = 0;

    for (let y = 0, spot = 0; y < 100; y += 10) {
      for (let x = 0; x < 100; x += 10, spot++) {
        // Grid
        objects.push(<rect key={ key++ } x={ x } y={ y } width="10" height="10" stroke="lightGray" strokeWidth="0.1" fill="none" />);

        // Own military
        objects.push(<text key={ key++ } x={ x } y={ y + 10 } fill="green" fillOpacity={ sample.input[spot] } style={{ fontSize: 5 }}>♞</text>);

        // Own economy
        objects.push(<text key={ key++ } x={ x + 5 } y={ y + 10 } fill="green" fillOpacity={ sample.input[spot + 100] } style={{ fontSize: 5 }}>♜</text>);

        // Enemy military
        objects.push(<text key={ key++ } x={ x + 5 } y={ y + 5 } fill="red" fillOpacity={ sample.input[spot + 200] } style={{ fontSize: 5 }}>♞</text>);

        // Enemy economy
        objects.push(<text key={ key++ } x={ x } y={ y + 5 } fill="red" fillOpacity={ sample.input[spot + 300] } style={{ fontSize: 5 }}>♜</text>);

        // Expected deployment
        objects.push(<text key={ key++ } x={ x + 2.5 } y={ y + 7.5 } fill="blue" fillOpacity={ sample.output[spot] } style={{ fontSize: 5 }}>♞</text>);

        // Prediction
        objects.push(<text key={ key++ } x={ x } y={ y + 7.5 } fill="purple" fillOpacity={ sample.prediction[spot] } style={{ fontSize: 5 }}>♞</text>);

        if (spot === sample.spot) {
          objects.push(<rect key={ key++ } x={ x } y={ y } width="10" height="10" stroke="red" strokeWidth="0.5" fill="none" />);
        }

        const error = Math.abs(sample.prediction[spot] - sample.output[spot]);
        if (error >= 0.01) {
          objects.push(<text key={ key++ } x={ x + 2 } y={ y + 9.75 } fill="black"style={{ fontSize: 3 }}>{ error.toFixed(2) }</text>);
        }
      }
    }

    return (
      <svg width="300" height="300" viewBox={ "0 0 100 100" }>
        { objects }
      </svg>
    );
  }
}
