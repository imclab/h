// Generated by CoffeeScript 1.6.3
/*
** Annotator 1.2.6-dev-518b934
** https://github.com/okfn/annotator/
**
** Copyright 2012 Aron Carroll, Rufus Pollock, and Nick Stenning.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/okfn/annotator/blob/master/LICENSE
**
** Built at: 2013-12-05 11:44:31Z
*/



/*
//
*/

// Generated by CoffeeScript 1.6.3
(function() {
  var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Annotator.Plugin.FuzzyTextAnchors = (function(_super) {
    __extends(FuzzyTextAnchors, _super);

    function FuzzyTextAnchors() {
      this.fuzzyMatching = __bind(this.fuzzyMatching, this);
      this.twoPhaseFuzzyMatching = __bind(this.twoPhaseFuzzyMatching, this);
      _ref = FuzzyTextAnchors.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    FuzzyTextAnchors.prototype.pluginInit = function() {
      var _this = this;
      this.$ = Annotator.$;
      if (!this.annotator.plugins.TextAnchors) {
        throw "The FuzzyTextAnchors Annotator plugin requires the TextAnchors plugin.";
      }
      this.textFinder = new DomTextMatcher(function() {
        return _this.annotator.domMapper.getCorpus();
      });
      this.annotator.anchoringStrategies.push({
        name: "two-phase fuzzy",
        code: this.twoPhaseFuzzyMatching
      });
      return this.annotator.anchoringStrategies.push({
        name: "one-phase fuzzy",
        code: this.fuzzyMatching
      });
    };

    FuzzyTextAnchors.prototype.twoPhaseFuzzyMatching = function(annotation, target) {
      var dfd, expectedEnd, expectedStart, match, options, posSelector, prefix, quote, quoteSelector, result, suffix;
      dfd = this.$.Deferred();
      if (!this.annotator.domMapper.getCorpus) {
        dfd.reject("can't get corpus of document");
        return dfd.promise();
      }
      quoteSelector = this.annotator.findSelector(target.selector, "TextQuoteSelector");
      if (!quoteSelector) {
        dfd.reject("no TextQuoteSelector found");
        return dfd.promise();
      }
      prefix = quoteSelector.prefix;
      suffix = quoteSelector.suffix;
      quote = quoteSelector.exact;
      if (!(prefix && suffix)) {
        dfd.reject("prefix and suffix is required");
        return dfd.promise();
      }
      posSelector = this.annotator.findSelector(target.selector, "TextPositionSelector");
      expectedStart = posSelector != null ? posSelector.start : void 0;
      expectedEnd = posSelector != null ? posSelector.end : void 0;
      options = {
        contextMatchDistance: this.annotator.domMapper.getCorpus().length * 2,
        contextMatchThreshold: 0.5,
        patternMatchThreshold: 0.5,
        flexContext: true
      };
      result = this.textFinder.searchFuzzyWithContext(prefix, suffix, quote, expectedStart, expectedEnd, false, options);
      if (!result.matches.length) {
        dfd.reject("fuzzy match found no result");
        return dfd.promise();
      }
      match = result.matches[0];
      dfd.resolve(new this.annotator.TextPositionAnchor(this.annotator, annotation, target, match.start, match.end, this.annotator.domMapper.getPageIndexForPos(match.start), this.annotator.domMapper.getPageIndexForPos(match.end), match.found, !match.exact ? match.comparison.diffHTML : void 0, !match.exact ? match.exactExceptCase : void 0));
      return dfd.promise();
    };

    FuzzyTextAnchors.prototype.fuzzyMatching = function(annotation, target) {
      var dfd, expectedStart, len, match, options, posSelector, quote, quoteSelector, result;
      dfd = this.$.Deferred();
      if (!this.annotator.domMapper.getCorpus) {
        dfd.reject("can't get corpus of the document");
        return dfd.promise();
      }
      quoteSelector = this.annotator.findSelector(target.selector, "TextQuoteSelector");
      if (!quoteSelector) {
        dfd.reject("no TextQuoteSelector found");
        return dfd.promise();
      }
      quote = quoteSelector.exact;
      if (!quote) {
        dfd.reject("quote is requored");
        return dfd.promise();
      }
      if (!(quote.length >= 32)) {
        dfd.reject("can't use this strategy for quotes this short");
        return dfd.promise();
      }
      posSelector = this.annotator.findSelector(target.selector, "TextPositionSelector");
      expectedStart = posSelector != null ? posSelector.start : void 0;
      len = this.annotator.domMapper.getCorpus().length;
      if (expectedStart == null) {
        expectedStart = Math.floor(len / 2);
      }
      options = {
        matchDistance: len * 2,
        withFuzzyComparison: true
      };
      result = this.textFinder.searchFuzzy(quote, expectedStart, false, options);
      if (!result.matches.length) {
        dfd.reject("fuzzy found no match");
        return dfd.promise();
      }
      match = result.matches[0];
      dfd.resolve(new this.annotator.TextPositionAnchor(this.annotator, annotation, target, match.start, match.end, this.annotator.domMapper.getPageIndexForPos(match.start), this.annotator.domMapper.getPageIndexForPos(match.end), match.found, !match.exact ? match.comparison.diffHTML : void 0, !match.exact ? match.exactExceptCase : void 0));
      return dfd.promise();
    };

    return FuzzyTextAnchors;

  })(Annotator.Plugin);

}).call(this);

//
//@ sourceMappingURL=annotator.fuzzytextanchors.map