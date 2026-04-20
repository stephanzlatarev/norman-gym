import React from "react";
import IconButton from "@mui/material/IconButton";
import IconEdit from "@mui/icons-material/Edit";
import IconSave from "@mui/icons-material/Save";
import Api from "./Api";

const CENTER = { textAlign: "center", padding: "8px" };
const LEFT = { textAlign: "left", padding: "8px" };
const TABLE = { borderCollapse: "collapse", width: "100%", marginBottom: "2rem" };
const HEADER = { borderBottom: "2px solid #ccc" };
const INPUT = { width: "5rem", padding: "4px 6px" };

export default class Bank extends React.Component {

  constructor() {
    super();

    this.state = {
      brains: [],
      editingTrainBatchSize: "",
      editingTrainer: null,
      savingTrainer: false,
      trainers: [],
    };
  }

  async componentDidMount() {
    Api.listen(this, "brains");
    Api.listen(this, "trainers");
    Api.listen(this, "bank/stats");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    return (
      <div style={{ margin: "1rem" }}>
        { renderBrains(this) }
        { renderTrainers(this) }
        { renderStats(this) }
      </div>
    );
  }
}

function renderBrains(component) {
  const brains = [...component.state.brains]
    .sort((a, b) => a.brain.localeCompare(b.brain));
  const rows = brains.map(one => (
    <tr key={ one.brain }>
      <td style={ LEFT }>{ one.brain }</td>
      <td style={ CENTER }>{ new Date(one.time).toLocaleString() }</td>
      <td style={ LEFT }>{ one.skill }</td>
      <td style={ CENTER }>{ one.loss }</td>
    </tr>
  ));

  return (
    <table style={ TABLE }>
      <thead>
        <tr style={ HEADER }>
          <th style={ LEFT }>Brain</th>
          <th style={ CENTER }>Time</th>
          <th style={ LEFT }>Skill</th>
          <th style={ CENTER }>Loss</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}

function editTrainer(component, trainer, trainBatchSize, dropoutRate, learningRate, clipNorm) {
  component.setState({ 
    editingTrainer: trainer, 
    editingTrainBatchSize: String(trainBatchSize ?? ""),
    editingDropoutRate: String(dropoutRate ?? ""),
    editingLearningRate: String(learningRate ?? ""),
    editingClipNorm: String(clipNorm ?? "")
  });
}

function changeTrainBatchSize(component, event) {
  component.setState({ editingTrainBatchSize: event.target.value });
}

function changeDropoutRate(component, event) {
  component.setState({ editingDropoutRate: event.target.value });
}

function changeLearningRate(component, event) {
  component.setState({ editingLearningRate: event.target.value });
}

function changeClipNorm(component, event) {
  component.setState({ editingClipNorm: event.target.value });
}

async function saveTrainer(component, trainer) {
  const trainBatchSize = Number(component.state.editingTrainBatchSize);
  const dropoutRate = Number(component.state.editingDropoutRate);
  const learningRate = Number(component.state.editingLearningRate);
  const clipNorm = Number(component.state.editingClipNorm);

  if (!Number.isFinite(trainBatchSize) || !Number.isFinite(dropoutRate) || !Number.isFinite(learningRate) || !Number.isFinite(clipNorm)) {
    return;
  }

  component.setState({ savingTrainer: true });

  const response = await Api.post({ trainBatchSize, dropoutRate, learningRate, clipNorm }, "trainers", trainer);
  const saved = response?.status === "OK";

  component.setState(state => ({
    editingTrainer: null,
    editingTrainBatchSize: "",
    editingDropoutRate: "",
    editingLearningRate: "",
    editingClipNorm: "",
    savingTrainer: false,
    trainers: saved ? state.trainers.map(one => (
      (one.trainer === trainer) ? { ...one, trainBatchSize, dropoutRate, learningRate, clipNorm } : one
    )) : state.trainers,
  }));
}

function renderTrainerTrainBatchSize(component, trainer) {
  if (component.state.editingTrainer === trainer.trainer) {
    return (
      <input
        type="text"
        value={ component.state.editingTrainBatchSize }
        onChange={ event => changeTrainBatchSize(component, event) }
        style={ INPUT }
      />
    );
  }

  return trainer.trainBatchSize;
}

function renderTrainerDropoutRate(component, trainer) {
  if (component.state.editingTrainer === trainer.trainer) {
    return (
      <input
        type="text"
        value={ component.state.editingDropoutRate }
        onChange={ event => changeDropoutRate(component, event) }
        style={ INPUT }
      />
    );
  }

  return trainer.dropoutRate;
}

function renderTrainerLearningRate(component, trainer) {
  if (component.state.editingTrainer === trainer.trainer) {
    return (
      <input
        type="text"
        value={ component.state.editingLearningRate }
        onChange={ event => changeLearningRate(component, event) }
        style={ INPUT }
      />
    );
  }

  return trainer.learningRate;
}

function renderTrainerClipNorm(component, trainer) {
  if (component.state.editingTrainer === trainer.trainer) {
    return (
      <input
        type="text"
        value={ component.state.editingClipNorm }
        onChange={ event => changeClipNorm(component, event) }
        style={ INPUT }
      />
    );
  }

  return trainer.clipNorm;
}

function renderTrainerActions(component, trainer) {
  const editingTrainer = component.state.editingTrainer;
  const editingTrainBatchSize = component.state.editingTrainBatchSize;
  const editingDropoutRate = component.state.editingDropoutRate;
  const editingLearningRate = component.state.editingLearningRate;
  const editingClipNorm = component.state.editingClipNorm;
  const savingTrainer = component.state.savingTrainer;

  const isValidNumber = (str) => Number.isFinite(Number(str));
  const allFieldsValid = isValidNumber(editingTrainBatchSize) && isValidNumber(editingDropoutRate) && isValidNumber(editingLearningRate) && isValidNumber(editingClipNorm);

  if (editingTrainer === trainer.trainer) {
    return (
      <IconButton
        aria-label={ `Save ${trainer.trainer}` }
        size="small"
        onClick={ () => saveTrainer(component, trainer.trainer) }
        disabled={ savingTrainer || !allFieldsValid }
      >
        <IconSave fontSize="inherit" />
      </IconButton>
    );
  }

  return (
    <IconButton
      aria-label={ `Edit ${trainer.trainer}` }
      size="small"
      onClick={ () => editTrainer(component, trainer.trainer, trainer.trainBatchSize, trainer.dropoutRate, trainer.learningRate, trainer.clipNorm) }
    >
      <IconEdit fontSize="inherit" />
    </IconButton>
  );
}

function orderByNameIndex(list, name) {
  const ordered = list.map(one => ({ ...one }));

  for (const one of ordered) {
    const parts = one[name].split("-");

    try {
      const number = Number(parts[parts.length - 1]);
      one.index = (number >= 0) ? number : Infinity;
    } catch {
      one.index = Infinity;
    }
  }

  ordered.sort((a, b) => (a.index - b.index));

  return ordered;
}

function renderTrainers(component) {
  const trainers = orderByNameIndex(component.state.trainers, "trainer");
  const rows = trainers.map(one => (
    <tr key={ one.trainer }>
      <td style={ LEFT }>{ one.trainer }</td>
      <td style={ CENTER }>{ one.brain }</td>
      <td style={ LEFT }>{ one.skill }</td>
      <td style={ CENTER }>{ renderTrainerTrainBatchSize(component, one) }</td>
      <td style={ CENTER }>{ renderTrainerDropoutRate(component, one) }</td>
      <td style={ CENTER }>{ renderTrainerLearningRate(component, one) }</td>
      <td style={ CENTER }>{ renderTrainerClipNorm(component, one) }</td>
      <td style={ CENTER }>{ one.measureBatchSize }</td>
      <td style={ CENTER }>{ renderTrainerActions(component, one) }</td>
    </tr>
  ));

  return (
    <table style={ TABLE }>
      <thead>
        <tr style={ HEADER }>
          <th style={ LEFT }>Trainer</th>
          <th style={ CENTER }>Brain</th>
          <th style={ LEFT }>Skill</th>
          <th style={ CENTER }>Training batch size</th>
          <th style={ CENTER }>Dropout rate</th>
          <th style={ CENTER }>Learning rate</th>
          <th style={ CENTER }>Clip norm</th>
          <th style={ CENTER }>Measure batch size</th>
          <th style={ CENTER }>Actions</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}

function renderStats(component) {
  const stats = component.state["bank/stats"];

  if (!stats) {
    return <div>Loading...</div>;
  }

  const rows = Object.keys(stats.documents || {}).map(collection => (
    <tr key={ collection }>
      <td style={ LEFT }>{ collection }</td>
      <td style={ CENTER }>{ stats.documents?.[collection] || "" }</td>
      <td style={ CENTER }>{ stats.files?.[collection] || "" }</td>
    </tr>
  ));

  return (
    <table style={ TABLE }>
      <thead>
        <tr style={ HEADER }>
          <th style={ LEFT }>Collection</th>
          <th style={ CENTER }>Items</th>
          <th style={ CENTER }>Files</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}
