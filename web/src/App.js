import React from "react";
import Alert from "@mui/material/Alert";
import Api from "./Api";
import Session from "./Session";

export default class App extends React.Component {

  constructor() {
    super();

    this.state = {
      sessions: [],
      brains: [],
      free: 0,
    };
  }

  async refresh() {
    const brains = await Api.get("brains");

    if (brains) {
      const total = brains.length;
      const used = brains.filter(one => !!one.skill).length;

      this.setState({ brains: brains, free: total - used });
    } else {
      this.setState({ brains: [], free: 0 });
    }

    const sessions = await Api.get("sessions");

    this.setState({ sessions: sessions ? sessions : [] });
  }

  render() {
    const alert = this.state.free ? (<Alert severity="info">{ this.state.free } free brains.</Alert>) : null;

    return (
      <div className="App">

        { alert }

        <Session refresh={ this.refresh.bind(this) } />

      </div>
    );
  }
}
