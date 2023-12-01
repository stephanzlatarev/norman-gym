import React from "react";


export default class SampleBoard extends React.Component {

  render() {
    const sample = this.props.sample;

    const long = (sample.input.length === 156);
    const OFFSET_WARRIORS = long ? 6 : 3;
    const SIZE_WARRIORS = long ? 8 : 3;
    const SLOTS_WARRIORS = long ? 10 : 3;
    const OFFSET_ENEMIES = long ? 6 + 80 : 12;
    const SIZE_ENEMIES = long ? 7 : 3;
    const SLOTS_ENEMIES = long ? 10 : 4;

    const objects = [];
    let key = 0;

    // Grid
    for (let i = 1; i <= 10; i++) {
      const opacity = (i % 2) ? 0.25 : 0.5;
      objects.push(<circle key={ key++ } cx="105" cy="105" r={ i * 10 } fill="none" stroke="lightGray" strokeWidth="1" strokeOpacity={ opacity }></circle>);
    }

    // Warriors
    for (let i = 0; i < SLOTS_WARRIORS; i++) {
      const offset = OFFSET_WARRIORS + i * SIZE_WARRIORS;

      if (!sample.input[offset]) continue;

      const x = coordinate(sample.input[offset]);
      const y = coordinate(sample.input[offset + 1]);
      const h = sample.input[offset + 2];

      objects.push(<text key={ key++ } x={ x } y={ y + 10 } fill="green" fillOpacity={ opacity(h) } style={{ fontSize: 12 }}>♜</text>);
    }

    // Enemies
    for (let i = 0; i < SLOTS_ENEMIES; i++) {
      const offset = OFFSET_ENEMIES + i * SIZE_ENEMIES;

      if (!sample.input[offset]) continue;

      const x = coordinate(sample.input[offset]);
      const y = coordinate(sample.input[offset + 1]);
      const h = sample.input[offset + 2];

      objects.push(<text key={ key++ } x={ x } y={ y + 10 } fill="red" fillOpacity={ opacity(h) } style={{ fontSize: 12 }}>♜</text>);
    }

    const ox = coordinate(sample.output[0]);
    const oy = coordinate(sample.output[1]);
    const px = coordinate(sample.prediction[0]);
    const py = coordinate(sample.prediction[1]);

    objects.push(
      <defs key={ key++ }>
        <marker id="head" orient="auto" markerWidth="6" markerHeight="6" refX="3" refY="3">
          <circle cx="3" cy="3" r="0.8" fill="black" />
          <path d="M0,1.5 L0,4.5 L3,3 Z" fill="black" />
        </marker>
      </defs>
    );
    objects.push(<line key={ key++ } x1="105" y1="105" x2={ ox + 5 } y2={ oy + 5 } fill="none" strokeWidth="3" stroke="black" strokeOpacity="0.2" />);
    objects.push(<line key={ key++ } x1="105" y1="105" x2={ px + 5 } y2={ py + 5 } fill="none" strokeWidth="3" stroke="black" markerEnd="url(#head)" />);

    return (
      <svg width="300" height="300" viewBox={ "0 0 210 210" }>
        { objects }
      </svg>
    );
  }
}

function coordinate(x) {
  return (x + 10) * 10;
}

function opacity(health) {
  if (health <= 0) return 0;
  if (health >= 100) return 1;
  return 0.2 + (health / 100) * 0.8;
}
