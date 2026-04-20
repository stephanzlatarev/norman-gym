import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Progress from "./Progress";

export default class Trainer extends React.Component {

  constructor() {
    super();

    this.state = {
      resourceTab: 0,
      progressTab: 0,
      progressLabel: null,
      progressLabels: [],
    };
  }

  componentDidUpdate(props) {
    if (props === this.props) return;
    if (this.state.progressLabel) return;

    const progress = this.props.trainer.progress;
    if (!progress.length) return;

    const point = progress[progress.length - 1] || {};
    if (!point.loss) point.loss = { overall: 0 };

    const labels = Object.keys(point.loss);
    const tab = labels.indexOf("overall");

    if (this.state.progressLabel !== "overall") {
      this.setState({ progressTab: tab, progressLabels: labels, progressLabel: "overall" });
    }
  }

  onProgressTabTabChange(_, value) {
    this.setState({ progressTab: value, progressLabel: this.state.progressLabels[value] });
  }

  renderProgressTabs() {
    const tabs = this.state.progressLabels.map(one => (<Tab key={ one } label={ one } />));

    return (
      <Tabs value={ this.state.progressTab } onChange={ this.onProgressTabTabChange.bind(this) }>
        { tabs }
      </Tabs>
    );
  }

  renderProgressView() {
    const label = this.state.progressLabel;
    const progress = this.props.trainer.progress.map(one => ({ [label]: one.loss?.[label] }));

    return (<Progress progress={ progress } indicator={ label } type="log" visible="true" />);
  }

  onResourceTabTabChange(_, value) {
    this.setState({ resourceTab: value });
  }

  renderResourceTabs() {
    return (
      <Tabs value={ this.state.resourceTab } onChange={ this.onResourceTabTabChange.bind(this) }>
        <Tab label="CPU" />
        <Tab label="RAM" />
      </Tabs>
    );
  }

  renderResourceView() {
    switch (this.state.resourceTab) {
      case 0: return (<Progress progress={ this.props.trainer.progress } indicator="cpu" type="per" visible="true" />);
      case 1: return (<Progress progress={ this.props.trainer.progress } indicator="ram" type="per" visible="true" />);
    }
  }

  render() {
    const trainer = this.props.trainer;

    return (
      <Stack spacing={2} direction={{ xs: "column", sm: "column", md: "row" }} useFlexGap flexWrap="wrap">

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          { trainer.trainer } | { trainer.brain }
        </Paper>

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            { this.renderProgressTabs() }
          </Box>
          { this.renderProgressView() }
        </Paper>

        <Paper elevation={3} sx={{ padding: "1rem" }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            { this.renderResourceTabs() }
          </Box>
          { this.renderResourceView() }
        </Paper>

      </Stack>
    );
  }
}
