import * as d3 from 'd3';
import Underscore from 'underscore';

import SvgUtils from '../SvgUtils/svgUtils.js';

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
    this.render();
  }

  selectNone () {
    this.setSelection([]);
  }

  setSelection (elements) {
    this.selectedElements = elements;
    this.selectedKeyElement = null;
    this.cachedAnchor = null;
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
    // TODO: select or toggle everything that intersected with the
    // rubber band
  }

  applyTranslation () {

  }

  applyRotation () {

  }

  applyScale () {

  }

  moveAnchor () {
    if (this.cachedAnchor) {
      // We're moving the anchor for a list of elements; we don't want changes
      // to temporary selections to be stored in the DOM. Just update the
      // temporary anchor:
      this.cachedAnchor.x += this.drag.x - this.drag.x0;
      this.cachedAnchor.y += this.drag.y - this.drag.y0;
    } else {
      // The anchor's transform attribute will be automatically cleared, so we
      // don't have to worry about that. Instead, we want to apply the *opposite*
      // translation deeply (to native coordinates all down the tree, but leaving
      // descendants' transform tags intact), and apply the *dragged* translation
      // just to the selectedElements
      this.selectedElements.forEach(element => {
        SvgUtils.applyTranslation(element,
          -(this.drag.x - this.drag.x0),
          -(this.drag.y - this.drag.y0),
          true);
        SvgUtils.applyTranslation(element,
          (this.drag.x - this.drag.x0),
          (this.drag.y - this.drag.y0),
          false);
      });
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

  render () {
    Underscore.throttle(() => {
      let overlay = d3.select('svg#overlay');

      if (this.selectedElements.length === 0) {
        overlay.style('display', 'none');
      } else {
        overlay.style('display', null);

        // Update the bounding rectangle
        let boundingRect = SvgUtils.getBoundingRect(this.selectedElements);
        overlay.select('#boundingRect')
          .attrs({
            x: boundingRect.left,
            y: boundingRect.top,
            width: boundingRect.width,
            height: boundingRect.height
          });

        // Draw the handles
        let handles = overlay.selectAll('.handle')
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

        // Draw the anchor point
        let anchorTransform = null;
        if (this.selectedElements.length === 1) {
          // Put the anchor at the 0,0 coordinate of the selected element's
          // coordinate system; in a sense, this is how the anchor is saved for
          // each object
          if (this.selectedElements[0].transform) {
            let matrix = this.selectedElements[0].transform.baseVal.consolidate().matrix;
            let origin = SvgUtils.transformPoint(matrix, { x: 0, y: 0 });
            anchorTransform = 'translate(' + origin.x + ',' + origin.y + ')';
          } else {
            anchorTransform = '';
          }
          this.cachedAnchor = null;
        } else if (this.selectedElements.length > 1) {
          // There isn't an implicit coordinate system when multiple objects are
          // selected; instead start in the middle of the selection, and cache
          // the result until the selection is reset - then the anchor will be
          // lost
          if (!this.cachedAnchor) {
            this.cachedAnchor = {
              x: boundingRect.left + boundingRect.width / 2,
              y: boundingRect.top + boundingRect.height / 2
            };
          }
          anchorTransform = 'translate(' + this.cachedAnchor.x + ',' + this.cachedAnchor.y + ')';
        }

        if (this.drag.mode === DRAG_MODES.MOVE_ANCHOR) {
          // tack on the current (temporary) drag interaction
          anchorTransform += ' translate(' + (this.drag.x - this.drag.x0) +
                                       ',' + (this.drag.y - this.drag.y0) + ')';
        }
        overlay.select('#anchorPoint')
          .attr('transform', anchorTransform)
          .on('mousedown', d => {
            this.startDrag(DRAG_MODES.MOVE_ANCHOR);
            d3.event.stopPropagation();
            this.render();
          }).on('mouseup', () => { this.finishDrag(); });
      }
    }, 100)();
  }
}

export default Selection;
