import React from "react";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import StateIcon from '@mui/icons-material/PlayArrow';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";

export default class Controls extends React.Component {

  render() {
    const onSelect = this.props.onSelect;
    const brains = [];

    const sxReguralCell = { whiteSpace: "nowrap" };
    const sxOptionalCell = { display: { xs: "none", sm: "table-cell" }, whiteSpace: "nowrap" };

    for (const brain of this.props.rank) {
      const style = (brain.brain === this.props.selected) ?  { backgroundColor: "AliceBlue" } : { cursor: "pointer" };
      const selectBrain = () => { onSelect(brain.brain); };
      const state = (brain.time > Date.now() - 1000 * 60 * 60 * 2) ? "green" : "gray";

      brains.push(
        <TableRow key={ brain.brain } sx={ style } onClick={ selectBrain }>
          <TableCell sx={ sxReguralCell }><Avatar sx={{ width: 16, height: 16, bgcolor: state }}><StateIcon sx={{ width: 10, height: 10 }} /></Avatar></TableCell>
          <TableCell sx={ sxReguralCell }>{ brain.brain }</TableCell>
          <TableCell sx={ sxReguralCell }><Tooltip title={ brain.shape }><span>{ layers(brain.shape) } x { multiplier(brain.shape) }</span></Tooltip></TableCell>
          <TableCell sx={ sxReguralCell }>{ (brain.pass * 100).toFixed(2) }%</TableCell>
          <TableCell sx={ sxOptionalCell }>{ brain.error.toFixed(4) }</TableCell>
          <TableCell sx={ sxOptionalCell }>{ brain.loss.toExponential(4) }</TableCell>
          <TableCell sx={ sxReguralCell }>{ brain.record ? brain.record.toExponential(4) : "-" }</TableCell>
        </TableRow>
      );
    }

    return (
      <TableContainer component={ Paper }>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={ sxReguralCell }></TableCell>
              <TableCell sx={ sxReguralCell }>BRAIN</TableCell>
              <TableCell sx={ sxReguralCell }>SHAPE</TableCell>
              <TableCell sx={ sxReguralCell }>PASS</TableCell>
              <TableCell sx={ sxOptionalCell }>ERROR</TableCell>
              <TableCell sx={ sxOptionalCell }>LOSS</TableCell>
              <TableCell sx={ sxReguralCell }>RECORD</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { brains }
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
}

function layers(shape) {
  return shape.split(":").length - 1;
}

function multiplier(shape) {
  const layers = shape.split(":");
  return Number(layers[1]) / Number(layers[0]);
}
