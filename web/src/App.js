import React from "react";
import AppBar from '@mui/material/AppBar';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export default class App extends React.Component {

  render() {
    return (
      <div className="App">

        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" color="inherit" component="div">
              norman gym
            </Typography>
          </Toolbar>
        </AppBar>

        <Paper elevation={3}>
          ...
        </Paper>

      </div>
    );
  }
}
