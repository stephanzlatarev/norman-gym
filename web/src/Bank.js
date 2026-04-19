import React from "react";
import Stack from "@mui/material/Stack";
import Api from "./Api";

export default class Bank extends React.Component {

  constructor() {
    super();

    this.state = {
      brains: [],
    };
  }

  async componentDidMount() {
    Api.listen(this, "brains");
    Api.listen(this, "bank/stats");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    return (
      <div style={{ margin: "1rem" }}>
        <h3>Brains</h3>
        { renderBrains(this) }
        <h3>Stats</h3>
        { renderStats(this) }
      </div>
    );
  }
}

function renderBrains(component) {
  const brains = component.state.brains.map(one => (
    <div key={ one.brain }>
      { one.brain } | { new Date(one.time).toLocaleString() } | skill: { one.skill } | loss: { one.loss }
    </div>
  ));

  return (
    <Stack spacing={2} direction="column" margin={{ xs: "0rem", sm: "1rem" }}>
      { brains }
    </Stack>
  );
}

function renderStats(component) {
  const stats = component.state["bank/stats"];

  if (!stats) {
    return <div>Loading...</div>;
  }

  const rows = Object.keys(stats.documents || {}).map(collection => (
    <tr key={ collection }>
      <td>{ collection }</td>
      <td style={{ textAlign: "center", padding: "8px" }}>{ stats.documents?.[collection] || "" }</td>
      <td style={{ textAlign: "center", padding: "8px" }}>{ stats.files?.[collection] || "" }</td>
    </tr>
  ));

  return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #ccc" }}>
          <th style={{ textAlign: "left", padding: "8px" }}>Collection</th>
          <th style={{ textAlign: "center", padding: "8px" }}>Items</th>
          <th style={{ textAlign: "center", padding: "8px" }}>Files</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}
