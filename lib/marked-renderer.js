/*!
 * marked-renderer.js
 * 
 * Copyright (c) 2014
 */

/* -----------------------------------------------------------------------------
 * dependencies
 * ---------------------------------------------------------------------------*/

// 3rd party
var _      = require('easy-utils');
var marked = require('marked');


/* -----------------------------------------------------------------------------
 * renderer
 * ---------------------------------------------------------------------------*/

/**
 * @public
 * @instance
 *
 * @desc Renderer instance which modifies headings to include anchor links
 * similiar to github.
 */
var renderer = new marked.Renderer();

renderer.heading = function (text, level) {
  var url = text.toLowerCase().replace(/[^\w]+/g, '-');

  var tmpl = '';
  tmpl += '<h{{l}}>';
  tmpl +=   '<a href="#{{url}}" class="anchor" name="{{url}}">';
  tmpl +=     '<span class="header-link"></span>';
  tmpl +=   '</a>';
  tmpl +=   '{{text}}';
  tmpl += '</h{{l}}>';

  return _.renderTmpl(tmpl, {
    l: level,
    url: url,
    text: text
  });
};


/* -----------------------------------------------------------------------------
 * export
 * ---------------------------------------------------------------------------*/

module.exports = renderer;