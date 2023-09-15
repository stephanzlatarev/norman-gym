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

export default class Gym extends React.Component {

  constructor() {
    super();

    this.state = {
      tracker: null,
      session: null,
      brains: [],
      selection: null,
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

  selectBrain(brain) {
    this.setState({ selection: brain });
    this.refresh();
  }

  changeProgressTab(_, newValue) {
    this.setState({ progressTab: newValue });
  }

  changeSamplesTab(_, newValue) {
    this.setState({ samplesTab: newValue });
  }

  async refresh() {
    const sessions = await Api.get("sessions");

    if (sessions && sessions.length) {
      const session = sessions[0];
      session.playbooks["overall"] = { color: "black" };
      this.setState({ session: session });
    }

    let brains = await Api.get("brains");

    if (brains) {
      brains = brains.filter(one => (one.skill === this.state.session.skill));
      brains.sort((a, b) => (a.record - b.record));
      this.setState({ brains: brains });

      if (!this.state.selection && brains.length) {
        this.setState({ selection: brains[0].brain });
      }
    }

    if (this.state.selection) {
      const progress = await Api.get("brains", this.state.selection, "progress");

      if (progress) {
        this.setState({ progress: progress.progress, samples: progress.samples });
      }
    } else {
      this.setState({ progress: [], samples: [] });
    }
  }

  render() {
    const playbooks = this.state.session ? this.state.session.playbooks : {};

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

    return (
      <Stack spacing={2} direction={{ xs: "column", sm: "column", md: "row" }} margin={{ xs: "0rem", sm: "1rem" }} useFlexGap flexWrap="wrap">

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Controls session={ this.state.session } brain={ this.state.brains.find(one => (one.brain === this.state.selection)) } refresh={ this.refresh.bind(this) } />
        </Paper>

        <Paper elevation={3} sx={{ padding: "0rem" }}>
          <Leaderboard brains={ this.state.brains } selected={ this.state.selection } onSelect={ this.selectBrain.bind(this) } />
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
