import * as d3 from 'd3';
import Underscore from 'underscore';

import SvgUtils from '../SvgUtils/svgUtils.js';

import template from './template.svg';
import './style.scss';

let HANDLE_RADIUS = 5;
let OUTER_HANDLE_RADIUS = 10;

let DRAG_MODES = {
  INACTIVE: 'INACTIVE',
  RUBBER_BAND: 'RUBBER_BAND',
  MOVE_ANCHOR: 'MOVE_ANCHOR',
  TRANSLATE: 'TRANSLATE',
  ROTATE: 'ROTATE',
  SCALE: 'SCALE'
};

class Selection {
  constructor () {
    d3.select('#selectionOverlay').html(template);
    this.setupGlobalEventHandlers();
    this.setSelectionRoot(null);
  }

  setupGlobalEventHandlers () {
    this.drag = { mode: DRAG_MODES.INACTIVE };

    d3.select('#content')
      .on('mousedown', () => {
        if (!d3.event.shiftKey) {
          this.selectNone();
        }
        this.startDrag(DRAG_MODES.RUBBER_BAND);
        this.render();
      })
      .on('mousemove', () => {
        if (this.drag.mode !== DRAG_MODES.INACTIVE) {
          // All dragging interactions should hide the cursor once they've
          // started (some other visual element like the rubber band or selected
          // outlines will indicate what's going on... and we want the cursor
          // out of the way)
          d3.select('#container').classed('nocursor', true);
          this.drag.x = d3.mouse(this.drag.element.parentElement)[0];
          this.drag.y = d3.mouse(this.drag.element.parentElement)[1];
        }
        this.render();
      })
      .on('mouseup', () => { this.finishDrag(); });
  }

  startDrag (mode, element) {
    element = element || d3.event.target;
    let mouse = d3.mouse(element.parentElement);
    this.drag = {
      mode,
      element,
      x0: mouse[0],
      y0: mouse[1],
      x: mouse[0],
      y: mouse[1]
    };
  }

  finishDrag () {
    if (this.drag.mode === DRAG_MODES.RUBBER_BAND) {
      this.selectRubberBand();
    } else if (this.drag.mode === DRAG_MODES.TRANSLATE) {
      this.applyTranslation();
    } else if (this.drag.mode === DRAG_MODES.ROTATE) {
      this.applyRotation();
    } else if (this.drag.mode === DRAG_MODES.SCALE) {
      this.applyScale();
    } else if (this.drag.mode === DRAG_MODES.MOVE_ANCHOR) {
      this.moveAnchor();
    }
    this.drag = { mode: DRAG_MODES.INACTIVE };
    d3.select('#container').classed('nocursor', false);
    this.render();
  }

  selectNone () {
    this.setSelection([]);
  }

  setSelection (elements) {
    this.selectedElements = elements;
    this.selectedKeyElement = null;
    this.tempAnchorPoint = null;
  }

  toggleElementInSelection (element) {
    let index = this.selectedElements.indexOf(element);
    if (index === -1) {
      this.selectedElements.push(element);
      return true;
    } else {
      this.selectedElements.splice(index, 1);
      return false;
    }
  }

  selectRubberBand () {
    let contentSvg = d3.select('svg#content').node();
    let rubberBandRect = contentSvg.createSVGRect();
    let rubberBandAttrs = this.getRubberBandRect();
    rubberBandRect.x = rubberBandAttrs.x;
    rubberBandRect.y = rubberBandAttrs.y;
    rubberBandRect.width = rubberBandAttrs.width;
    rubberBandRect.height = rubberBandAttrs.height;
    let intersectingElements = this.d3selectables.nodes().filter((element) => {
      return contentSvg.checkIntersection(element, rubberBandRect);
    });
    this.setSelection(intersectingElements);
  }

  applyTranslation () {

  }

  applyRotation () {

  }

  applyScale () {

  }

  moveAnchor () {
    if (this.tempAnchorPoint) {
      /*
        We're moving the anchor for a list of elements; we don't want changes
        to temporary selections to be stored in the DOM. Just update the
        temporary anchor:
      */
      this.tempAnchorPoint.x += this.drag.x - this.drag.x0;
      this.tempAnchorPoint.y += this.drag.y - this.drag.y0;
    } else {
      /*
        Math for moving the anchor point for a single element:

        M = anchor movement transformation (what we got from dragging)
        B = pre-anchor transform (need to update)
        A = post-anchor transform (need to update)
        T = element's native transform

        B_1 = M * B_0
        A_1 = inv(B_1) * T
      */
      let element = this.selectedElements[0];
      let M = SvgUtils.getTranslationMatrix(
        (this.drag.x - this.drag.x0),
        (this.drag.y - this.drag.y0));
      let B_0 = SvgUtils.getPreAnchorMatrix(element);
      let T = SvgUtils.getMatrix(element);

      let B_1 = SvgUtils.multiplyMatrix(M, B_0);
      let A_1 = SvgUtils.multiplyMatrix(SvgUtils.invertMatrix(B_1), T);

      SvgUtils.setPreAnchorMatrix(element, B_1);
      SvgUtils.setPostAnchorMatrix(element, A_1);
    }
  }

  setSelectionRoot (d3el) {
    this.selectNone();
    if (!d3el) {
      d3el = d3.select('svg#content');
    }
    if (this.d3selectables) {
      this.d3selectables.on('mousedown', null);
      this.d3selectables.on('mouseup', null);
      this.d3selectables.on('dblclick', null);
    }
    this.d3root = d3el;
    // TODO: if we've set a non-group object as the root,
    // make the anchor points selectable
    this.d3selectables = d3.selectAll(this.d3root.node().children);

    let self = this;
    this.d3selectables.on('mousedown', function () {
      let startDragging = true;
      // Don't modify the selection if the user starts
      // with the option key down
      if (!d3.event.altKey) {
        if (d3.event.shiftKey) {
          startDragging = self.toggleElementInSelection(this);
        } else {
          if (self.selectedElements.indexOf(this) === -1) {
            // This wasn't previously selected; select only this element
            self.setSelection([this]);
          } else {
            // This was previously selected; the user has just indicated
            // it as the key element
            self.selectedKeyElement = this;
          }
        }
      }
      if (startDragging) {
        self.startDrag(DRAG_MODES.TRANSLATE);
      }
      d3.event.stopPropagation();
      self.render();
    }).on('mouseup', () => { this.finishDrag(); });
  }

  getHandles (boundingRect) {
    return [
      {
        x: boundingRect.left,
        y: boundingRect.top,
        offset_x: -OUTER_HANDLE_RADIUS,
        offset_y: -OUTER_HANDLE_RADIUS,
        class: 'nw'
      },
      {
        x: (boundingRect.left + boundingRect.right) / 2,
        y: boundingRect.top,
        offset_x: 0,
        offset_y: -OUTER_HANDLE_RADIUS,
        class: 'n'
      },
      {
        x: boundingRect.right,
        y: boundingRect.top,
        offset_x: OUTER_HANDLE_RADIUS,
        offset_y: -OUTER_HANDLE_RADIUS,
        class: 'ne'
      },
      {
        x: boundingRect.right,
        y: (boundingRect.top + boundingRect.bottom) / 2,
        offset_x: OUTER_HANDLE_RADIUS,
        offset_y: 0,
        class: 'e'
      },
      {
        x: boundingRect.right,
        y: boundingRect.bottom,
        offset_x: OUTER_HANDLE_RADIUS,
        offset_y: OUTER_HANDLE_RADIUS,
        class: 'se'
      },
      {
        x: (boundingRect.left + boundingRect.right) / 2,
        y: boundingRect.bottom,
        offset_x: 0,
        offset_y: OUTER_HANDLE_RADIUS,
        class: 's'
      },
      {
        x: boundingRect.left,
        y: boundingRect.bottom,
        offset_x: -OUTER_HANDLE_RADIUS,
        offset_y: OUTER_HANDLE_RADIUS,
        class: 'sw'
      },
      {
        x: boundingRect.left,
        y: (boundingRect.top + boundingRect.bottom) / 2,
        offset_x: -OUTER_HANDLE_RADIUS,
        offset_y: 0,
        class: 'w'
      }
    ];
  }

  renderHandles () {
    let handleLayer = d3.select('#handleLayer')
      .style('display', null);

    // Update the bounding rectangle
    let boundingRect = SvgUtils.getBoundingRect(this.selectedElements);
    handleLayer.select('#boundingRect')
      .attrs({
        x: boundingRect.left,
        y: boundingRect.top,
        width: boundingRect.width,
        height: boundingRect.height
      });

    // Draw the handles
    let handles = handleLayer.select('#handles').selectAll('.handle')
      .data(this.getHandles(boundingRect), d => d.class);
    handles.exit().remove();
    let handlesEnter = handles.enter().append('g')
      .attr('class', d => d.class + ' handle');
    handlesEnter.append('circle');
    handlesEnter.append('rect');
    handles = handlesEnter.merge(handles);

    handles.select('rect')
      .attr('x', d => d.x - HANDLE_RADIUS)
      .attr('y', d => d.y - HANDLE_RADIUS)
      .attr('width', HANDLE_RADIUS * 2)
      .attr('height', HANDLE_RADIUS * 2)
      .style('cursor', d => d.resizeCursor)
      .on('mousedown', d => {
        this.startDrag(DRAG_MODES.SCALE);
        d3.event.stopPropagation();
        this.render();
      });
    handles.select('circle')
      .attr('cx', d => d.x + d.offset_x)
      .attr('cy', d => d.y + d.offset_y)
      .attr('r', OUTER_HANDLE_RADIUS)
      .on('mousedown', d => {
        this.startDrag(DRAG_MODES.ROTATE);
        d3.event.stopPropagation();
        this.render();
      }).on('mouseup', () => { this.finishDrag(); });

    return boundingRect;
  }

  renderAnchorPoint () {
    let anchorTransform = null;
    if (this.tempAnchorPoint) {
      anchorTransform = 'translate(' + this.tempAnchorPoint.x + ',' + this.tempAnchorPoint.y + ')';
    } else {
      /*
        Math involved in computing the anchor point's position
        in global coordinates:

        P = consolidated ancestral transformations
        B = pre-anchor transform
      */
      let element = this.selectedElements[0];
      let P = SvgUtils.getAncestralMatrix(element);
      let B = SvgUtils.getPreAnchorMatrix(element);
      let anchor = SvgUtils.transformPoint(SvgUtils.multiplyMatrix(P, B), { x: 0, y: 0 });

      anchorTransform = 'translate(' + anchor.x + ',' + anchor.y + ')';
      this.tempAnchorPoint = null;
    }

    if (this.drag.mode === DRAG_MODES.MOVE_ANCHOR) {
      // tack on the current (temporary) drag interaction
      anchorTransform += ' translate(' + (this.drag.x - this.drag.x0) +
                                   ',' + (this.drag.y - this.drag.y0) + ')';
    }
    d3.select('#anchorPoint')
      .classed('dragging', this.drag.mode !== DRAG_MODES.INACTIVE)
      .attr('transform', anchorTransform)
      .on('mousedown', d => {
        this.startDrag(DRAG_MODES.MOVE_ANCHOR);
        d3.event.stopPropagation();
        this.render();
      }).on('mouseup', () => { this.finishDrag(); })
      .style('display', null);
  }

  getRubberBandRect () {
    // Pick the rect values (SVG doesn't allow negative width / height)
    let attrs = {};
    if (this.drag.x0 <= this.drag.x) {
      attrs.x = this.drag.x0;
      attrs.width = this.drag.x - this.drag.x0;
    } else {
      attrs.x = this.drag.x;
      attrs.width = this.drag.x0 - this.drag.x;
    }
    if (this.drag.y0 <= this.drag.y) {
      attrs.y = this.drag.y0;
      attrs.height = this.drag.y - this.drag.y0;
    } else {
      attrs.y = this.drag.y;
      attrs.height = this.drag.y0 - this.drag.y;
    }

    return attrs;
  }

  renderRubberBand () {
    d3.select('#rubberBand').attrs(this.getRubberBandRect())
      .style('display', null);
  }

  _render () {
    if (this.selectedElements.length === 0) {
      this.tempAnchorPoint = null;
      d3.selectAll('#handleLayer, #anchorPoint').style('display', 'none');
    } else {
      let boundingRect = this.renderHandles();

      if (this.selectedElements.length === 1) {
        this.tempAnchorPoint = null;
      } else {
        // There isn't an implicit coordinate system when multiple objects are
        // selected; instead start in the middle of the selection, and cache
        // the result until the selection is changed - then the anchor will be
        // lost
        if (!this.tempAnchorPoint) {
          this.tempAnchorPoint = {
            x: boundingRect.left + boundingRect.width / 2,
            y: boundingRect.top + boundingRect.height / 2
          };
        }
      }

      this.renderAnchorPoint();
    }

    if (this.drag.mode === DRAG_MODES.RUBBER_BAND) {
      this.renderRubberBand();
    } else {
      d3.select('#rubberBand').style('display', 'none');
    }
  }

  render () {
    // We want to throttle AND debounce, to show / control live updates, but
    // also make sure the last call makes it through
    Underscore.throttle(() => {
      this._render();
    }, 25)();
    Underscore.debounce(() => {
      this._render();
    }, 500);
  }
}

export default Selection;
