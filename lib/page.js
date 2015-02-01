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
 * @params {array} page.sections - Array of filenames relative to opts.docs.
 * @params {object} opts - Opts object.
 * @param {string} opts.root - Root which all paths will be resolved
 *   relative to.
 * @params {string} opts.dest - Destination path to write rendered contents to.
 * @params {string} opts.pkg - Path to package.json file.
 * @params {string} opts.theme - Easydocs theme object containing
 *   `pageTmpl` prop.
 * @params {string} opts.docs - Path to sections docs. All section paths will be
 *   relative to this location.
 * @params {array} opts.contents - Map of contents to use. Section key will
 *   look for contents before attempting to read from `docs` directory.
 * @params {object} opts.data - Custom data passed to tmpl for page render.
 * @params {boolean} opts.compile - Wether or not to compile markdown sections.
 *   If your final output will be a markdown file, set this to false. An outline
 *   can not be created if this option is set to false.
 */
var Page = function (page, opts) {
  if (!opts || !opts.theme) {
    throw new Error('missing required opts.');
  }

  // clone, merge in defaults, standardize paths, etc..
  this.opts = this._buildOpts(opts);
  this.page = _.jsonClone(page || {});

  // page should have a reference to its name while templating.
  this.opts.data.pageName = page.pageName;

  // avoid ungly scoping issues.
  _.bindPrototypes(this);
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
 * @desc Return a new object which is the result of cloning specified options,
 * merging in defaults, and standardizing paths.
 *
 * @param {object} opts - Page opts.
 */
Page.prototype._buildOpts = function (options) {
  // jsonClone props to a new object in order to avoid changing passed opts.
  var opts = _.jsonClone(options);
  _.defaults(opts, {
    root     : process.cwd(),
    docs     : './build/docs',
    dest     : './',
    data     : {},
    contents : {},
    compile  : true,
    depth    : 3
  });

  // copy over helpers (which are not cloned during jsonClone)
  if (options.theme.helpers) {
    opts.theme.helpers = _.extend({}, options.theme.helpers);
  }

  // standardize required global paths
  opts.root = path.resolve(opts.root);
  opts.dest = path.resolve(opts.root, opts.dest);
  opts.docs = path.resolve(opts.root, opts.docs);

  return opts;
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
 *   `opts.contents` object. If no existing match is found the file will be read
 *   from disk using the key as the filepath relative to `opts.docs`.
 *
 * @param {function} callback - Function to execute once section contents have
 *  been retrieved.
 */
Page.prototype._getSection = function (section, callback) {
  var existingSection = this.opts.contents[section];

  if (existingSection) {
    return process.nextTick(function () {
      callback(null, existingSection);
    });
  }

  var filePath = path.resolve(this.opts.docs, section);
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
      partials: this.opts.theme.partials,
      helpers: this.opts.theme.helpers
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
    this.opts.data.outline = outliner.outline(contents, this.opts.depth);
  }

  process.nextTick(callback);
};

/**
 * @private
 * @memberof Page
 *
 * @desc Render `opts.theme.pageTmpl` template using `opts.data`.
 *
 * @param {function} callback - Function to execute once contents have been
 *   templated.
 */
Page.prototype._render = function (callback) {
  _.renderFile(this.opts.theme.pageTmpl, this.opts.data, {
    partials : this.opts.theme.partials,
    helpers  : this.opts.theme.helpers
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

    var filePath = path.resolve(this.opts.dest, this.page.fileName);
    fs.writeFile(filePath, contents, callback);
  }.bind(this));
};


/* -----------------------------------------------------------------------------
 * export
 * ---------------------------------------------------------------------------*/

module.exports = Page;