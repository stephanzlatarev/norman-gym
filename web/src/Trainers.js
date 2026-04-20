import React from "react";
import Stack from "@mui/material/Stack";
import Api from "./Api";
import Trainer from "./Trainer";

export default class Trainers extends React.Component {

  constructor() {
    super();

    this.state = {
      trainers: [],
      progress: [],
    };
  }

  async componentDidMount() {
    Api.listen(this, "trainers");
    Api.listen(this, "progress");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    const trainers = new Map();

    for (const one of this.state.trainers) {
      trainers.set(one.trainer, { ...one, progress: [] });
    }

    for (const point of this.state.progress) {
      const trainer = trainers.get(point.trainer);

      if (trainer) {
        trainer.progress.push(point);
      }
    }

    const list = Array.from(trainers.values())
      .filter(one => !!one.brain)
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
