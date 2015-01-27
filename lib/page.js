/*!
 * page.js
 * 
 * Copyright (c) 2014
 */

/* -----------------------------------------------------------------------------
 * dependencies
 * ---------------------------------------------------------------------------*/

// core
var fs = require('fs');
var path = require('path');

// 3rd party
var _        = require('easy-utils');
var marked   = require('marked');
var async    = require('async');
var mkdirp   = require('mkdirp');
var outliner = require('easy-outliner');

// lib
var renderer = require('./marked-renderer');


/* -----------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------------*/

/**
 * @public
 * @consturctor
 *
 * @desc Create a page by templating and compiling an array of files.
 *
 * @params {object} page - Page object.
 * @params {string} page.fileName - Filename to write contents to.
 * @params {array} page.sections - Array of filenames relative to opts.root.
 * @params {object} opts - Opts object.
 * @params {string} opts.dest - Destination path to write rendered contents to.
 * @params {string} opts.tmpl - Path to template used to render page.
 * @params {string} opts.root - Path to sections root. All section paths will be
 *   relative to this location.
 * @params {array} opts.sections - Array of fileNames. Compiled and templated
 *   sections will be added to data object passed to tmpl for page render.
 * @params {object} opts.data - Custom data passed to tmpl for page render.
 * @params {boolean} opts.compile - Wether or not to compile markdown sections.
 *   If your final output will be a markdown file, set this to false. An outline
 *   can not be created if this option is set to false.
 */
var Page = function (page, opts) {
  this.page = _.jsonClone(page || {});
  this.opts = _.jsonClone(opts || {});

  // copy over helpers (which are not cloned during jsonClone)
  if (opts && opts.helpers) {
    this.opts.helpers = _.extend({}, opts.helpers);
  }

  _.defaults(this.opts, {
    dest: './',
    data: {},
    sections: {},
    compile: true,
    root: './build/docs',
    outlineDepth: 3
  });

  _.bindAll(this, 'create', '_addData', '_addPkg', '_addSections',
    '_buildSection', '_getSection', '_templateSection', '_compileSection',
    '_addOutline', '_render', '_write');
};

/**
 * @public
 * @memberof Page
 *
 * @desc Write page to specified dest.
 *
 * @param {function} callback - Function to execute once file has been written.
 */
Page.prototype.create = function (callback) {
  async.waterfall([
    this._addData,
    this._render,
    this._write
  ], callback);
};

/**
 * @private
 * @memberof Page
 *
 * @desc Add `pkg`, `sections`, and `outline` to `opts.data`.
 *
 * @param {function} callback - Function to execute once all data has been added
 *   to `opts.data`.
 */
Page.prototype._addData = function (callback) {
  async.series([
    this._addPkg,
    this._addSections,
    this._addOutline
  ], function (err) {
    // no need to pass results on
    callback(err);
  });
};


/**
 * @private
 * @memberof Page
 *
 * @desc Read `package.json` and add resulting JSON to `opts.data` as `pkg`.
 *
 * @param {function} callback - Function to execute once `pkg` has been added
 *   to `opts.data`.
 */
Page.prototype._addPkg = function (callback) {
  _.readJsonFile('./package.json', function (err, data) {
    _.extend(this.opts.data, {
      pkg: data
    });

    callback(err);
  }.bind(this));
};

/**
 * @private
 * @memberof Page
 *
 * @desc Add built sections to `opts.data` as `sections`.
 *
 * @param {function} callback - Function to execute once `sections` prop has
 *   been added to `opts.data`.
 */
Page.prototype._addSections = function (callback) {
  async.concatSeries(this.page.sections, this._buildSection, function (err, sections) {
    if (!err) {
      this.opts.data.sections = sections;
    }
    
    callback(err);
  }.bind(this));
};

/**
 * @private
 * @memberof Page
 *
 * @desc Build individual section by running it through a series of
 *   transformations (get contents, template, compile).
 *
 * @param {string} section - Filepath/key of section.
 * @param {function} callback - Function to execute once section has run
 *   through transformations.
 */
Page.prototype._buildSection = function (section, callback) {
  // By default we only need to get the file
  var tasks = [async.apply(this._getSection, section)];

  if (_.hasExt(section, 'hbs')) {
    tasks.push(this._templateSection);
  }

  if (_.hasExt(section, 'md') && this.opts.compile) {
    tasks.push(this._compileSection);
  }

  async.waterfall(tasks, callback);
};

/**
 * @private
 * @memberof Page
 *
 * @desc Get section contents. Looks up first for existing section passed in
 *   `opts.sections` object. If no existing match is found the file will be read
 *   from disk using the key as the filepath relative to `opts.root`.
 *
 * @param {function} callback - Function to execute once section contents have
 *  been retrieved.
 */
Page.prototype._getSection = function (section, callback) {
  var existingSection = this.opts.sections[section];

  if (existingSection) {
    return process.nextTick(function () {
      callback(null, existingSection);
    });
  }

  var filePath = path.join(this.opts.root, section);
  _.readFile(filePath, callback);
};

/**
 * @private
 * @memberof Page
 *
 * @desc Template contents using `opts.data`.
 *
 * @param {function} callback - Function to execute once contents have been
 *   templated.
 */
Page.prototype._templateSection = function (section, callback) {
  process.nextTick(function () {
    callback(null, _.renderTmpl(section, this.opts.data, {
      partials: this.opts.partials,
      helpers: this.opts.helpers
    }));
  }.bind(this));
};

/**
 * @private
 * @memberof Page
 *
 * @desc Compile markdown contents.
 *
 * @param {function} callback - Function to execute once contents have been
 *   compiled.
 */
Page.prototype._compileSection = function (section, callback) {
  process.nextTick(function () {
    callback(null, marked(section, {
      renderer: renderer
    }));
  });
};

/**
 * @private
 * @memberof Page
 *
 * @desc Add document outline to `opts.data` as `outline`. *Note that currently
 *   only html content can be outlined. Markdown support may be added in the
 *   future (PRs welcome).
 *
 * @param {function} callback - Function to execute once `outline` prop has
 *   been added to `opts.data`.
 */
Page.prototype._addOutline = function (callback) {
  if (this.opts.compile) {
    var contents = this.opts.data.sections.join('');
    this.opts.data.outline = outliner.outline(contents, this.opts.outlineDepth);
  }

  process.nextTick(callback);
};

/**
 * @private
 * @memberof Page
 *
 * @desc Render `opts.tmpl` template using `opts.data`.
 *
 * @param {function} callback - Function to execute once contents have been
 *   templated.
 */
Page.prototype._render = function (callback) {
  var tmpl = this.page.tmpl || this.opts.tmpl;

  _.renderFile(tmpl, this.opts.data, {
    partials: this.opts.partials,
    helpers: this.opts.helpers
  }, callback);
};

/**
 * @private
 * @memberof Page
 *
 * @desc Write finale contents to `opts.dest` with filename specified in
 *   `page.fileName`.
 *
 * @param {function} callback - Function to execute once file has been written.
 */
Page.prototype._write = function (contents, callback) {
  mkdirp(this.opts.dest, function (err) {
    if (err) {
      return callback(err);
    }

    var filePath = path.join(this.opts.dest, this.page.fileName);
    fs.writeFile(filePath, contents, callback);
  }.bind(this));
};


/* -----------------------------------------------------------------------------
 * export
 * ---------------------------------------------------------------------------*/

module.exports = Page;