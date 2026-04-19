import React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Bank from "./Bank";
import Simulator from "./Simulator";
import Trainers from "./Trainers";

export default class App extends React.Component {

  constructor() {
    super();

    this.state = {
      tab: 0,
    };
  }

  onTabChange(_, value) {
    this.setState({ tab: value });
  }

  renderTabs() {
    return (
      <Tabs value={ this.state.tab } onChange={ this.onTabChange.bind(this) }>
        <Tab label="Trainers" />
        <Tab label="Simulator" />
        <Tab label="Bank" />
      </Tabs>
    );
  }

  renderView() {
    switch (this.state.tab) {
      case 0: return (<Trainers />);
      case 1: return (<Simulator />);
      case 2: return (<Bank />);
      default: return (<div>Oooops! Refresh the page, please!</div>);
    }
  }

  render() {
    return (
      <div className="App">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          { this.renderTabs() }
        </Box>
        <Box sx={{ pt: 2 }}>
          { this.renderView() }
        </Box>
      </div>
    );
  }
}
