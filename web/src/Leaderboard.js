import React from "react";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import StateIcon from '@mui/icons-material/PlayArrow';

export default class Controls extends React.Component {

  render() {
    const onSelect = this.props.onSelect;
    const brains = [];

    for (const brain of this.props.rank) {
      const style = (brain.brain === this.props.selected) ?  { backgroundColor: "AliceBlue" } : { cursor: "pointer" };
      const selectBrain = () => { onSelect(brain.brain); };
      const state = (brain.time > Date.now() - 1000 * 60 * 60 * 2) ? "green" : "gray";

      brains.push(
        <TableRow key={ brain.brain } sx={ style } onClick={ selectBrain }>
          <TableCell><Avatar sx={{ width: 16, height: 16, bgcolor: state }}><StateIcon sx={{ width: 10, height: 10 }} /></Avatar></TableCell>
          <TableCell>{ brain.brain }</TableCell>
          <TableCell>{ brain.shape }</TableCell>
          <TableCell>{ (brain.pass * 100).toFixed(2) }%</TableCell>
          <TableCell>{ brain.error.toFixed(4) }</TableCell>
          <TableCell>{ brain.loss.toExponential(4) }</TableCell>
          <TableCell>{ brain.record ? brain.record.toExponential(4) : "-" }</TableCell>
        </TableRow>
      );
    }

    return (
      <TableContainer component={ Paper }>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>BRAIN</TableCell>
              <TableCell>SHAPE</TableCell>
              <TableCell>PASS</TableCell>
              <TableCell>ERROR</TableCell>
              <TableCell>LOSS</TableCell>
              <TableCell>RECORD</TableCell>
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
