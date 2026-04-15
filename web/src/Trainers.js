import React from "react";
import Stack from "@mui/material/Stack";
import Api from "./Api";
import Trainer from "./Trainer";

let id = 1;
export default class Trainers extends React.Component {

  constructor() {
    super();

    this.state = {
      assignments: [],
      progress: [],
    };
  }

  async componentDidMount() {
    Api.listen(this, "assignments");
    Api.listen(this, "progress");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    const trainers = new Map();

    for (const assignment of this.state.assignments) {
      trainers.set(assignment.trainer, { ...assignment, progress: [] });
    }

    for (const point of this.state.progress) {
      const trainer = trainers.get(point.trainer);

      if (trainer) {
        trainer.progress.push(point);
      }
    }

    const list = Array.from(trainers.values())
      .sort((a, b) => a.trainer.localeCompare(b.trainer))
      .map(one => (
        <Trainer key={ one.trainer } trainer={ one } />
      ));

    return (
      <Stack spacing={2} direction="column" margin={{ xs: "0rem", sm: "1rem" }}>
        { list }
      </Stack>
    );
  }
}
