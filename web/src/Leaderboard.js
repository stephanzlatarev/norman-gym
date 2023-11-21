import React from "react";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import IconLocked from '@mui/icons-material/Lock';
import IconUnlocked from '@mui/icons-material/Moving';
import { shape } from "./shapes.js";

export default class Controls extends React.Component {

  render() {
    const onSelect = this.props.onSelect;
    const brains = [];

    const sxReguralCell = { whiteSpace: "nowrap" };
    const sxOptionalCell = { display: { xs: "none", sm: "table-cell" }, whiteSpace: "nowrap" };

    for (const brain of this.props.brains) {
      const style = (brain.brain === this.props.selected) ?  { backgroundColor: "AliceBlue" } : { cursor: "pointer" };
      const selectBrain = () => { onSelect(brain.brain); };
      const state = (brain.time > Date.now() - 1000 * 60 * 60 * 2) ? "green" : "gray";
      const icon = brain.locked ? <IconLocked sx={{ width: 10, height: 10 }} /> : <IconUnlocked sx={{ width: 10, height: 10 }} />;

      brains.push(
        <TableRow key={ brain.brain } sx={ style } onClick={ selectBrain }>
          <TableCell sx={ sxReguralCell }><Avatar sx={{ width: 16, height: 16, bgcolor: state }}>{ icon }</Avatar></TableCell>
          <TableCell sx={ sxReguralCell }>{ brain.brain }</TableCell>
          <TableCell sx={ sxReguralCell }><Tooltip title={ brain.shape }><span>{ shape(brain) }</span></Tooltip></TableCell>
          <TableCell sx={ sxReguralCell }>{ format(brain.pass, "percent") }</TableCell>
          <TableCell sx={ sxOptionalCell }>{ format(brain.error, "number") }</TableCell>
          <TableCell sx={ sxOptionalCell }>{ format(brain.loss, "exponent") }</TableCell>
          <TableCell sx={ sxReguralCell }>{ format(brain.record, "exponent") }</TableCell>
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

function format(value, type) {
  if (value === null) return "-";

  if ((type === "percent") && (value >= 0) && (value <= 1)) return (value * 100).toFixed(2) + "%";
  if ((type === "number") && (value >= 0)) return value.toFixed(4);
  if ((type === "exponent") && (value >= 0)) return value.toExponential(4);

  return "-";
}
