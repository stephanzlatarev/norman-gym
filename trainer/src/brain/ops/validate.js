function validateConfig(config) {
  const errors = [];

  if (!Number.isInteger(config.objectWidth) || config.objectWidth <= 0)
    errors.push("objectWidth must be a positive integer.");
  if (!Number.isInteger(config.attentionHeads) || config.attentionHeads <= 0)
    errors.push("attentionHeads must be a positive integer.");
  if (!Number.isInteger(config.attentionGroups) || config.attentionGroups <= 0)
    errors.push("attentionGroups must be a positive integer.");
  if (!Number.isInteger(config.brainLayers) || config.brainLayers <= 0)
    errors.push("brainLayers must be a positive integer.");

  if (config.objectWidth > 0 && config.attentionHeads > 0 && config.objectWidth % config.attentionHeads !== 0)
    errors.push(`objectWidth (${config.objectWidth}) must be divisible by attentionHeads (${config.attentionHeads}).`);
  if (config.attentionHeads > 0 && config.attentionGroups > 0 && config.attentionHeads % config.attentionGroups !== 0)
    errors.push(`attentionHeads (${config.attentionHeads}) must be divisible by attentionGroups (${config.attentionGroups}).`);

  if (config.brainWidth !== undefined && config.brainWidth !== null) {
    if (!Number.isInteger(config.brainWidth) || config.brainWidth <= 0)
      errors.push("brainWidth, if provided, must be a positive integer.");
  }

  if (config.attributeWidth !== undefined && config.attributeWidth !== null) {
    if (!Number.isInteger(config.attributeWidth) || config.attributeWidth <= 0)
      errors.push("attributeWidth, if provided, must be a positive integer.");
  }

  if (typeof config.dropoutRate !== "number" || config.dropoutRate < 0 || config.dropoutRate > 1)
    errors.push("dropoutRate must be a number in [0, 1].");

  if (!Number.isInteger(config.batchSize) || config.batchSize <= 0)
    errors.push("batchSize must be a positive integer.");

  return errors;
}

function validateSkill(skill) {
  const errors = [];

  if (!skill || typeof skill !== "object")
    return ["Skill must be a non-null object."];

  if (typeof skill.name !== "string" || !skill.name.trim())
    errors.push("Skill name must be a non-empty string.");

  if (!skill.observe || typeof skill.observe !== "object" || Object.keys(skill.observe).length === 0)
    errors.push("observe must be a non-empty object of named groups.");

  if (!skill.act || typeof skill.act !== "object" || Object.keys(skill.act).length === 0)
    errors.push("act must be a non-empty object of named groups.");

  if (errors.length > 0) return errors;

  // Validate observe groups
  for (const [groupName, group] of Object.entries(skill.observe)) {
    if (groupName.includes("_"))
      errors.push(`Observe group name "${groupName}" must not contain underscores.`);

    if (!Number.isInteger(group.limit) || group.limit <= 0)
      errors.push(`Observe group "${groupName}": limit must be a positive integer.`);

    if (!Array.isArray(group.attributes) || group.attributes.length === 0)
      errors.push(`Observe group "${groupName}": attributes must be a non-empty array.`);
    else {
      const attrNames = new Set();
      for (const attr of group.attributes) {
        if (typeof attr.name !== "string" || !attr.name.trim())
          errors.push(`Observe group "${groupName}": attribute name must be a non-empty string.`);
        if (attr.name && attr.name.includes("_"))
          errors.push(`Observe group "${groupName}": attribute name "${attr.name}" must not contain underscores.`);
        if (attrNames.has(attr.name))
          errors.push(`Observe group "${groupName}": duplicate attribute name "${attr.name}".`);
        attrNames.add(attr.name);

        if (!["space", "scalar", "label"].includes(attr.type))
          errors.push(`Observe group "${groupName}", attribute "${attr.name}": type must be one of space, scalar, label.`);

        if (attr.type === "space" || attr.type === "scalar") {
          if (!Array.isArray(attr.range) || attr.range.length !== 2)
            errors.push(`Observe group "${groupName}", attribute "${attr.name}": range must be [min, max].`);
          else if (attr.range[0] >= attr.range[1])
            errors.push(`Observe group "${groupName}", attribute "${attr.name}": range min must be less than max.`);
        }

        if (attr.type === "label") {
          if (!Array.isArray(attr.options) || attr.options.length < 2)
            errors.push(`Observe group "${groupName}", attribute "${attr.name}": options must have at least 2 entries.`);
        }
      }
    }
  }

  // Validate act groups
  for (const [groupName, group] of Object.entries(skill.act)) {
    if (!(groupName in skill.observe))
      errors.push(`Act group "${groupName}" must match an observe group name.`);

    if (typeof group.modify !== "boolean")
      errors.push(`Act group "${groupName}": modify must be a boolean.`);

    if (!Number.isInteger(group.create) || group.create < 0)
      errors.push(`Act group "${groupName}": create must be a non-negative integer.`);

    if (group.modify !== true && (!Number.isInteger(group.create) || group.create <= 0))
      errors.push(`Act group "${groupName}": at least one of modify or create must be active.`);

    if (!Array.isArray(group.attributes) || group.attributes.length === 0)
      errors.push(`Act group "${groupName}": attributes must be a non-empty array.`);
    else if (groupName in skill.observe) {
      const observeAttributesNames = new Set(skill.observe[groupName].attributes.map(a => a.name));
      for (const attribute of group.attributes) {
        if (!observeAttributesNames.has(attribute.name))
          errors.push(`Act group "${groupName}", attribute "${attribute.name}": must match an attribute in observe group "${groupName}".`);
      }
    }
  }

  return errors;
}

export default function validate(skill, config) {
  const errors = [...validateSkill(skill), ...validateConfig(config)];
  if (errors.length > 0) {
    throw new Error("Invalid brain configuration:\n  - " + errors.join("\n  - "));
  }
}
