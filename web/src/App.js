import React from "react";
import Stack from "@mui/material/Stack";
import Api from "./Api";

export default class App extends React.Component {

  constructor() {
    super();

    this.state = {
      tracker: null,
      brains: [],
    };
  }

  async componentDidMount() {
    await this.refresh();

    this.setState({ tracker: setInterval(this.refresh.bind(this), 10000) });
  }

  componentWillUnmount() {
    if (this.state.tracker) clearInterval(this.state.tracker);
  }

  async refresh() {
    const state = {};

    state.brains = await Api.get("brains") || [];

    this.setState(state);
  }

  render() {
    const brains = this.state.brains.map(one => (
      <div key={ one.brain }>
        { one.brain } | { new Date(one.time).toLocaleString() } | skill: { one.skill } | loss: { one.loss }
      </div>
    ));

    return (
      <div className="App">
        <Stack spacing={2} direction="column" margin={{ xs: "0rem", sm: "1rem" }}>
          { brains }
        </Stack>
      </div>
    );
  }
}
