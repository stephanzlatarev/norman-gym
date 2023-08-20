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

  async componentDidMount() {
    await this.refresh();

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
    const meta = playbooks(this.state.progress);

    return (
      <Stack spacing={2} direction="row" flexWrap="wrap">
        <Paper elevation={3} sx={{ padding: "1rem" }}><Controls /></Paper>
        <Paper elevation={3} sx={{ padding: "1rem" }}><Progress playbooks={ meta } progress={ this.state.progress } indicator="error" type="log" /></Paper>
        <Paper elevation={3} sx={{ padding: "1rem" }}><Progress playbooks={ meta } progress={ this.state.progress } indicator="pass" type="per" /></Paper>
      </Stack>
    );
  }
}

// TODO: Replace with a playbooks record coming from the database
const COLORS = ["black", "blue", "green", "orange", "red"];
function playbooks(progress) {
  const playbooks = {};
  let index = 0;

  for (const one of progress) {
    for (const name in one.study) {
      if (!playbooks[name]) {
        playbooks[name] = { color: COLORS[index++] };
      }
    }
  }

  return playbooks;
}
