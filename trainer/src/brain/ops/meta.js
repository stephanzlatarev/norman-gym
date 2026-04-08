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
      const base = { name: attr.name, type: attr.type };
      if (attr.type === "space" || attr.type === "scalar") base.range = attr.range;
      if (attr.type === "label") base.options = attr.options;
      return base;
    });

    const actAttributes = actGroup ? actGroup.attributes.map(attribute => {
      return observeAttributes.find(a => a.name === attribute.name);
    }) : [];

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
    lossMap,
    outputNames,
  };
}
