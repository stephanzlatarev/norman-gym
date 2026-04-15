import React from "react";
import Stack from "@mui/material/Stack";
import Api from "./Api";

export default class Brains extends React.Component {

  constructor() {
    super();

    this.state = {
      brains: [],
    };
  }

  async componentDidMount() {
    Api.listen(this, "brains");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    const brains = this.state.brains.map(one => (
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
}
