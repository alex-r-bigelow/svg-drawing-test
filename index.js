import * as d3 from 'd3';
import jQuery from 'jquery';

import Selection from './Selection/selection';
import preferences from './preferences.json';

import './style.scss';

class Controller {
  constructor () {
    window.onload = () => { this.setup(); };
    window.onresize = () => { this.resize(); };

    this.preferences = preferences;
  }

  setup () {
    this.resize();
    this.selection = new Selection();
  }

  resize () {
    let bounds = d3.select('#container').node().getBoundingClientRect();
    let svgs = d3.selectAll('svg');
    svgs.attrs({
      width: bounds.width,
      height: bounds.height
    });
  }
}

window.controller = new Controller();

// debugging access to d3 and jQuery
window.d3 = d3;
window.jQuery = jQuery;
