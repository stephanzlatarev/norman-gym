import React from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import IconAdd from '@mui/icons-material/Add';
import IconDownload from '@mui/icons-material/CloudDownload';
import IconLocked from '@mui/icons-material/Lock';
import IconRelease from '@mui/icons-material/Close';
import IconUnlocked from '@mui/icons-material/LockOpen';
import Api from "./Api";
import { shape } from "./shapes.js";

export default class Controls extends React.Component {

  constructor() {
    super();

    this.state = {
      editFixture: null,
      editShape: null,
    };
  }

  async toggleLock() {
    if (this.props.brain) {
      await Api.post({}, "brains", this.props.brain.brain, this.props.brain.locked ? "unlock" : "lock");
      await this.props.refresh();
    }
  }

  downloadBrain() {
    window.open(Api.url("brains", this.props.brain.brain, "download"), "_blank");
  }

  async releaseBrain() {
    if (this.props.brain) {
      await Api.post({}, "brains", this.props.brain.brain, "release");
      await this.props.refresh();
    }
  }

  async addBrain() {
    if (this.props.freeBrain) {
      await Api.post({ skill: this.props.session.skill }, "brains", this.props.freeBrain, "update");
      await this.props.refresh();
    }
  }

  onEditFixture(brain) {
    this.setState({ editFixture: brain });
  }

  onEditShape(brain) {
    this.setState({ editShape: brain });
  }

  async onChangeFixture(fixture) {
    if (fixture === true) {
      await Api.post({ fixture: this.fixture }, "brains", this.props.brain.brain, "update");
      await this.props.refresh();

      this.setState({ editFixture: null });
    } else {
      this.fixture = fixture ? fixture : "";
    }
  }

  async onChangeShape(shape) {
    if (shape) {
      this.shape = shape;
    } else {
      await Api.post({ shape: this.shape, locked: true }, "brains", this.props.brain.brain, "update");
      await this.props.refresh();

      this.setState({ editShape: null });
    }
  }

  render() {
    if (!this.props.session) return null;

    const skills = [];
    for (const skill of this.props.session.skill.split("/").slice(4)) {
      skills.push(
        <Typography key={ skills.length }>{ skill }</Typography>
      );
    }

    const playbooks = [];
    for (const playbook in this.props.session.playbooks) {
      playbooks.push(
        <div key={ playbook } style={{ color: this.props.session.playbooks[playbook].color }}>{ playbook }</div>
      );
    }

    const sxaction = { minWidth: "16px" };
    const fixture = (this.props.brain && this.props.brain.fixture) ? this.props.brain.fixture : "no fixture";

    const cardBrain = this.props.brain ? (
      <Card>
        <CardContent>
          <Typography color="text.secondary">Brain</Typography>
          <Typography>{ this.props.brain.brain }</Typography>
          {
            (this.state.editShape === this.props.brain.brain)
            ? (
              <TextField id="shape" label="Shape" variant="outlined"
                defaultValue={ this.props.brain.shape }
                onChange={(e) => this.onChangeShape(e.target.value)} onBlur={() => this.onChangeShape()}
              />
            )
            : (
              <Tooltip title={ this.props.brain.shape }>
                <Typography sx={{ cursor: "pointer" }} onClick={ () => this.onEditShape(this.props.brain.brain) }>{ shape(this.props.brain) }</Typography>
              </Tooltip>
            )
          }
          {
            (this.state.editFixture === this.props.brain.brain)
            ? (
              <TextField id="fixture" label="Fixture" variant="outlined"
                defaultValue={ this.props.brain.fixture ? this.props.brain.fixture : "50% 0.0001" }
                onChange={(e) => this.onChangeFixture(e.target.value)} onBlur={() => this.onChangeFixture(true)}
              />
            )
            : (
              <Tooltip>
                <Typography sx={{ cursor: "pointer" }} onClick={ () => this.onEditFixture(this.props.brain.brain) }>{ fixture }</Typography>
              </Tooltip>
            )
          }
        </CardContent>
        <CardActions>
          <Button size="small" sx={ sxaction } onClick={ this.toggleLock.bind(this) }>
            <IconLocked sx= { { display: this.props.brain.locked ? "inline-block" : "none" } } />
            <IconUnlocked sx= { { display: this.props.brain.locked ? "none" : "inline-block" } } />
          </Button>
          <Button size="small" sx={ sxaction } onClick={ this.downloadBrain.bind(this) }><IconDownload /></Button>
          <Button size="small" sx={ sxaction } disabled={ !!this.props.brain.locked } onClick={ this.releaseBrain.bind(this) }><IconRelease /></Button>
        </CardActions>
      </Card>
    ) : null;

    const buttonAddBrain = this.props.freeBrain ? (
      <Button size="small" sx={ sxaction } onClick={ this.addBrain.bind(this) }><IconAdd />&nbsp;Add brain</Button>
    ) : null;

    return (
      <Stack direction={{ xs: "row", sm: "row", md: "column" }} spacing={{ xs: 5, sm: 5, md: 2 }}>

        <Card>
          <CardContent>
            <Typography color="text.secondary">Skill</Typography>
            { skills }
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography color="text.secondary">Playbooks</Typography>
            { playbooks }
          </CardContent>
        </Card>

        { cardBrain }

        { buttonAddBrain }

      </Stack>
    );
  }
}
