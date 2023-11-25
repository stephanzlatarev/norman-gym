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
      freeBrain: null,
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

      const freeBrains = brains.filter(one => !one.skill);
      state.free = freeBrains.length;
      state.freeBrain = freeBrains.length ? freeBrains[0].brain : null;
    } else {
      state.brains = [];
      state.free = 0;
      state.freeBrain = null;
    }

    const sessions = await Api.get("sessions");
    state.sessions = sessions ? sessions : [];

    for (const session of state.sessions) {
      session.brains = state.brains.filter(one => (one.skill === session.skill));
      session.playbooks["overall"] = { color: "black" };
    }
    state.sessions.sort((a, b) => (b.brains.length - a.brains.length));

    this.setState(state);
  }

  render() {
    const alert = this.state.free ? (<Alert severity="info">{ this.state.free } free { (this.state.free === 1) ? "brain" : "brains" }.</Alert>) : null;

    const sessions = this.state.sessions.map(session => (
      <Session key={ session.skill } tick={ this.state.tick }
        session={ session } brains={ session.brains } freeBrain={ this.state.freeBrain }
        refresh={ this.refresh.bind(this) }
      />
    ));

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
