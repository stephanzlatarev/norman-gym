export default function computeMetadata(skill, config) {
  const attributeWidth = config.attributeWidth || 128;
  const objectWidth = config.objectWidth;
  const brainWidth = config.brainWidth || 4 * objectWidth;

  const groups = [];
  let objectOffset = 0;
  const groupAssignments = [];

  const observeGroupNames = Object.keys(skill.observe);

  for (let gi = 0; gi < observeGroupNames.length; gi++) {
    const groupName = observeGroupNames[gi];
    const observeGroup = skill.observe[groupName];
    const actGroup = skill.act[groupName];

    const limit = observeGroup.limit;
    const modify = !!(actGroup && (actGroup.modify !== false));
    const create = actGroup ? actGroup.create : 0;

    const observeAttributes = observeGroup.attributes.map(attr => {
      const type = attr.type || (attr.options ? "label" : attr.range ? "scalar" : undefined);
      const base = { name: attr.name, type };
      if (type === "space" || type === "scalar") base.range = attr.range;
      if (type === "space") {
        base.axes = attr.axes;
        base.tupleWidth = attr.axes.length;
      } else {
        base.tupleWidth = 1;
      }
      if (type === "label") base.options = attr.options;
      return base;
    });

    // Compute tuple offsets for observe attributes
    let tupleOffset = 0;
    for (const attr of observeAttributes) {
      attr.tupleOffset = tupleOffset;
      tupleOffset += attr.tupleWidth;
    }

    const actAttributes = actGroup ? actGroup.attributes.map(attribute => {
      return observeAttributes.find(a => a.name === attribute.name);
    }) : [];

    // Compute tuple offsets for act attributes
    let actTupleOffset = 0;
    for (const attr of actAttributes) {
      attr.actTupleOffset = actTupleOffset;
      actTupleOffset += attr.tupleWidth;
    }

    const outputObjects = (modify ? limit : 0) + create;

    const groupMeta = {
      name: groupName,
      groupIndex: gi,
      limit,
      modify,
      create,
      observeOffset: objectOffset,
      observeAttributes,
      actAttributes,
      outputObjects,
    };

    // Observe objects
    for (let t = 0; t < limit; t++) {
      groupAssignments.push(gi);
    }
    objectOffset += limit;

    groups.push(groupMeta);
  }

  // Second pass: assign create object offsets
  for (const group of groups) {
    if (group.create > 0) {
      group.createOffset = objectOffset;
      for (let t = 0; t < group.create; t++) {
        groupAssignments.push(group.groupIndex);
      }
      objectOffset += group.create;
    }
  }

  const totalObjects = objectOffset;
  const totalCreateObjects = groups.reduce((sum, g) => sum + g.create, 0);

  // Determine spatial axes from first space attribute per group
  let spatialAxes = 0;
  for (const group of groups) {
    const firstSpace = group.observeAttributes.find(a => a.type === "space");
    if (firstSpace) {
      group.spatialAttribute = firstSpace.name;
      spatialAxes = Math.max(spatialAxes, firstSpace.axes.length);
    }
  }

  // Build loss mapping and output names from act groups
  const lossMap = {};
  const outputNames = [];
  for (const group of groups) {
    if (!skill.act[group.name]) continue;
    for (const attr of group.actAttributes) {
      const outputName = `${group.name}_${attr.name}_out`;
      lossMap[outputName] = (attr.type === "label") ? "categoricalCrossentropy" : "meanSquaredError";
      outputNames.push(outputName);
    }
  }

  return {
    attributeWidth,
    objectWidth,
    brainWidth,
    groups,
    groupAssignments,
    totalObjects,
    totalCreateObjects,
    numGroups: observeGroupNames.length,
    spatialAxes,
    lossMap,
    outputNames,
  };
}
