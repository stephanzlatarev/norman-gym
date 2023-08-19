import React from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Api from "./Api";
import Controls from "./Controls";
import Progress from "./Progress";

export default class Gym extends React.Component {

  constructor() {
    super();

    this.state = {
      tracker: null,
      progress: [],
    };
  }

  componentDidMount() {
    this.setState({ tracker: setInterval(this.refresh.bind(this), 10000) });
  }

  componentWillUnmount() {
    if (this.state.tracker) clearInterval(this.state.tracker);
  }

  async refresh() {
    const data = await Api.get("");

    if (data) {
      this.setState(data);
    }
  }

  render() {
    return (
      <Stack spacing={2} direction="row" flexWrap="wrap">
        <Paper elevation={3} sx={{ padding: "1rem" }}><Progress data={ this.state.progress } /></Paper>
        <Paper elevation={3} sx={{ padding: "1rem" }}><Controls /></Paper>
      </Stack>
    );
  }
}
