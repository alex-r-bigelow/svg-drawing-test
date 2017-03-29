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

    let d3body = d3.select('body');
    d3body
      .on('mousedown', () => {
        if (!d3.event.shiftKey) {
          this.selectNone();
        }
        this.startDrag(DRAG_MODES.RUBBER_BAND);
        this.render();
      })
      .on('mousemove', () => {
        this.drag.x = d3.event.x;
        this.drag.y = d3.event.y;
        this.render();
      })
      .on('mouseup', () => {
        if (this.drag.mode === DRAG_MODES.RUBBER_BAND) {
          this.selectRubberBand();
        } else if (this.drag.mode === DRAG_MODES.TRANSLATE) {
          this.applyTranslation();
        } else if (this.drag.mode === DRAG_MODES.ROTATE) {
          this.applyRotation();
        } else if (this.drag.mode === DRAG_MODES.SCALE) {
          this.applyScale();
        }
        this.drag = { mode: DRAG_MODES.INACTIVE };
        this.render();
      });
  }

  startDrag (mode) {
    this.drag = {
      mode,
      x0: d3.event.x,
      y0: d3.event.y,
      x: d3.event.x,
      y: d3.event.y
    };
  }

  selectNone () {
    this.selectedElements = [];
    this.selectedKeyElement = null;
  }

  selectRubberBand () {
    // TODO: select or toggle everything that intersected with the
    // rubber band
  }

  selectElement (element) {

  }

  applyTranslation () {

  }

  applyRotation () {

  }

  applyScale () {

  }

  setSelectionRoot (d3el) {
    if (!d3el) {
      d3el = d3.select('svg#content');
    }
    if (this.d3selectables) {
      this.d3selectables.on('mousedown', null);
      this.d3selectables.on('dblclick', null);
    }
    this.d3root = d3el;
    // TODO: if we've set a non-group object as the root,
    // make the anchor points selectable
    this.d3selectables = d3.selectAll(this.d3root.node().children);
    this.selectedElements = [];   // initially an empty selection
    this.selectedKeyElement = null;

    let self = this;
    this.d3selectables.on('mousedown', function (d) {
      let startDragging = true;
      // Don't modify the selection if the user starts
      // with the option key down
      if (!d3.event.altKey) {
        let index = self.selectedElements.indexOf(this);
        if (d3.event.shiftKey) {
          // Toggle this element in the selection
          if (index === -1) {
            self.selectedElements.push(this);
          } else {
            self.selectedElements.splice(index, 1);
            startDragging = false;
          }
        } else {
          if (index === -1) {
            // This wasn't previously selected; select only this element
            self.selectedElements = [this];
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
    });
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
          });

        // Draw the anchor point
        overlay.select('#anchorPoint')
          .on('mousedown', d => {
            this.startDrag(DRAG_MODES.MOVE_ANCHOR);
            d3.event.stopPropagation();
            this.render();
          });
      }
    }, 100)();
  }
}

export default Selection;
