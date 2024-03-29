import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Api from "./Api";
import Controls from "./Controls";
import Leaderboard from "./Leaderboard";
import Progress from "./Progress";
import Sample from "./Sample";

export default class Session extends React.Component {

  constructor() {
    super();

    this.state = {
      selection: null,
      progress: [],
      progressTab: 0,
      samples: [],
      samplesTab: 0,
    };
  }

  async componentDidUpdate(props, prevstate) {
    const state = {};
    const ready = (this.props.session && this.props.session.brains);

    if (
      (this.props.tick !== props.tick) ||
      (ready && (!this.state.selection || (this.state.selection !== prevstate.selection)))
    ) {
      if (this.props.session.brains && this.props.session.brains.length) {
        if (!this.state.selection || !this.props.session.brains.find(one => (one.brain === this.state.selection))) {
          state.selection = this.props.session.brains[0].brain;
        }

        const progress = await Api.get("brains", this.state.selection || state.selection, "progress");

        if (progress) {
          state.progress = progress.progress;
          state.samples = progress.samples;
        }
      } else {
        state.selection = null;
        state.progress = [];
        state.samples = [];
      }

      this.setState(state);
    }
  }

  selectBrain(brain) {
    this.setState({ selection: brain });
  }

  changeProgressTab(_, newValue) {
    this.setState({ progressTab: newValue });
  }

  changeSamplesTab(_, newValue) {
    this.setState({ samplesTab: newValue });
  }

  render() {
    if (!this.props.session.brains.length) {
      return (
        <Controls session={ this.props.session } freeBrain={ this.props.freeBrain } refresh={ this.props.refresh } />
      );
    }

    this.props.session.brains.sort((a, b) => (a.record - b.record));

    const samplesTabs = [];
    const samplesViews = [];
    for (let index = 0; index < this.state.samples.length; index++) {
      const sample = this.state.samples[index];
      samplesTabs.push(
        <Tab key={ index } label={ sample.label } />
      );
      samplesViews.push(
        <Sample key={ index } visible={ this.state.samplesTab === index } sample={ sample } />
      );
    }

    const brain = this.props.session.brains.find(one => (one.brain === this.state.selection));

    return (
      <Stack spacing={2} direction={{ xs: "column", sm: "column", md: "row" }} useFlexGap flexWrap="wrap">

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Controls session={ this.props.session } brain={ brain } freeBrain={ this.props.freeBrain } refresh={ this.props.refresh } />
        </Paper>

        <Paper elevation={3} sx={{ padding: "0rem" }}>
          <Leaderboard brains={ this.props.session.brains } selected={ this.state.selection } onSelect={ this.selectBrain.bind(this) } />
        </Paper>

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={ this.state.progressTab } onChange={ this.changeProgressTab.bind(this) }>
              <Tab label="Pass" />
              <Tab label="Error" />
              <Tab label="Loss" />
              <Tab label="CPU" />
              <Tab label="RAM" />
            </Tabs>
          </Box>
          <Progress visible={ this.state.progressTab === 0 } progress={ this.state.progress } record={ brain } indicator="pass" type="per" />
          <Progress visible={ this.state.progressTab === 1 } progress={ this.state.progress } record={ brain } indicator="error" type="log" />
          <Progress visible={ this.state.progressTab === 2 } progress={ this.state.progress } record={ brain } indicator="loss" type="log" />
          <Progress visible={ this.state.progressTab === 3 } progress={ this.state.progress } indicator="efficiency" secondary="cpu" type="per" />
          <Progress visible={ this.state.progressTab === 4 } progress={ this.state.progress } indicator="ram" type="per" />
        </Paper>

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={ this.state.samplesTab } onChange={ this.changeSamplesTab.bind(this) }>
              { samplesTabs }
            </Tabs>
          </Box>
          { samplesViews }
        </Paper>

      </Stack>
    );
  }
}
