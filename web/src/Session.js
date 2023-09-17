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
import Resource from "./Resource";
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

    if (
      (this.props.tick !== props.tick) ||
      (this.props.brains.length && (!this.state.selection || (this.state.selection !== prevstate.selection)))
    ) {
      if (this.props.brains.length) {
        if (!this.state.selection || !this.props.brains.find(one => (one.brain === this.state.selection))) {
          state.selection = this.props.brains[0].brain;
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
    if (!this.props.brains.length) {
      return (
        <Controls session={ this.props.session } freeBrain={ this.props.freeBrain } refresh={ this.props.refresh } />
      );
    }

    this.props.brains.sort((a, b) => (a.record - b.record));

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

    const playbooks = this.props.session.playbooks;
    const brain = this.props.brains.find(one => (one.brain === this.state.selection));

    return (
      <Stack spacing={2} direction={{ xs: "column", sm: "column", md: "row" }} useFlexGap flexWrap="wrap">

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Controls session={ this.props.session } brain={ brain } freeBrain={ this.props.freeBrain } refresh={ this.props.refresh } />
        </Paper>

        <Paper elevation={3} sx={{ padding: "0rem" }}>
          <Leaderboard brains={ this.props.brains } selected={ this.state.selection } onSelect={ this.selectBrain.bind(this) } />
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
          <Progress visible={ this.state.progressTab === 0 } playbooks={ playbooks } progress={ this.state.progress } indicator="pass" type="per" />
          <Progress visible={ this.state.progressTab === 1 } playbooks={ playbooks } progress={ this.state.progress } indicator="error" type="log" />
          <Progress visible={ this.state.progressTab === 2 } playbooks={ playbooks } progress={ this.state.progress } indicator="loss" type="log" />
          <Resource visible={ this.state.progressTab === 3 } progress={ this.state.progress } indicator="cpu" />
          <Resource visible={ this.state.progressTab === 4 } progress={ this.state.progress } indicator="ram" />
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
