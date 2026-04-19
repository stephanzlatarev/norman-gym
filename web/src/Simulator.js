import React from "react";
import Button from "@mui/material/Button";
import IconRefresh from "@mui/icons-material/Refresh";
import LinearProgress from "@mui/material/LinearProgress";
import Api from "./Api";
import Board from "./Board";

export default class Simulator extends React.Component {

  constructor() {
    super();

    this.state = {
      events: [],
      step: null,
    };
  }

  async componentDidMount() {
    Api.listen(this, "events");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    const simulation = this.state.events.find(event => event.ref === this.state.step);
    const progressing = this.state.step && !simulation;

    let board;
    if (simulation) {
      board = (<Board simulation={ simulation} />);
    }

    return (
      <div>
        <h3>Simulator</h3>

        Brain: tic-tac-toe
        <br/>

        <Button size="small" onClick={ step.bind(this) } disabled={ progressing }>
          <IconRefresh />
        </Button>

        { progressing && <LinearProgress /> }
        <br />

        { board }
      </div>
    );
  }
}

async function step() {
  const step = String(Math.random());

  await Api.post({ ref: step, brain: "tic-tac-toe", type: "simulation-step" }, "events");

  this.setState({ step });
}
