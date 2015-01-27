/*!
 * test/page.js
 * 
 * Copyright (c) 2014
 */

/* -----------------------------------------------------------------------------
 * dependencies
 * ---------------------------------------------------------------------------*/

// core
var fs = require('fs');

// 3rd party
var _      = require('easy-utils');
var assert = require('chai').assert;
var rimraf = require('rimraf');

// lib
var Page = require('../lib/page');


/* -----------------------------------------------------------------------------
 * reusable
 * ---------------------------------------------------------------------------*/

var sectionMix  = fs.readFileSync('./test/fixtures/build/docs/section-1.md.hbs', 'utf8');
var sectionMd   = fs.readFileSync('./test/fixtures/build/docs/section-2.md', 'utf8');
var sectionTmpl = fs.readFileSync('./test/fixtures/build/docs/section-3.hbs', 'utf8');

var testPage = {
  fileName: 'test.html',
  sections: [
    'section-1.md.hbs',
    'section-2.md',
    'section-3.hbs'
  ]
};


/* -----------------------------------------------------------------------------
 * test
 * ---------------------------------------------------------------------------*/

describe('page.js', function () {

  beforeEach(function () {
    process.chdir('./test/fixtures');
  });

  afterEach(function () {
    process.chdir('../../');
  });


  /* ---------------------------------------------------------------------------
   * _addPkgData()
   * -------------------------------------------------------------------------*/

  describe('_addPkgData()', function () {

    beforeEach(function () {
      this.page = new Page(testPage);
    });

    it('Should add `pkg` property to `opts.data`.', function (done) {
      this.page._addPkg(function (err) {
        assert.equal(this.page.opts.data.pkg.name, 'test');
        done();
      }.bind(this));
    });

    it('Should add `pkg` into existing `opts.data`.', function (done) {
      this.page.opts.data.existing = true;

      this.page._addPkg(function (err) {
        assert.isTrue(this.page.opts.data.existing);
        done();
      }.bind(this));
    });

  });


  /* ---------------------------------------------------------------------------
   * _templateSection()
   * -------------------------------------------------------------------------*/

  describe('_templateSection()', function () {

    beforeEach(function () {
      this.page = new Page(testPage, {
        data: { title: 'Title' }
      });
    });

    it('Should execute callback with rendered template.', function (done) {
      this.page._templateSection(sectionTmpl, function (err, contents) {
        assert.equal(contents, '<h1>Title</h1>');
        done();
      });
    });

  });


  /* ---------------------------------------------------------------------------
   * _compileSection()
   * -------------------------------------------------------------------------*/

  describe('_compileSection()', function () {

    beforeEach(function () {
      this.page = new Page(testPage);
    });

    it('Should execute callback with compiled markdown.', function (done) {
      this.page._compileSection(sectionMd, function (err, contents) {
        assert.equal(contents, '<h1><a href="#title" class="anchor" name="title"><span class="header-link"></span></a>Title</h1>');
        done();
      });
    });

  });



  /* ---------------------------------------------------------------------------
   * _getSection()
   * -------------------------------------------------------------------------*/

  describe('_getSection()', function () {

    beforeEach(function () {
      this.page = new Page(testPage, {
        sections: { 'existing': 'existing section contents' }
      });
    });

    it('Should execute callback with read file contents.', function (done) {
      this.page._getSection('section-1.md.hbs', function (err, contents) {
        assert.equal(contents, '# {{ title }}');
        done();
      });
    });

    it('Should execute callback with `opts.sections` contents.', function (done) {
      this.page._getSection('existing', function (err, contents) {
        assert.equal(contents, 'existing section contents');
        done();
      });
    });

  });


  /* ---------------------------------------------------------------------------
   * _buildSection()
   * -------------------------------------------------------------------------*/

  describe('_buildSection()', function () {

    beforeEach(function () {
      this.page = new Page(testPage, {
        data: { title: 'Title' }
      });
    });

    it('Should execute callback with templated contents.', function (done) {
      this.page._buildSection('section-3.hbs', function (err, contents) {
        assert.equal(contents, '<h1>Title</h1>');
        done();
      });
    });

    it('Should execute callback with compiled contents', function (done) {
      this.page._buildSection('section-2.md', function (err, contents) {
        assert.equal(contents, '<h1><a href="#title" class="anchor" name="title"><span class="header-link"></span></a>Title</h1>');
        done();
      });
    });

    it('Should execute callback with templated and compiled contents.', function (done) {
      this.page._buildSection('section-1.md.hbs', function (err, contents) {
        assert.equal(contents, '<h1><a href="#title" class="anchor" name="title"><span class="header-link"></span></a>Title</h1>');
        done();
      });
    });

  });


  /* ---------------------------------------------------------------------------
   * _addSections()
   * -------------------------------------------------------------------------*/

  describe('_addSections()', function () {

    beforeEach(function () {
      this.page = new Page(testPage, {
        data: { title: 'Title' }
      });
    });

    it('Should set `sections` property to `opts.data`.', function (done) {
      this.page._addSections(function (err) {
        assert.deepEqual(this.page.opts.data.sections, [
          '<h1><a href="#title" class="anchor" name="title"><span class="header-link"></span></a>Title</h1>',
          '<h1><a href="#title" class="anchor" name="title"><span class="header-link"></span></a>Title</h1>',
          '<h1>Title</h1>'
        ]);
        done();
      }.bind(this));
    });

  });


  /* ---------------------------------------------------------------------------
   * _addOutline()
   * -------------------------------------------------------------------------*/

  describe('_addOutline()', function () {

    beforeEach(function () {
      this.page = new Page(testPage);

      // outline requires existing sections
      this.page.opts.data.sections = [
        '<h1>H1 - 1</h1>',
        '<h2>H2 - 1</h2>',
        '<h1>H1 - 2</h1>'
      ];
    });

    it('Should add `outline` property to `opts.data`.', function (done) {
      this.page._addOutline(function (err) {
        var outline = this.page.opts.data.outline;
        assert.equal(outline[0].text, 'H1 - 1');
        assert.equal(outline[0].children[0].text, 'H2 - 1');
        assert.equal(outline[1].text, 'H1 - 2');

        done();
      }.bind(this));
    });

  });


  /* ---------------------------------------------------------------------------
   * _addData()
   * -------------------------------------------------------------------------*/

  describe('_addData()', function () {

    beforeEach(function () {
      this.page = new Page(testPage);
    });

    it('Should add `pkg`, `sections`, and `outline` properties to `opts.data`.', function (done) {
      this.page._addData(function (err) {
        assert.ok(this.page.opts.data.pkg);
        assert.ok(this.page.opts.data.sections);
        assert.ok(this.page.opts.data.outline);
        done();
      }.bind(this));
    });

  });


  /* ---------------------------------------------------------------------------
   * _render()
   * -------------------------------------------------------------------------*/

  describe('_render()', function () {

    beforeEach(function () {
      this.page = new Page(testPage, {
        tmpl: './build/page.hbs',
        helpers: {
          helper: function (prop) {
            return prop + '!';
          }
        }
      });

      this.page.opts.data.prop = 'value';
      this.page.opts.data.sections = ['<h1>1</h1>', '<h2>2</h2>', '<h3>3</h3>'];
    });

    it('Should execute callback with rendered contents.', function (done) {
      this.page._render(function (err, contents) {
        assert.equal(contents, '<h1>1</h1>\n<h2>2</h2>\n<h3>3</h3>\n');
        done();
      });
    });

    it('Should use page specified tmpl over options specified tmpl.', function (done) {
      this.page.page.tmpl = './build/page-custom.hbs';

      this.page._render(function (err, contents) {
        assert.equal(contents, 'Custom\n<h1>1</h1>\n<h2>2</h2>\n<h3>3</h3>\n');
        done();
      });
    });

    it('Should utilize specified helpers.', function (done) {
      this.page.page.tmpl = './build/page-helper.hbs';

      this.page._render(function (err, contents) {
        assert.equal(contents, 'value!');
        done();
      });
    });

  });


  /* ---------------------------------------------------------------------------
   * _write()
   * -------------------------------------------------------------------------*/

  describe('_write()', function () {

    beforeEach(function () {
      this.page = new Page(testPage);
    });

    it('Should write contents to `opts.dest`/`page.fileName`.', function (done) {
      this.page._write('<h1>Title</h1>', function (err) {
        var contents = fs.readFileSync('./test.html');
        assert.equal(contents, '<h1>Title</h1>');

        fs.unlinkSync('./test.html');
        done();
      });
    });

    it('Should write contents to non existent `opts.dest`.', function (done) {
      this.page.opts.dest = './docs';

      this.page._write('<h1>Title</h1>', function (err) {
        var contents = fs.readFileSync('./docs/test.html');
        assert.equal(contents, '<h1>Title</h1>');

        rimraf.sync('./docs');
        done();
      });
    });

  });


  /* ---------------------------------------------------------------------------
   * create()
   * -------------------------------------------------------------------------*/

  describe('create()', function () {

    beforeEach(function () {
      this.page = new Page(testPage, {
        data: { title: 'Title' },
        tmpl: './build/page.hbs'
      });
    });

    afterEach(function () {
      fs.unlinkSync('./test.html');
    });

    it('Should write rendered/compile contents to `opts.dest`/`page.fileName`.', function (done) {
      this.page.create(function (err) {
        var contents = fs.readFileSync('./test.html', 'utf8');

        var expected = '';
        expected += '<h1><a href="#title" class="anchor" name="title"><span class="header-link"></span></a>Title</h1>\n';
        expected += '<h1><a href="#title" class="anchor" name="title"><span class="header-link"></span></a>Title</h1>\n';
        expected += '<h1>Title</h1>\n';

        assert.equal(contents, expected);
        done();
      });
    });

  });

});