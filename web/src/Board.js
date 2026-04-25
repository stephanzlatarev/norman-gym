import React from "react";

let id = 1;

const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 300;

export default class Board extends React.Component {

  constructor() {
    super();

    this.state = {
      skill: null,
    };
  }

  render() {
    const { observation, expected, action } = this.props.simulation;
    const skill = this.props.skill;

    if (this.state.skill?.name !== skill.name) {
      this.state.skill = new Skill(skill);
    }

    const objects = [];
    const elementsObserved = [];
    const elementsExpected = [];
    const elementsAction = [];

    for (const [name, group] of Object.entries(this.state.skill.groups)) {
      const observedValues = observation[name] || [];
      const expectedValues = expected[name] || [];
      const updatedValues = action[name] || [];

      const modifiedCount = group.modify ? observedValues.length : 0;

      assertEquals(group, updatedValues.length, expectedValues.length, "updated objects");
      assertEquals(group, updatedValues.length, modifiedCount + group.create, "modified/created objects");

      // Process the observed and modified objects
      for (let index = 0; index < observedValues.length; index++) {
        const observedObject = resolveObject(group, {}, observedValues[index], "observe", objects, elementsObserved);

        if (group.modify) {
          resolveObject(group, { ...observedObject }, expectedValues[index], "act", objects, elementsExpected);
          resolveObject(group, { ...observedObject }, updatedValues[index], "act", objects, elementsAction);
        } else {
          resolveObject(group, {}, expectedValues[index], "act", objects, elementsExpected);
          resolveObject(group, {}, updatedValues[index], "act", objects, elementsAction);
        }
      }

      // Process the created objects
      for (let index = modifiedCount; index < updatedValues.length; index++) {
        resolveObject(group, {}, expectedValues[index], "act", objects, elementsExpected);
        resolveObject(group, {}, updatedValues[index], "act", objects, elementsAction);
      }

    }

    // Determine display box
    const box = new Bounds(this.state.skill.bounds);

    for (const one of objects) {
      box.addValueX(one.x);
      box.addValueY(one.y);
    }

    box.fixVewBox();

    // Create grid
    const grid = [];

    for (let x = box.minx; x <= box.maxx; x++) {
      grid.push(
        <line key={ "grid-x-" + x } x1={ x } y1={ box.miny } x2={ x } y2={ box.maxy } />
      );
    }

    for (let y = box.miny; y <= box.maxy; y++) {
      grid.push(
        <line key={ "grid-" + id++ } x1={ box.minx } y1={ y } x2={ box.maxx } y2={ y } />
      );
    }

    return (
      <svg width={ BOARD_WIDTH } height={ BOARD_HEIGHT } viewBox={ box.getViewBox() }>
        <g style={{ stroke: "gray", strokeWidth: 0.05 }}>{ grid }</g>
        <g style={{ opacity: 0.75 }}>{ elementsObserved }</g>
        <g style={{ opacity: 0.50 }}>{ elementsExpected }</g>
        <g>{ elementsAction }</g>
      </svg>
    );
  }
}

function assertEquals(group, actual, expected, entity) {
  if (actual !== expected) console.log("Ooops: Group", group, "has", actual, entity, "but expected", expected);
}

function resolveObject(group, object, values, property, objects, elements) {
  // Resolve object
  resolveValues(object, group, values, property);

  // Skip it if it cannot be displayed
  if (!Number.isFinite(object.x) && !Number.isFinite(object.y)) return;

  objects.push(object);
  elements.push(renderElement(object));

  // Resolve its trims
  if (group.trims) {
    for (const trim of group.trims) {
      const objectTrim = {
        x: object.x,
        y: object.y,
      };

      resolveValues(objectTrim, trim, values, property);

      elements.push(renderElement(objectTrim));
    }
  }

  return object;
}

function resolveValues(object, group, values, property) {
  for (const [key, resolve] of Object.entries(group)) {
    const value = resolveProperty(values, resolve, property);

    if (value !== undefined) object[key] = value;
  }
}

function resolveProperty(values, resolve, property) {
  if (resolve === undefined) return resolve;
  if (typeof(resolve) === "string") return resolve;

  const index = resolve[property];
  if (index >= 0) return values[index];
}

function renderElement(element) {
  element.x ||= 0;
  element.y ||= 0;
  element.width ||= 1;
  element.height ||= 1;
  element.radius ||= 0.5;
  element.color ||= "none";

  const shape = renderShape(element);
  const icon = renderIcon(element);

  return (
    <g key={ "object -" + id++ }>
      { shape }
      { icon }
    </g>
  );
}

function renderShape(element) {
  switch (element.shape) {
    case "arrow": return renderArrow(element);
    case "circle": return renderCircle(element);
    case "rectangle": return renderRectangle(element);
    case "square": return renderSquare(element);
  }
}

function renderCircle(element) {
  if (element.border) {
    return (
      <circle  cx={ element.x } cy={ element.y } r={ element.radius } fill="none" stroke={ element.border } strokeWidth="0.05" />
    );
  } else {
    return (
      <circle  cx={ element.x } cy={ element.y } r={ element.radius } fill={ element.color } />
    );
  }
}

function renderRectangle(element) {
  return (
    <rect x={ element.x } y={ element.y } width={ element.width } height={ element.height } fill={ element.color } />
  );
}

function renderSquare(element) {
  element.height = element.width;

  return renderRectangle(element);
}

function renderIcon(element) {
  const text = element.icon;
  if (!text) return;

  const fontSize = Math.min(element.width, element.height / text.length);

  return (
    <text
      key={ "text-" + id++ }
      x={ element.x + (element.width * 0.57) }
      y={ element.y + (element.height * 0.53) }
      fill="black"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: fontSize * 0.65, fontWeight: 700, pointerEvents: "none" }}
    >
      { text }
    </text>
  );
}

function renderArrow(element) {
  if (!element.headx && !element.heady) return null;

  return (
    <line x1={ element.x } y1={ element.y } x2={ element.headx } y2={ element.heady } stroke="black" strokeWidth="0.3" />
  );
}

class Skill {

  groups = {};
  attributes = {};
  bounds = new Bounds();

  constructor(skill) {
    for (const group in skill.display) {
      this.groups[group] = getGroupDisplay(skill, group);
    }

    for (const group of Object.values(this.groups)) {
      this.bounds.addAttributeX(group.x.attribute);
      this.bounds.addAttributeY(group.y.attribute);
    }
  }

  getGroup(group) {
    return this.groups[group];
  }

  getAttribute(group, name) {
    return this.groups[group][name];
  }

}

function getGroupDisplay(skill, groupName) {
  const groupDisplay = skill.display[groupName];
  const actInfo = skill.act?.[groupName];
  const group = {
    name: groupName,
    modify: actInfo ? (actInfo.modify !== false) : false,
    create: actInfo?.create || 0,
    shape: groupDisplay.shape,
    color: groupDisplay.color,
    x: getAttributeDisplay(skill, groupName, groupDisplay.x),
    y: getAttributeDisplay(skill, groupName, groupDisplay.y),
    radius: getAttributeDisplay(skill, groupName, groupDisplay.radius),
    trims: [],
  };

  if (groupDisplay.trims) {
    for (const trim of groupDisplay.trims) {
      group.trims.push({
        shape: trim.shape,
        color: trim.color,
        border: trim.border,
        headx: getAttributeDisplay(skill, groupName, trim.headx),
        heady: getAttributeDisplay(skill, groupName, trim.heady),
        radius: getAttributeDisplay(skill, groupName, trim.radius),
      });
    }
  }

  return group;
}

function getAttributeDisplay(skill, groupName, displayProperty) {
  const attributeName = displayProperty;
  const observeAttributes = skill.observe[groupName]?.attributes || [];
  const observeAttributesIndex = observeAttributes.findIndex(attribute => (attribute.name === attributeName));
  const actAttributes = skill.act[groupName]?.attributes || [];
  const actAttributesIndex = actAttributes.findIndex(attribute => (attribute.name === attributeName));

  return {
    attribute: observeAttributes[observeAttributesIndex],
    observe: observeAttributesIndex,
    act: actAttributesIndex,
  };
}

class Bounds {

  minx = +Infinity;
  maxx = -Infinity;
  miny = +Infinity;
  maxy = -Infinity;

  constructor(bounds) {
    if (bounds && (bounds.maxx - bounds.minx <= 50) && (bounds.maxy - bounds.miny <= 50)) {
      if (bounds.minx < this.minx) this.minx = bounds.minx;
      if (bounds.maxx > this.maxx) this.maxx = bounds.maxx;
      if (bounds.miny < this.miny) this.miny = bounds.miny;
      if (bounds.maxy > this.maxy) this.maxy = bounds.maxy;
    }
  }

  addValueX(value) {
    if (value < this.minx) this.minx = value;
    if (value > this.maxx) this.maxx = value;
  }

  addValueY(value) {
    if (value < this.miny) this.miny = value;
    if (value > this.maxy) this.maxy = value;
  }

  addAttributeX(attribute) {
    if (attribute.range) {
      this.addValueX(attribute.range[0]);
      this.addValueX(attribute.range[1]);
    } else if (attribute.options) {
      this.addValueX(0);
      this.addValueX(attribute.options.length - 1);
    }
  }

  addAttributeY(attribute) {
    if (attribute.range) {
      this.addValueY(attribute.range[0]);
      this.addValueY(attribute.range[1]);
    } else if (attribute.options) {
      this.addValueY(0);
      this.addValueY(attribute.options.length - 1);
    }
  }

  fixVewBox() {
    if (!Number.isFinite(this.minx)) this.minx = 0;
    if (!Number.isFinite(this.maxx)) this.maxx = 0;
    if (!Number.isFinite(this.miny)) this.miny = 0;
    if (!Number.isFinite(this.maxy)) this.maxy = 0;

    this.minx = Math.floor(this.minx);
    this.maxx = Math.ceil(this.maxx) + 1;
    this.miny = Math.floor(this.miny);
    this.maxy = Math.ceil(this.maxy) + 1;

    this.width = (this.maxx - this.minx);
    this.height = (this.maxy - this.miny);
  }

  getViewBox() {
    return `${ this.minx } ${ this.miny } ${ this.width } ${ this.height }`;
  }

}
