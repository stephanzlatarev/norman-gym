import React from "react";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Api from "./Api";
import Session from "./Session";

export default class App extends React.Component {

  constructor() {
    super();

    this.state = {
      tracker: null,
      tick: 0,
      sessions: [],
      brains: [],
      free: 0,
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
    state.tick = this.state.tick + 1;

    const brains = await Api.get("brains");
    if (brains) {
      state.brains = brains;
      state.free = brains.filter(one => !one.skill).length;
    } else {
      state.brains = [];
      state.free = 0;
    }

    const sessions = await Api.get("sessions");
    state.sessions = sessions ? sessions : [];

    this.setState(state);
  }

  render() {
    const alert = this.state.free ? (<Alert severity="info">{ this.state.free } free brains.</Alert>) : null;

    const sessions = [];
    for (const session of this.state.sessions) {
      const brains = this.state.brains.filter(one => (one.skill === session.skill));
      session.playbooks["overall"] = { color: "black" };
      sessions.push(
        <Session key={ session.skill } tick={ this.state.tick } session={ session } brains={ brains } refresh={ this.refresh.bind(this) } />
      );
    }

    return (
      <div className="App">
        { alert }

        <Stack spacing={2} direction="column" margin={{ xs: "0rem", sm: "1rem" }}>
          { sessions }
        </Stack>
      </div>
    );
  }
}
