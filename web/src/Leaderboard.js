import React from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

export default class Controls extends React.Component {

  render() {
    const onSelect = this.props.onSelect;
    const brains = [];

    for (const brain of this.props.rank) {
      const style = (brain.brain === this.props.selected) ?  { backgroundColor: "AliceBlue" } : { cursor: "pointer" };
      const selectBrain = () => { onSelect(brain.brain); };

      brains.push(
        <TableRow key={ brain.brain } sx={ style } onClick={ selectBrain }>
          <TableCell>{ brain.brain }</TableCell>
          <TableCell>{ brain.mode }</TableCell>
          <TableCell>{ brain.error.toFixed(4) }</TableCell>
          <TableCell>{ (brain.pass * 100).toFixed(2) }%</TableCell>
        </TableRow>
      );
    }

    return (
      <TableContainer component={ Paper }>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>BRAIN</TableCell>
              <TableCell>MODE</TableCell>
              <TableCell>ERROR</TableCell>
              <TableCell>PASS</TableCell>
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
