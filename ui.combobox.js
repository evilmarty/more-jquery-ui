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
      
      if (this.options.control) {
        this.control = $('<div class="ui-combobox-control"><span class="ui-icon ui-icon-triangle-1-s" /></div>')
          .click(function() { if (!self.options.disabled) self.toggle(); })
          .appendTo(this.container);
      }
      
      this.dataElement = $('<div class="ui-combobox-list ui-widget-content ui-corner-bottom"></div>')
        .css('position', 'absolute')
        .hide()
        .appendTo(this.container);
      
      if (this.element[0].nodeName == 'SELECT' && !this.options.overrideLocalData) {
        var data = {};
        $.each(this.element[0].options, function() {
          data[this.value] = this.text;
        });
        this.options.data = data;
        
        var attributes = {};
        $.each(this.element[0].attributes, function() {
          attributes[this.name] = this.value;
        })
        var input = $('<input />').attr(attributes).attr('type', 'text');
        this.element.replaceWith(input);
        this.element = input;
        this.wasSelect = true;
      }
      
      this.collapsed = true;
      this.selectedIndex = 0;
      this.highlightedIndex = -1;
      this.refresh = false;
      
      this.element
        .attr('autocomplete', 'off')
        .bind(this.options.event + '.combobox', function() { self._focus(); })
        .bind('blur.combobox', function() { self._blur(); })
        .bind('keydown.combobox', function(e) { self._keydown(e); })
        .bind('keyup.combobox', function(e) { self._keyup(e); });
    },
    destroy: function() {
      this.container.before(this.element).remove();
      this.element
        .removeAttr('autocomplete')
        .unbind(this.options.event + '.combobox')
        .unbind('blur.combobox')
        .unbind('keydown.combobox')
        .unbind('keyup.combobox');
        
      // TODO: rebuild old select-list
    },
    expand: function() {
      if (!this.collapsed) return;
      this._refresh();
      
      var offset = this.element.offset();
      offset.top = offset.top + this.element[this.options.height]();
      
      this.dataElement.css({left: offset.left, top: offset.top, width: this.element[this.options.width]()}).show(this.options.animated);
      this.collapsed = false;
      
      if (this.options.control) {
        this.control.children('.ui-icon').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-n');
      }
      
      this._select(-1);
    },
    collapse: function() {
      if (this.collapsed) return;
      
      this.dataElement.hide(this.options.animated);
      this.collapsed = true;
      
      if (this.options.control) {
        this.control.children('.ui-icon').removeClass('ui-icon-triangle-1-n').addClass('ui-icon-triangle-1-s');
      }
    },
    toggle: function() {
      this[this.collapsed ? 'expand' : 'collapse']();
    },
    enable: function() {
      this.element.removeAttr('disabled');
      this.container.removeClass('ui-state-disabled');
      $.widget.prototype.enable.apply(self, arguments);
    },
    disable: function() {
      this.element.attr('disabled', true);
      this.container.addClass('ui-state-disabled');
      this.collapse();
      $.widget.prototype.disable.apply(self, arguments);
    },
    _getData: function(key) {
      switch (key) {
        case 'selectedIndex':
          return this.selectedIndex;
      }
      $.widget.prototype._getData.apply(self, arguments);
    },
    _setData: function(key, value) {
      switch (key) {
        case 'data':
          this.options.data = value;
          if (!this.collapsed) {
            this._update();
          }
          else {
            this.refresh = true;
          }
          break;
        case 'selectedIndex':
          this._select(value);
          break;
      }
      $.widget.prototype._setData.apply(self, arguments);
    },
    _refresh: function() {
      if (this.refresh) {
        this._update();
        this.refresh = false;
      }
    },
    _focus: function() {
      this.container.addClass('ui-state-focus');
      this.expand();
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
      else if (e.keyCode == 40) {
        this.expand();
      }
      else if (e.keyCode == 9 || e.keyCode == 13) {
        return;
      }
    },
    _keyup: function(e) {
      switch (e.keyCode) {
        case 9:     // tab
        case 13:    // return
        case 27:    // esc
        case 37:    // left
        case 39:    // right
        case 38:    // up
        case 40:    // down
          return;
      }
      
      this._update();
    },
    _update: function() {
      var value = $.trim(this.element.val()), data = this.options.data;
      
      if ($.isFunction(data)) {
        data = data.call(this.element[0], value);
      }
      else if (typeof data == 'string') {
        this._ajax(data);
        data = {};
      }
      else {
        if ($.isArray(data)) {
          data = arrayToHash(data);
        }
        if (this.options.autoFilter) {
          data = this._filter(data, value);
        }
      }
      if ($.isArray(data)) {
        data = arrayToHash(data);
      }
      
      this._populate(data);
    },
    _populate: function(data) {
      if (data.length == 0) {
        if (!this.collapsed) this.collapse();
        return;
      }
      
      var list = $('<ul></ul>'), value = this.element.val(), length = 0, self = this, div = $('<div></div>');
      
      $.each(data, function(itemValue, originalText) {
        var text = $.trim(originalText);
        if (self.options.escapeHtml) {
          text = highlight(div.text(text).text(), value, self.options.textHighlighter);
        }
        $("<li></li>").html(text)
          .data('combobox:value', itemValue)
          .data('combobox:text', originalText)
          .mouseenter(function() { self._highlight(self._indexFor(this)); })
          .click(function() { self._select(self._indexFor(this)); })
          .appendTo(list);
      });
      this.dataElement.html('').append(list);
    },
    _ajax: function(url) {
      var value = this.element.val();
      
      if ($.ui.combobox.cache[value] === undefined) {
        var options = $.extend(this.options.ajaxOptions, {url: url}), self = this;
        options.data = options.data || {};
        options.data[this.options.paramName || this.element[0].name] = value;
        options.success = function(data, textStatus) {
          if ($.isArray(data)) {
            data = arrayToHash(data);
          }
          
          $.ui.combobox.cache[value] = data;
          
          self._populate(data);
          self.expand();
        }
        $.ajax(options);
      }
      else {
        this._populate($.ui.combobox.cache[value]);
        this.expand();
      }
    },
    _select: function(index) {
      var item = this.dataElement.find('ul > li').eq(index);
      if (this.element.val() == '') return;
      
      var text = item.data('combobox:text'), value = item.data('combobox:value');
      
      this.selectedIndex = index;
      this._trigger('select', null, {index: this._indexFor(item[0]), value: value, text: text});
      
      // this.collapse();
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
    _filter: function(data, value) {
      var startsWith = new RegExp('^' + value, 'i'), newList = {};
      
      $.each(data, function(key, text) {
        if (text.match(startsWith)) {
          newList[key] = text;
        }
      });
      return newList;
    },
    _indexFor: function(item) {
      return this.dataElement.find('ul > li').index(item);
    }
  });
  $.extend($.ui.combobox, {
    defaults: {
      animated: 'blind',
      ajaxOptions: {dataType: 'json'},
      autoFilter: true,
      control: true,
      event: 'focus',
      height: 'outerHeight',
      data: {},
      escapeHtml: true,
      overrideLocalData: false,
      paramName: null,
      select: function(event, ui) {
        $(this).val(ui.value);
      },
      textHighlighter: '<strong>$1</strong>',
      width: 'outerWidth'
    },
    cache: {}
  });
})(jQuery);