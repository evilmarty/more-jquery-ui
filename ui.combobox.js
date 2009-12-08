/*
 * jQuery UI - Combobox
 * http://github.com/evilmarty/ui-combobox
 *
 * Copyright (c) 2009 Marty Zalega
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
(function($) {
  function arrayToHash(array) {
    var hash = {};
    $.each(array, function() {
      hash[this] = this;
    });
    return hash;
  }
  
  function regexpEscape(exp) {
    return exp.replace(/(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g, '\\$1');
  }
  
  function highlight(text, phrase, highlighter) {
    var re = new RegExp('(' + regexpEscape(phrase) + ')(?!(?:[^<]*?)(?:["\'])[^<>]*>)', 'i');
    return text.replace(re, highlighter);
  }
  
  $.widget('ui.combobox', {
    _init: function() {
      var self = this;
      
      this.element.wrap('<div class="ui-widget ui-combobox ui-state-default" tabindex="0"></div>');
      this.container = this.element.parent();
      
      if (this.element.is('[disabled]')) {
        this.container.addClass('ui-state-disabled');
      }
      
      this.control = $('<div class="ui-combobox-control"><span class="ui-icon ui-icon-triangle-1-s" /></div>')
        .click(function() { self.toggle(); })
        .appendTo(this.container);
      
      this.dataElement = $('<div class="ui-combobox-list ui-widget-content ui-corner-bottom"></div>')
        .css('position', 'absolute')
        .hide()
        .appendTo(this.container);
      
      if (this.element[0].nodeName == 'SELECT' && !this.options.overrideLocalData) {
        var data = {};
        $.each(this.element[0].options, function() {
          data[this.value] = this.text;
        });
        this._data(data);
        
        var attributes = {};
        $.each(this.element[0].attributes, function() {
          attributes[this.name] = this.value;
        })
        var input = $('<input />').attr(attributes).attr('type', 'text');
        this.element.replaceWith(input);
        this.element = input;
      }
      
      this.collapsed = true;
      this.selectedIndex = 0;
      this.highlightedIndex = -1;
      this.length = 0;
      this.shownLength = 0;
      
      this.element
        .attr('autocomplete', 'off')
        .bind(this.options.event, function() { self._focus(); })
        .bind('blur', function() { self._blur(); })
        .bind('keydown', function(e) { self._keydown(e); })
        .bind('keyup', function(e) { self._keyup(e); });
    },
    expand: function() {
      if (!this.collapsed || this._length == 0) return;
      
      var offset = this.element.offset();
      offset.top = offset.top + this.element[this.options.height]();
      
      this.dataElement.css({left: offset.left, top: offset.top, width: this.element[this.options.width]()}).show(this.options.animated);
      this.collapsed = false;
      this.control.children('.ui-icon').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-n');
      
      this._select(-1);
    },
    collapse: function() {
      if (this.collapsed) return;
      
      this.dataElement.hide(this.options.animated);
      this.collapsed = true;
      this.control.children('.ui-icon').removeClass('ui-icon-triangle-1-n').addClass('ui-icon-triangle-1-s');
    },
    toggle: function() {
      this[this.collapsed ? 'expand' : 'collapse']();
    },
    setData: function(key, value) {
      switch (key) {
        case 'data':
          this._data(value);
          break;
        case 'selectedIndex':
          this._select(value);
          break;
      }
    },
    _focus: function() {
      this.container.addClass('ui-state-focus');
      this.expand();
      this.element.focus();
    },
    _blur: function() {
      this.container.removeClass('ui-state-focus');
      this.collapse();
    },
    _keydown: function(e) {
      if (!this.collapsed) {
        switch (e.keyCode) {
          case 9:     // tab
          case 13:    // return
            this._select(this.highlightedIndex);
            e.preventDefault();
            e.stopPropagation();
          case 27:    // esc
            this.collapse();
          case 37:    // left
          case 39:    // right
            return;
          case 38:    // up
            this._prev();
            e.stopPropagation();
            return;
          case 40:    // down
            this._next();
            e.stopPropagation();
            return;
        }
      }
      else if (e.keyCode == 9 || e.keyCode == 13) {
        return;
      }
    },
    _keyup: function(e) {
      if (e.keyCode == 9 || e.keyCode == 13 || e.keyCode == 27) return;
      
      var value = this.element.val();
      if (this.options.escapeHtml) {
        this._textHighlight(value);
      }
      if (this.options.autoFilter) {
        this._filter(value);
      }
      if (this.options.suggest && e.keyCode != 38 && e.keyCode != 40) {
        this._suggest(value);
      }
    },
    _data: function(data) {
      var callback = null;
      if ($.isFunction(data)) {
        this.dataType = 'callback';
        callback = '_dataCallback';
      }
      else if (typeof value == 'string') {
        this.dataType = 'ajax';
        callback = '_dataAjax';
      }
      else {
        this.dataType = 'list';
        callback = '_dataList';
      }
      this[callback](data);
    },
    _dataList: function(data) {
      if ($.isArray(data)) {
        data = arrayToHash(data);
      }
      
      var list = $('<ul></ul>'), length = 0, self = this;
      $.each(data, function(k, v) {
        $("<li></li>")[self.options.escapeHtml ? 'text' : 'html']($.trim(v))
          .data('combobox:value', k)
          .data('combobox:index', length++)
          .mouseenter(function() { self._highlight($(this).data('combobox:index')); })
          .click(function() { self._select($(this).data('combobox:index')); self.collapse(); })
          .appendTo(list);
      });
      this.dataElement.html('').append(list);
      this._length = this.shownLength = length;
      this.data = data;
    },
    _dataCallback: function(callback) {
      var data = callback.call(this, this.element.val());
      this._dataList(data);
    },
    _dataAjax: function(url) {
      var options = $.extend(this.options.ajaxOptions, {url: url}), self = this;
      options.data[this.element[0].name] = this.element.val();
      options.success = function(data, textStatus) {
        self._dataList(data);
      }
      $.ajax(options);
      this._dataList(new Array());
    },
    _select: function(index) {
      var value = this.dataElement.find('ul > li').eq(index).data('combobox:value');
      this.element.val(value);
      this.selectedIndex = index;
      this._trigger('selected');
    },
    _highlight: function(index) {
      var query = this.dataElement.find('ul > li');
      query.eq(this.highlightedIndex).removeClass('ui-state-highlight');
      if (index >= 0) {
        query.eq(index).addClass('ui-state-highlight');
      }
      this.highlightedIndex = index;
    },
    _prev: function() {
      var index = this.highlightedIndex - 1;
      if (index < 0) {
        index = -1;
      }
      this._highlight(index);
    },
    _next: function() {
      var index = this.highlightedIndex + 1;
      if (index >= this._length) {
        index = this._length - 1;
      }
      this._highlight(index);
    },
    _textHighlight: function(value) {
      value = $.trim(value);
      var highlighter = this.options.textHighlighter;
      this.dataElement.find('ul > li').each(function() {
        var text = highlight($(this).text(), value, highlighter);
        $(this).html(text);
      });
    },
    _filter: function(value) {
      value = regexpEscape($.trim(value));
      var startsWith = new RegExp('^' + value, 'i'), 
          equals = new RegExp('^' + value + '$', 'i'), 
          match = false,
          count = 0;
      this.dataElement.find('ul > li').each(function() {
        var text = $(this).text(), m = text.match(startsWith);
        $(this)[m ? 'show' : 'hide']();
        if (text.match(equals)) match = true;
        if (m) ++count;
      });
      if ((count == 0 || (count == 1 && this.selectedIndex == this.highlightedIndex)) && !this.collapsed) {
        this.collapse();
      }
      else if ((count > 0 || count == 1 && (this.selectedIndex != this.highlightedIndex || this.highlightedIndex == -1)) && this.collapsed) {
        this.expand();
      }
      this.shownLength = count;
    },
    _suggest: function(value) {
      value = $.trim(value);
      var startsWith = new RegExp('^' + regexpEscape(value), 'i'),
          result = this.dataElement.find('ul > li:visible').filter(function() {
            return $(this).text().match(startsWith);
          }).eq(0);
      if (result.length) {
        this._highlight(result.data('combobox:index'));
      }
    }
  });
  $.extend($.ui.combobox, {
    defaults: {
      animated: 'blind',
      ajaxOptions: {},
      autoFilter: true,
      event: 'focus',
      height: 'outerHeight',
      data: [],
      escapeHtml: true,
      overrideLocalData: false,
      suggest: true,
      textHighlighter: '<strong>$1</strong>',
      width: 'outerWidth'
    }
  });
})(jQuery);