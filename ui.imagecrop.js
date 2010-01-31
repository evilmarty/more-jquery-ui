/*
 * jQuery UI - Imagecrop
 * http://github.com/evilmarty/more-jquery-ui
 * 
 * Credit goes to Kelly Hallman and her work on Jcrop for inspiring me 
 * to make this widget. Sorry Kelly but I wanted an even easier widget =p
 * Check out http://deepliquid.com/content/Jcrop.html
 *
 * Copyright (c) 2010 Marty Zalega
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
	function Rect(x1, y1, x2, y2, size) {
		if ($.isArray(x1)) {
			y1 = x1[1];
			x2 = x1[2];
			y2 = x1[3];
			x1 = x1[0];
		}
		else if (x2 == undefined || y2 == undefined) {
			x2 = x1;
			y2 = y1;
			x1 = y1 = 0;
		}
		
		this.x1(x1).y1(y1);
		if (size)
			this.width(x2).height(y2);
		else
			this.x2(x2).y2(y2);
		
		return this.normalise();
	}
	$.extend(Rect.prototype, {
		x1: function(v) {
			if (v === undefined) {
				return this._x1;
			}
			else {
				this._width = Math.abs(this._x2 - (this._x1 = parseInt(v)));
				return this;
			}
		},
		x2: function(v) {
			if (v === undefined) {
				return this._x2;
			}
			else {
				this._width = Math.abs((this._x2 = parseInt(v)) - this._x1);
				return this;
			}
		},
		y1: function(v) {
			if (v === undefined) {
				return this._y1;
			}
			else {
				this._height = Math.abs(this._y2 - (this._y1 = parseInt(v)));
				return this;
			}
		},
		y2: function(v) {
			if (v === undefined) {
				return this._y2;
			}
			else {
				this._height = Math.abs((this._y2 = parseInt(v)) - this._y1);
				return this;
			}
		},
		width: function(v) {
			if (v === undefined) {
				return this._width;
			}
			else {
				this._x2 = (this._width = parseInt(v)) + this._x1;
				return this;
			}
		},
		height: function(v) {
			if (v === undefined) {
				return this._height;
			}
			else {
				this._y2 = (this._height = v) + this._y1;
				return this;
			}
		},
		x: function(v) {
			if (v === undefined) {
				return this._x1;
			}
			else {
				var w = this.width();
				return this.x1(v).x2(v + w);
			}
		},
		y: function(v){
			if (v === undefined) {
				return this._y1;
			}
			else {
				var h = this.height();
				return this.y1(v).y2(v + h);
			}
		},
		resize: function(w, h, anchor) {
			switch (anchor) {
				default:
				case 'nw':
					this.width(w).height(h);
					break;
				case 'n':
					if (w != this._width) {
						var m = this.midway('x1', 'x2'), h = Math.ceil(w / 2.0);
						this.x1(m - h).x2(m + h);
					}
					this.height(h);
					break;
				case 'ne':
					this.x1(this._x2 - w).y2(this._y1 + h);
					break;
				case 'e':
					if (h != this._height) {
						var m = this.midway('y1', 'y2'), h = Math.ceil(w / 2.0);
						this.y1(m - h).y2(m + h);
					}
					this.x1(this._x2 - w);
					break;
				case 'se':
					this.x1(this._x2 - w).y1(this._y2 - h);
					break;
				case 's':
					if (w != this._width) {
						var m = this.midway('x1', 'x2'), h = Math.ceil(w / 2.0);
						this.x1(m - h).x2(m + h);
					}
					this.y1(this._y2 - h);
					break;
				case 'sw':
					this.width(w).y1(this._y2 - h);
					break;
				case 'w':
					if (h != this._height) {
						var m = this.midway('y1', 'y2'), h = Math.ceil(w / 2.0);
						this.y1(m - h).y2(m + h);
					}
					this.width(w);
					break;
			}
			
			return this;
		},
		normalise: function() {
			var x1 = this._x1, y1 = this._y1, x2 = this._x2, y2 = this._y2;
			if (x1 < x2) {
				this.x1(x1).x2(x2);
			}
			else {
				this.x1(x2).x2(x1);
			}
			if (y1 < y2) {
				this.y1(y1).y2(y2);
			}
			else {
				this.y1(y2).y2(y1);
			}
			return this;
		},
		intersect: function(x1, y1, x2, y2) {
			if (x1 instanceof Rect) {
				x1.normalise();
				return this.intersect(x1._x1, x1._y1, x1._x2, x1._y2);
			}
			else if (x2 === undefined || y2 === undefined) {
				return this.intersect(0, 0, x1, y1);
			}
			
			this.normalise();
			
			var rect = new Rect(0, 0, 0, 0);
			return rect.x1(Math.max(this._x1, x1)).y1(Math.max(this._y1, y1)).x2(Math.min(this._x2, x2)).y2(Math.min(this._y2, y2));
		},
		limit: function(w, h) {
			var rect = this.intersect(0, 0, w, h);			
			return this.x1(rect._x1).y1(rect._y1).x2(rect._x2).y2(rect._y2);
		},
		fit: function(x1, y1, x2, y2, anchor) {
			if (x1 instanceof Rect) {
				x1.normalise();
				return this.intersect(x1._x1, x1._y1, x1._x2, x1._y2, x2);
			}
			
			var width = this._width,
					height = this._height,
					ratio = height / width;
					
			// we do a 2-pass at adjusting the fit otherwise only works on the closest edge
			for (var i = 0; i < 2; ++i) {
				if ((anchor == 'nw' || anchor == 'n' || anchor == 'ne') && y2 < this._y2) {
					height = y2 - this._y1;
					width = Math.ceil(height / ratio);
				}
				else if ((anchor == 'nw' || anchor == 'n' || anchor == 'sw' || anchor == 's') && x2 < this._x2) {
					width = x2 - this._x1;
					height = Math.ceil(width * ratio);
				}
				else if ((anchor == 'n' || anchor == 'ne' || anchor == 's' || anchor == 'se') && x1 > this._x1) {
					width = this._x2 - x1;
					height = Math.ceil(width * ratio);
				}
				else if ((anchor == 'sw' || anchor == 's' || anchor == 'se') && y1 > this._y1) {
					height = this._y2 - y1;
					width = Math.ceil(height / ratio);
				}
				
				this.resize(width, height, anchor);
			}
			
			return this;
		},
		midway: function(p1, p2) {
			this.normalise();
			
			var v1 = this[p1](), v2 = this[p2]();
			return v1 + Math.ceil((v2 - v1) / 2.0);
		},
		clone: function() {
			return new Rect(this._x1, this._y1, this._x2, this._y2);
		},
		within: function(x1, y1, x2, y2) {
			if (x1 instanceof Rect) {
				x1.normalise();
				return this.within(x1._x1, x1._y1, x1._x2, x1._y2);
			}
			
			if (x2 === undefined || y2 === undefined) {
				return (this._x1 <= x1 && this._x2 >= x1) && (this._y1 <= y1 && this._y2 >= y1);
			}
			else {
				return this.within(x1, y1) && this.within(x2, y2);
			}
		},
		toProp: function() {
			var array = this.toArray();
			array.x = array[0];
			array.y = array[1];
			array.width = array[2];
			array.height = array[3];
			return array;
		},
		toArray: function() {
			return [this._x1, this._y1, this._width, this._height];
		}
 	});

	function oppositeAnchor(pos) {
		switch (pos) {
			case 'nw': return 'se';
			case 'n': return 's';
			case 'ne': return 'sw';
			case 'w': return 'e';
			case 'sw': return 'ne';
			case 's': return 'n';
			case 'se': return 'nw';
			case 'e': return 'w';
		}
	}
	
	function directionToAnchor(p1, p2) {
		var anchor = '';
		
		if (p1[1] < p2[1]) anchor = 'n';
		else anchor = 's';
		
		if (p1[0] < p2[0]) anchor = anchor + 'w';
		else anchor = anchor + 'e';
		
		return anchor;
	}
	
	$.widget('ui.imagecrop', {
		_init: function() {
			var self = this;
			
			// we only work with images
			if (!this.element.is('img')) return false;
			
			// if the image is not loaded, hijack the onload callback and re-run
			// the widget when the image is loaded.
			if (!this.element[0].complete) {
				var func = this.element[0].onload;
				this.element[0].onload = function() {
					if (func) func.apply(this, arguments);
					$(this).imagecrop(self.options);
				}
				return false;
			}
			
			var width = this._width(), 
					height = this._height(), 
					baseStyle = {position: 'absolute', height: height, width: width, left: 0, top: 0};
			
			this.element.wrap($('<div class="ui-imagecrop ui-widget" />').css({
				width: width, 
				height: height, 
				position: 'relative'
			}));
			
			this.background = $('<div class="ui-imagecrop-background" />').css($.extend({}, baseStyle, {
				zIndex: 2
			})).bind('mousedown', function(e) { return self._selectionStart(e); }).insertAfter(this.element);
			
			this.selection = $('<div class="ui-imagecrop-selection ui-widget-content" />').css($.extend({}, baseStyle, {
				backgroundImage: 'url(' + this.element[0].src + ')',
				zIndex: 3
			})).insertAfter(this.element);
			
			this.outline = $('<div class="ui-imagecrop-outline" />').css($.extend({}, baseStyle, {
				zIndex: 5
			})).bind('mousedown', function(e) { return self._moveStart(e); }).insertAfter(this.element);
			
			this.handles = {};
			$.each(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'], function(i, c) {
				self.handles[c] = $('<span class="ui-imagecrop-handle ui-imagecrop-handle-' + c + '" />')
					.css({position: 'absolute', zIndex: 6})
					.bind('mousedown', function(e) { return self._resizeStart(e, oppositeAnchor(c)); })
					.insertAfter(self.element);
			});
			
			this.overlay = $('<div />').css($.extend({}, baseStyle, {
				zIndex: 1000
			})).hide().insertAfter(this.element);
			
			this.oldStyles = {position: this.element.css('position'), zIndex: this.element.css('zIndex')};
			this.element.css({position: 'relative', zIndex: 0});
			
			if (this.options.selection)
				this._setData('selection', this.options.selection);
			else
				this._refresh();
			this._trigger('load', null);
		},
		_getData: function(key) {
			if (key == 'selection') {
				return this.options.selection.toProp();
			}
			
			return $.widget.prototype._getData.apply(this, arguments);
		},
		_setData: function(key, value) {
			if (key == 'selection') {
				this.select(value);
				this._refresh();
			}
			
			return $.widget.prototype._setData.apply(this, arguments);
		},
		_width: function() {
			return this.element[0].width;
		},
		_height: function() {
			return this.element[0].height;
		},
		_refresh: function() {
			var rect = this.options.selection, hide = !rect || (rect.width() == 0 && rect.height() == 0), self = this;
			
			this.selection[hide ? 'hide' : 'show']();
			this.outline[hide ? 'hide' : 'show']();
			
			$.each(['nw', 'ne', 'se', 'sw'], function(i, o) {
				self.handles[o][hide || !self.options.cornerHandles ? 'hide' : 'show']();
			});
			$.each(['n', 'e', 's', 'w'], function(i, o) {
				self.handles[o][hide || !self.options.sideHandles ? 'hide' : 'show']();
			});
			
			if (hide) return;
			
			this.selection.css('clip', 'rect(' + rect.y1() + 'px, ' + rect.x2() + 'px, ' + rect.y2() + 'px, ' + rect.x1() + 'px)');
			this.outline.css({
				left: rect.x1(),
				height: rect.height(),
				top: rect.y1(),
				width: rect.width()
			});
			
			var pos = {
				'nw': [rect.x1(), rect.y1()],
				'n': [rect.midway('x1', 'x2'), rect.y1()],
				'ne': [rect.x2(), rect.y1()],
				'e': [rect.x2(), rect.midway('y1', 'y2')],
				'se': [rect.x2(), rect.y2()],
				's': [rect.midway('x1', 'x2'), rect.y2()],
				'sw': [rect.x1(), rect.y2()],
				'w': [rect.x1(), rect.midway('y1', 'y2')]
			};
			
			$.each(this.handles, function(o, handle) {
				var x = pos[o][0] - Math.ceil(handle.width() / 2),
						y = pos[o][1] - Math.ceil(handle.height() / 2);
				handle.css({left: x, top: y});
			});
		},
		_startDrag: function(element) {
			var cursor = element.css('cursor');
			
			this.overlay.css('cursor', cursor).show();
		},
		_stopDrag: function() {
			this.overlay.hide();
		},
		_relativePosition: function(event) {
			var offset = this.element.offset(),
					left = event.pageX - offset.left,
					top = event.pageY - offset.top;
			return {left: left, top: top};
		},
		_selectionStart: function(event) {
			var self = this, position = this._relativePosition(event);
			
			if (!this.options.allowSelect || this.options.disabled) return;
			
			$(document)
				.unbind('mousemove.imagecrop')
				.bind('mousemove.imagecrop', function(e) { return self._selectionMove(e); })
				.bind('mouseup.imagecrop', function(e) { return self._selectionEnd(e); });
			
			this._startDrag(this.background);
			
			this.options.selection = new Rect(position.left, position.top, position.left, position.top);
			
			return false;
		},
		_selectionEnd: function(event) {
			if (this.options.disabled) return;
			
			$(document).unbind('mousemove.imagecrop').unbind('mouseup.imagecrop');
			this._stopDrag();
			this.select(this.options.selection);
		},
		_selectionMove: function(event) {
			if (this.options.disabled) return;
			
			var position = this._relativePosition(event),
					rect = this.options.selection;
			
			if (position.left > rect._x1) rect.x2(position.left);
			if (position.top > rect._y1) rect.y2(position.top);
			
			this._select(rect);
			
			return false;
		},
		_resizeStart: function(event, anchor) {
			var self = this;
			
			if (!this.options.allowResize || this.options.disabled) return;
			
			$(document)
				.unbind('mousemove.imagecrop')
				.bind('mousemove.imagecrop', function(e) { return self._resizeMove(e, anchor); })
				.bind('mouseup.imagecrop', function(e) { return self._resizeEnd(e, anchor); });
			
			this._startDrag($(event.target));
			
			return false;
		},
		_resizeEnd: function(event, anchor) {
			if (this.options.disabled) return;
			
			$(document).unbind('mousemove.imagecrop').unbind('mouseup.imagecrop');
			if (this.originalCursor) {
				document.style.cursor = this.originalCursor;
				this.originalCursor = undefined;
			}
			
			this._stopDrag();
			this.select(this.options.selection);
			
			return false;
		},
		_resizeMove: function(event, anchor) {
			if (this.options.disabled) return;
			
			var position = this._relativePosition(event),
					rect = this.options.selection;
			
			if ((anchor == 'nw' || anchor == 'n' || anchor == 'ne') && rect._y1 < position.top)
				rect.y2(position.top);
			if ((anchor == 'nw' || anchor == 'w' || anchor == 'sw') && rect._x1 < position.left)
				rect.x2(position.left);
			if ((anchor == 'sw' || anchor == 's' || anchor == 'se') && rect._y2 > position.top)
				rect.y1(position.top);
			if ((anchor == 'ne' || anchor == 'e' || anchor == 'se') && rect._x2 > position.left)
				rect.x1(position.left);
			
			this._select(rect, anchor);
			
			return false;
		},
		_moveStart: function(event) {
			var self = this, position = this._relativePosition(event);
			
			if (!this.options.allowMove || this.options.disabled) return;
			
			$(document)
				.unbind('mousemove.imagecrop')
				.bind('mousemove.imagecrop', function(e) { return self._moveMove(e); })
				.bind('mouseup.imagecrop', function(e) { return self._moveEnd(e); });
			
			this.dragPoint = {left: position.left - this.options.selection._x1, top: position.top - this.options.selection._y1};
			this._startDrag(this.outline);
			
			return false;
		},
		_moveEnd: function(event) {
			if (this.options.disabled) return;
			
			$(document).unbind('mousemove.imagecrop').unbind('mouseup.imagecrop');
			
			this.dragPoint = undefined;
			this._stopDrag();
			this.select(this.options.selection);
			
			return false;
		},
		_moveMove: function(event) {
			if (this.options.disabled) return;
		
			var position = this._relativePosition(event),
					dx = position.left - this.dragPoint.left,
					dy = position.top - this.dragPoint.top,
					width = this._width(),
					height = this._height(),
					rect = this.options.selection;
			
			rect.x(dx).y(dy);
			
			if (rect._x1 < 0) 				 	rect.x(0);
			else if (rect._x2 > width) 	rect.x(width - rect.width());
			if (rect._y1 < 0) 				 	rect.y(0);
			else if (rect._y2 > height) rect.y(height - rect.height());
			
			this._select(rect);
			
			return false;
		},
		_select: function(rect, anchor) {
			var maxWidth = this._width(), maxHeight = this._height();
			
			if (this.options.maxSize && this.options.maxSize[0] > 0 || this.options.maxSize[1] > 0) {
				var width = Math.min(rect._width, this.options.maxSize[0]),
						height = Math.min(rect._height, this.options.maxSize[1]);
				rect.resize(width, height, anchor);
			}
			
			if (this.options.minSize && this.options.minSize[0] > 0 || this.options.minSize[1] > 0) {
				var width = Math.max(rect._width, this.options.minSize[0]),
						height = Math.max(rect._height, this.options.minSize[1]);
				rect.resize(width, height, anchor);
			}
			
			if (this.options.aspectRatio != 0) {
				rect.resize(rect._width, Math.ceil(rect._width * this.options.aspectRatio), anchor).fit(0, 0, maxWidth, maxHeight, anchor);
			}
			else {
				rect.limit(maxWidth, maxHeight);
			}
			
			this.options.selection = rect;
			this._trigger('change', null, this.options.selection.toProp());
			this._refresh();
		},
		select: function(rect) {
			if (!(rect instanceof Rect)) rect = new Rect(rect, 0, 0, 0, true);
			this._select(rect);
			this._trigger('select', null, this.options.selection.toProp());
		},
		destroy: function() {
			this.background.remove();
			this.outline.remove();
			this.selection.remove();
			this.overlay.remove();
			
			$.each(this.handles, function(o, handle) {
				handle.remove();
			});
			
			this.element.css(this.oldStyles);
			
			this.element.parent('.ui-imagecrop').replaceWith(this.element);
			
			this.oldStyles = this.background = this.outline = this.selection = this.overlay = this.handles = this.container = undefined;

      $.widget.prototype.destroy.apply(this, arguments);
    },
	});
	
	$.extend($.ui.imagecrop, {
		defaults: {
			aspectRatio: 0,
			cornerHandles: true,
			sideHandles: true,
			
			maxSize: [0, 0],
			minSize: [0, 0],
			selection: null,
			
			allowSelect: true,
			allowResize: true,
			allowMove: true
		}
	})
})(jQuery);