import React from "react";
import Api from "./Api";

const CENTER = { textAlign: "center", padding: "8px" };
const LEFT = { textAlign: "left", padding: "8px" };
const TABLE = { borderCollapse: "collapse", width: "100%", marginBottom: "2rem" };
const HEADER = { borderBottom: "2px solid #ccc" };

export default class Bank extends React.Component {

  constructor() {
    super();

    this.state = {
      brains: [],
      trainers: [],
    };
  }

  async componentDidMount() {
    Api.listen(this, "brains");
    Api.listen(this, "trainers");
    Api.listen(this, "bank/stats");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    return (
      <div style={{ margin: "1rem" }}>
        { renderBrains(this) }
        { renderTrainers(this) }
        { renderStats(this) }
      </div>
    );
  }
}

function renderBrains(component) {
  const brains = [...component.state.brains]
    .sort((a, b) => a.brain.localeCompare(b.brain));
  const rows = brains.map(one => (
    <tr key={ one.brain }>
      <td style={ LEFT }>{ one.brain }</td>
      <td style={ CENTER }>{ new Date(one.time).toLocaleString() }</td>
      <td style={ LEFT }>{ one.skill }</td>
      <td style={ CENTER }>{ one.loss }</td>
    </tr>
  ));

  return (
    <table style={ TABLE }>
      <thead>
        <tr style={ HEADER }>
          <th style={ LEFT }>Brain</th>
          <th style={ CENTER }>Time</th>
          <th style={ LEFT }>Skill</th>
          <th style={ CENTER }>Loss</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}

function orderByNameIndex(list, name) {
  for (const one of list) {
    const parts = one[name].split("-");

    try {
      const number = Number(parts[parts.length - 1]);
      one.index = (number >= 0) ? number : Infinity;
    } catch {
      one.index = Infinity;
    }
  }

  list.sort((a, b) => (a.index - b.index));

  return list;
}

function renderTrainers(component) {
  const trainers = orderByNameIndex(component.state.trainers, "trainer");
  const rows = trainers.map(one => (
    <tr key={ one.trainer }>
      <td style={ LEFT }>{ one.trainer }</td>
      <td style={ CENTER }>{ one.brain }</td>
      <td style={ LEFT }>{ one.skill }</td>
      <td style={ CENTER }>{ one.trainBatchSize }</td>
      <td style={ CENTER }>{ one.dropoutRate }</td>
      <td style={ CENTER }>{ one.measureBatchSize }</td>
    </tr>
  ));

  return (
    <table style={ TABLE }>
      <thead>
        <tr style={ HEADER }>
          <th style={ LEFT }>Trainer</th>
          <th style={ CENTER }>Brain</th>
          <th style={ LEFT }>Skill</th>
          <th style={ CENTER }>Training batch size</th>
          <th style={ CENTER }>Dropout rate</th>
          <th style={ CENTER }>Measure batch size</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}

function renderStats(component) {
  const stats = component.state["bank/stats"];

  if (!stats) {
    return <div>Loading...</div>;
  }

  const rows = Object.keys(stats.documents || {}).map(collection => (
    <tr key={ collection }>
      <td style={ LEFT }>{ collection }</td>
      <td style={ CENTER }>{ stats.documents?.[collection] || "" }</td>
      <td style={ CENTER }>{ stats.files?.[collection] || "" }</td>
    </tr>
  ));

  return (
    <table style={ TABLE }>
      <thead>
        <tr style={ HEADER }>
          <th style={ LEFT }>Collection</th>
          <th style={ CENTER }>Items</th>
          <th style={ CENTER }>Files</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}
