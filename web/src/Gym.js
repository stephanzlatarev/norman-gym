import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Api from "./Api";
import Controls from "./Controls";
import Progress from "./Progress";
import Sample from "./Sample";

export default class Gym extends React.Component {

  constructor() {
    super();

    this.state = {
      tracker: null,
      progress: [],
      progressTab: 0,
      samples: [],
      samplesTab: 0,
    };
  }

  async componentDidMount() {
    await this.refresh();

    this.setState({ tracker: setInterval(this.refresh.bind(this), 10000) });
  }

  componentWillUnmount() {
    if (this.state.tracker) clearInterval(this.state.tracker);
  }

  changeProgressTab(_, newValue) {
    this.setState({ progressTab: newValue });
  }

  changeSamplesTab(_, newValue) {
    this.setState({ samplesTab: newValue });
  }

  async refresh() {
    const data = await Api.get("");

    if (data) {
      this.setState(data);
    }
  }

  render() {
    const meta = playbooks(this.state.progress);
    const worstSample = this.state.samples[0] ? this.state.samples[0].worst.sample : null;
    const worstSampleOpposite = worstSample ? this.state.samples[0].worst.opposite : null;

    return (
      <Stack spacing={2} direction="row" flexWrap="wrap">

        <Paper elevation={3} sx={{ padding: "1rem" }}><Controls /></Paper>

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={ this.state.progressTab } onChange={ this.changeProgressTab.bind(this) }>
              <Tab label="Pass" />
              <Tab label="Error" />
            </Tabs>
          </Box>
          <Progress visible={ this.state.progressTab === 0 } playbooks={ meta } progress={ this.state.progress } indicator="pass" type="per" />
          <Progress visible={ this.state.progressTab === 1 } playbooks={ meta } progress={ this.state.progress } indicator="error" type="log" />
        </Paper>

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={ this.state.samplesTab } onChange={ this.changeSamplesTab.bind(this) }>
              <Tab label="Worst" />
            </Tabs>
          </Box>
          <Sample visible={ this.state.samplesTab === 0 } sample={ worstSample } />
        </Paper>

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={ 0 }>
              <Tab label="Opposite" />
            </Tabs>
          </Box>
          <Sample sample={ worstSampleOpposite } />
        </Paper>

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
