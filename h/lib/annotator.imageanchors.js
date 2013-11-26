// Generated by CoffeeScript 1.6.3
/*
** Annotator 1.2.6-dev-8d2c275
** https://github.com/okfn/annotator/
**
** Copyright 2012 Aron Carroll, Rufus Pollock, and Nick Stenning.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/okfn/annotator/blob/master/LICENSE
**
** Built at: 2013-11-26 12:35:05Z
*/



/*
//
*/

// Generated by CoffeeScript 1.6.3
(function() {
  var ImageAnchor, ImageHighlight, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ImageHighlight = (function(_super) {
    __extends(ImageHighlight, _super);

    ImageHighlight.prototype.invisibleStyle = {
      outline: void 0,
      hi_outline: void 0,
      stroke: void 0,
      hi_stroke: void 0,
      fill: void 0,
      hi_fill: void 0
    };

    ImageHighlight.prototype.defaultStyle = {
      outline: '#000000',
      hi_outline: '#000000',
      stroke: '#ffffff',
      hi_stroke: '#fff000',
      fill: void 0,
      hi_fill: void 0
    };

    ImageHighlight.prototype.highlightStyle = {
      outline: '#000000',
      hi_outline: '#000000',
      stroke: '#fff000',
      hi_stroke: '#ff7f00',
      fill: void 0,
      hi_fill: void 0
    };

    ImageHighlight.Annotator = Annotator;

    ImageHighlight.$ = Annotator.$;

    function ImageHighlight(anchor, pageIndex, image, shape, geometry, annotorious) {
      this.annotorious = annotorious;
      ImageHighlight.__super__.constructor.call(this, anchor, pageIndex);
      this.$ = ImageHighlight.$;
      this.Annotator = ImageHighlight.Annotator;
      this.alwaysOnMode = false;
      this.active = false;
      this.annotoriousAnnotation = {
        text: this.annotation.text,
        id: this.annotation.id,
        temporaryID: this.annotation.temporaryImageID,
        source: image.src,
        highlight: this
      };
      if (this.annotation.temporaryImageID) {
        this.annotoriousAnnotation = this.annotorious.updateAnnotationAfterCreatingAnnotatorHighlight(this.annotoriousAnnotation);
      } else {
        this.annotorious.addAnnotationFromHighlight(this.annotoriousAnnotation, image, shape, geometry, this.defaultStyle);
      }
      this.oldID = this.annotation.id;
      this._image = this.annotorious.getImageForAnnotation(this.annotoriousAnnotation);
    }

    ImageHighlight.prototype.annotationUpdated = function() {
      this.annotoriousAnnotation.text = this.annotation.text;
      this.annotoriousAnnotation.id = this.annotation.id;
      if (this.oldID !== this.annotation.id) {
        this.annotoriousAnnotation.temporaryID = void 0;
      }
      return this.annotation.temporaryImageID = void 0;
    };

    ImageHighlight.prototype.removeFromDocument = function() {
      return this.annotorious.deleteAnnotation(this.annotoriousAnnotation);
    };

    ImageHighlight.prototype.isTemporary = function() {
      return this._temporary;
    };

    ImageHighlight.prototype.setTemporary = function(value) {
      this._temporary = value;
      if (value) {

      } else {

      }
    };

    ImageHighlight.prototype.setActive = function(value) {
      this.active = value;
      return this.annotorious.drawAnnotationHighlight(this.annotoriousAnnotation);
    };

    ImageHighlight.prototype._getDOMElements = function() {
      return this._image;
    };

    ImageHighlight.prototype.getTop = function() {
      return this.$(this._getDOMElements()).offset().top + this.annotoriousAnnotation.heatmapGeometry.y;
    };

    ImageHighlight.prototype.getHeight = function() {
      return this.annotoriousAnnotation.heatmapGeometry.h;
    };

    ImageHighlight.prototype.scrollTo = function() {
      return this.$(this._getDOMElements()).scrollintoview();
    };

    ImageHighlight.prototype.paddedScrollTo = function(direction) {
      return this.scrollTo();
    };

    return ImageHighlight;

  })(Annotator.Highlight);

  ImageAnchor = (function(_super) {
    __extends(ImageAnchor, _super);

    function ImageAnchor(annotator, annotation, target, startPage, endPage, quote, image, shape, geometry, annotorious) {
      this.image = image;
      this.shape = shape;
      this.geometry = geometry;
      this.annotorious = annotorious;
      ImageAnchor.__super__.constructor.call(this, annotator, annotation, target, startPage, endPage, quote);
    }

    ImageAnchor.prototype._createHighlight = function(page) {
      return new ImageHighlight(this, page, this.image, this.shape, this.geometry, this.annotorious);
    };

    return ImageAnchor;

  })(Annotator.Anchor);

  Annotator.Plugin.ImageAnchors = (function(_super) {
    __extends(ImageAnchors, _super);

    function ImageAnchors() {
      this.showAnnotations = __bind(this.showAnnotations, this);
      this.createImageAnchor = __bind(this.createImageAnchor, this);
      _ref = ImageAnchors.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    ImageAnchors.prototype.pluginInit = function() {
      var image, wrapper, _i, _len, _ref1,
        _this = this;
      this.highlightType = 'ImageHighlight';
      this.images = {};
      wrapper = this.annotator.wrapper[0];
      this.imagelist = $(wrapper).find('img');
      _ref1 = this.imagelist;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        image = _ref1[_i];
        this.images[image.src] = image;
      }
      this.annotorious = new Annotorious.ImagePlugin(wrapper, {}, this, this.imagelist);
      this.annotator.anchoringStrategies.push({
        name: "image",
        code: this.createImageAnchor
      });
      return this.annotator.on('beforeAnnotationCreated', function(annotation) {
        if (_this.pendingID) {
          annotation.temporaryImageID = _this.pendingID;
          return delete _this.pendingID;
        }
      });
    };

    ImageAnchors.prototype.createImageAnchor = function(annotation, target) {
      var image, selector;
      selector = this.annotator.findSelector(target.selector, "ShapeSelector");
      if (selector == null) {
        return;
      }
      image = this.images[selector.source];
      if (!image) {
        return null;
      }
      return new ImageAnchor(this.annotator, annotation, target, 0, 0, '', image, selector.shapeType, selector.geometry, this.annotorious);
    };

    ImageAnchors.prototype.annotate = function(source, shape, geometry, tempID) {
      var event;
      event = {
        targets: [
          {
            source: annotator.getHref(),
            selector: [
              {
                type: "ShapeSelector",
                source: source,
                shapeType: shape,
                geometry: geometry
              }
            ]
          }
        ]
      };
      this.pendingID = tempID;
      return this.annotator.onSuccessfulSelection(event, true);
    };

    ImageAnchors.prototype.showAnnotations = function(annotations) {
      if (!annotations.length) {
        return;
      }
      this.annotator.onAnchorMousedown(annotations, this.highlightType);
      return this.annotator.onAnchorClick(annotations, this.highlightType);
    };

    return ImageAnchors;

  })(Annotator.Plugin);

}).call(this);

//
//@ sourceMappingURL=annotator.imageanchors.map