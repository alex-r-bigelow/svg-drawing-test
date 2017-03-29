import * as d3 from 'd3';
import '../node_modules/path-data-polyfill.js/path-data-polyfill.js';

const IDENTITY_MATRIX = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function getBoundingRect (element) {
  let boundingRect = {};
  getAllPoints(element).forEach(point => {
    boundingRect.left = boundingRect.left === undefined
      ? point.x : Math.min(boundingRect.left, point.x);
    boundingRect.top = boundingRect.top === undefined
      ? point.y : Math.min(boundingRect.top, point.y);
    boundingRect.right = boundingRect.right === undefined
      ? point.x : Math.max(boundingRect.right, point.x);
    boundingRect.bottom = boundingRect.bottom === undefined
      ? point.y : Math.max(boundingRect.bottom, point.y);
  });
  boundingRect.width = boundingRect.right - boundingRect.left;
  boundingRect.height = boundingRect.bottom - boundingRect.top;
  return boundingRect;
}

function getAllPoints (element) {
  let tagName = element.tagName ? element.tagName.toLowerCase() : null;
  let points;
  let matrix = element.transform
    ? element.transform.baseVal.consolidate().matrix : IDENTITY_MATRIX;

  if (element instanceof Array) {
    points = element.reduce((acc, el) => acc.concat(getAllPoints(el)), []);
  } else if (element.children.length > 0) {
    points = Array.from(element.children).reduce((acc, el) => acc.concat(getAllPoints(el)), []);
  } else if (tagName === 'rect') {
    points = getRectPoints(element);
  } else if (tagName === 'circle') {
    points = getCirclePoints(element);
  } else if (tagName === 'path') {
    points = getPathPoints(element);
  } else {
    // TODO: getBoundingClientRect() gets the boundary in
    // global coordinates; we need to invert the stack
    // of ancestral transformations
    points = getCorners(element.getBoundingClientRect());
    // matrix = ... something...
  }

  points = points.map(point => transformPoint(matrix, point));

  return points;
}

function getCorners (bounds) {
  return [
    { x: bounds.left, y: bounds.top },
    { x: bounds.left, y: bounds.bottom },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom }
  ];
}

function getRectPoints (element) {
  let d3el = d3.select(element);
  let x = parseInt(d3el.attr('x') || 0);
  let y = parseInt(d3el.attr('y') || 0);
  let width = parseInt(d3el.attr('width') || 0);
  let height = parseInt(d3el.attr('height') || 0);
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
}
function getCirclePoints (element) {
  let d3el = d3.select(element);
  let cx = parseInt(d3el.attr('cx') || 0);
  let cy = parseInt(d3el.attr('cy') || 0);
  let r = parseInt(d3el.attr('r') || 0);
  // For now, just return the bounding box
  return [
    { x: cx - r, y: cy - r },
    { x: cx - r, y: cy + r },
    { x: cx + r, y: cy - r },
    { x: cx + r, y: cy + r }
  ];
}
function getPathPoints (element) {
  // normalizing the path reduces it to only M, L, C, and Z segments
  let normalizedPath = element.getPathData({ normalize: true });
  let points = [];
  normalizedPath.forEach(command => {
    for (let i = 0; i < command.values.length; i += 2) {
      points.push({ x: command.values[i], y: command.values[i + 1] });
    }
  });
  return points;
}

function transformPoint (matrix, point) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

export default {
  getBoundingRect
};
