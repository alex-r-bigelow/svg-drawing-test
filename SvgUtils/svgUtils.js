import * as d3 from 'd3';
import '../node_modules/path-data-polyfill.js/path-data-polyfill.js';

const A_TO_F = ['a', 'b', 'c', 'd', 'e', 'f'];
const IDENTITY_MATRIX = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const DATA_RULER_NAMESPACE = 'https://alex-r-bigelow.github.io/#dataRuler';

function transformPoint (matrix, point) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

function multiplyMatrix (m0, m1) {
  return {
    a: m0.a * m1.a + m0.c * m1.b, // + m0.e * 0
    b: m0.b * m1.a + m0.d * m1.b, // + m0.f * 0
    c: m0.a * m1.c + m0.c * m1.d, // + m0.e * 0
    d: m0.b * m1.c + m0.d * m1.d, // + m0.f * 0
    e: m0.a * m1.e + m0.c * m1.f + m0.e, // * 1
    f: m0.b * m1.e + m0.d * m1.f + m0.f  // * 1
  };
}

function invertMatrix (m) {
  let det = m.a * m.d - m.c * m.b;
  let result = {
    a: m.d,
    b: -m.b,
    c: -m.c,
    d: m.a,
    e: m.c * m.f - m.e * m.d,
    f: m.e * m.b - m.a * m.f
  };
  Object.keys(result).forEach(k => {
    result[k] = result[k] / det;
  });
  return result;
}

function getTranslationMatrix (dx, dy) {
  return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy };
}

function getAncestralMatrix (element) {
  if (element.parentNode.tagName.toLowerCase() === 'svg') {
    return IDENTITY_MATRIX;
  }
  return multiplyMatrix(getAncestralMatrix(element.parentNode.parentNode), getMatrix(element.parentNode));
}

function getMatrix (element) {
  return element.transform ? element.transform.baseVal.consolidate().matrix : IDENTITY_MATRIX;
}

function constructMatrixSubString (matrix) {
  return A_TO_F.map(k => matrix[k]).join(', ');
}

function parseMatrixSubString (value) {
  if (!value) {
    return IDENTITY_MATRIX;
  }
  let values = value.split(', ');
  let matrix = {};
  A_TO_F.forEach((k, i) => {
    matrix[k] = parseFloat(values[i]);
  });
  return matrix;
}

function setMatrix (element, m) {
  d3.select(element).attr('transform', 'matrix(' + constructMatrixSubString(m) + ')');
}

function getPreAnchorMatrix (element) {
  return parseMatrixSubString(element.getAttributeNS(DATA_RULER_NAMESPACE, 'preAnchorMatrix'));
}

function setPreAnchorMatrix (element, matrix) {
  element.setAttributeNS(DATA_RULER_NAMESPACE, 'preAnchorMatrix', constructMatrixSubString(matrix));
}

function getPostAnchorMatrix (element) {
  return parseMatrixSubString(element.getAttributeNS(DATA_RULER_NAMESPACE, 'postAnchorMatrix'));
}

function setPostAnchorMatrix (element, matrix) {
  element.setAttributeNS(DATA_RULER_NAMESPACE, 'postAnchorMatrix', constructMatrixSubString(matrix));
}

function elementToRootMatrix (element) {
  return multiplyMatrix(getAncestralMatrix(element), getMatrix(element));
}

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
  let matrix = getMatrix(element);

  if (element instanceof Array) {
    points = element.reduce((acc, el) => acc.concat(getAllPoints(el)), []);
  } else if (element.children.length > 0) {
    points = Array.from(element.children)
      .reduce((acc, el) => acc.concat(getAllPoints(el)), []);
  } else if (tagName === 'rect') {
    points = getRectPoints(element);
  } else if (tagName === 'circle') {
    points = getCirclePoints(element);
  } else if (tagName === 'path') {
    points = getPathPoints(element);
  } else {
    // getBoundingClientRect() gets the boundary in global coordinates; we need
    // to invert the stack of transformations. TODO: deal with the case that the
    // root SVG element isn't positioned at 0,0 in the web page
    points = getCorners(element.getBoundingClientRect());
    matrix = invertMatrix(elementToRootMatrix(element));
  }

  points = points.map(point => transformPoint(matrix, point));

  return points;
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

function getCorners (bounds) {
  return [
    { x: bounds.left, y: bounds.top },
    { x: bounds.left, y: bounds.bottom },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom }
  ];
}

export default {
  IDENTITY_MATRIX,
  transformPoint,
  multiplyMatrix,
  invertMatrix,
  getTranslationMatrix,
  getAncestralMatrix,
  getMatrix,
  setMatrix,
  getPreAnchorMatrix,
  setPreAnchorMatrix,
  getPostAnchorMatrix,
  setPostAnchorMatrix,
  elementToRootMatrix,
  getBoundingRect
};
