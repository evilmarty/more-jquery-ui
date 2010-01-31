/*
 * jQuery UI - Upload
 * http://github.com/evilmarty/more-jquery-ui
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
	$.support.fileApi = window.FileList && window.File && window.FileReader;
	
	var imageMimeTypes = ['image/jpeg', 'image/pjpeg', 'image/bmp', 'image/x-windows-bmp', 'image/gif', 'image/png'];
	
	// Just a little helper method for binding events to objects. Kudos goes to http://prototypejs.org
	if (Function.prototype.bindAsEventListener === undefined) {
		Function.prototype.bindAsEventListener = function(obj) {
			var self = this;
			return function() { return self.apply(obj, arguments);	}
		}
	}
	
	function bytesToSize(bytes, precision) {  
		var kilobyte = 1024;
		var megabyte = kilobyte * 1024;
		var gigabyte = megabyte * 1024;
		var terabyte = gigabyte * 1024;

		if ((bytes >= 0) && (bytes < kilobyte)) {
			return bytes + ' B';
		}
		else if ((bytes >= kilobyte) && (bytes < megabyte)) {
			return (bytes / kilobyte).toFixed(precision) + ' KB';
		}
		else if ((bytes >= megabyte) && (bytes < gigabyte)) {
			return (bytes / megabyte).toFixed(precision) + ' MB';
		}
		else if ((bytes >= gigabyte) && (bytes < terabyte)) {
		  return (bytes / gigabyte).toFixed(precision) + ' GB';
		}
		else if (bytes >= terabyte) {
		  return (bytes / terabyte).toFixed(precision) + ' TB';
		}
		else {
		  return bytes + ' B';
		}
	}
	
	function resizeImage(image, maxWidth, maxHeight, callback) {
		var canvas = document.createElement('canvas'), width = image.width, height = image.height;
		
		if (image.width > maxWidth || image.height > maxHeight) {
			if (image.width > image.height) {
				width = maxWidth;
				height = (image.height / image.width) * maxWidth;
			}
			else {
				height = maxHeight;
				width = (image.width / image.height) * maxHeight;
			}
		}
		
		canvas.width = width;
		canvas.height = height;
		
		var ctx = canvas.getContext('2d');
		if (ctx.mozImageSmoothingEnabled) ctx.mozImageSmoothingEnabled = true;
		
		ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
		
		var newImage = new Image();
		newImage.onload = callback;
		newImage.src = canvas.toDataURL();
		
		return newImage;
	}
	
	function parseDimension(d) {
		var width = null, height = null;
		try {
			if (typeof d == 'string') {
				d = d.split('x');
			}
			if ($.isArray(d)) {
				width = d[0];
				height = d[1];
			}
			else if (d.width || d.height) {
				width = d.width;
				height = d.height;
			}
			width = parseInt(width);
			height = parseInt(height);
			return {width: width, height: height, 0: width, 1: height};
		}
		catch (e) {
			return null;
		}
	}
	
	$.widget('ui.multiupload', {
		_init: function() {
			if (!$.support.fileApi) return false;
			
			this.element.addClass('ui-multiupload ui-widget').html('');
			this.element.bind('drop.multiupload', this._drop.bindAsEventListener(this));
			this.element.bind('dragover.multiupload', this._dragover.bindAsEventListener(this));
			this.element.bind('dragenter.multiupload', this._dragenter.bindAsEventListener(this));
			this.element.bind('dragleave.multiupload', this._dragleave.bindAsEventListener(this));
			
			this.progressbar = $('<div />').progressbar();
			
			this.cancelButton = $('<a href="#" class="ui-multiupload-cancel ui-state-disabled"><span class="ui-icon ui-icon-trash">cancel</span></a>').appendTo(this.element).click(function(e) {
				this.cancel();
				return false;
			}.bindAsEventListener(this));
			
			this.element.append($('<div class="ui-multiupload-status ui-widget-header" />').append(this.progressbar).append(this.cancelButton).hide());
			
			this.input = $('<input type="file" multiple="true" />').change(this._change.bindAsEventListener(this));
			
			this.clearButton = $('<a href="#" class="ui-multiupload-clear ui-state-disabled"><span class="ui-icon ui-icon-trash">clear</span></a>').click(function(e) {
				if (this.files.length) this.clear();
				return false;
			}.bindAsEventListener(this));
			
			this.uploadButton = $('<a href="#" class="ui-multiupload-upload ui-state-disabled"><span class="ui-icon ui-transferthick-e-w">upload</span></a>').click(function(e) {
				if (this.files.length) this.upload();
				return false;
			}.bindAsEventListener(this));
			
			this.element.append($('<div class="ui-multiupload-input ui-widget-header" />').append(this.input).append(this.uploadButton).append(this.clearButton));
			
			this.container = $('<div class="ui-multiupload-files ui-widget-content" />').appendTo(this.element);
			
			this.files = new Array();
			
			if (this.options.imagesOnly) this.options.accepts = imageMimeTypes;
			if (typeof this.options.accepts == 'string') {
				this.options.accepts = this.options.accepts.split('/[\s,]+/');
			}
			
			this._cleanup();
		},
		_isImage: function(file) {
			return $.inArray(file.fileMime, imageMimeTypes);
		},
		_thumbnail: function(file) {
			var thumb = new Image(), reader = new FileReader(), size = parseDimension(this.options.thumbnails);
			thumb.file = file;
			thumb.className = 'ui-state-loading';
			
			reader.onloadend = (function(img) { return function(e) {
				if (size) {
					img.onload = function() {
						resizeImage(img, size.width, size.height, function() {
							img.src = this.src;
						});
					}
				}
				img.src = e.target.result;
				img.className = '';
			}; })(thumb);
			reader.readAsDataURL(file);
			
			return thumb;
		},
		_change: function(event) {
			var files = this.input[0].files;
			this.files = new Array();
			this.container.children('.ui-multiupload-file').remove();
			
			this._add(files);
			
			event.preventDefault();
		},
		_drop: function(event) {
			var files = event.originalEvent.dataTransfer.files;
			this._add(files);
			
			event.preventDefault();
		},
		_dragover: function(event) {
			event.preventDefault();
		},
		_dragenter: function(event) {
			var dt = event.originalEvent.dataTransfer;
			
			if (this.process || !dt.types.contains('application/x-moz-file')) {
				dt.dropEffect = 'none';
				this.element.addClass('ui-state-deny');
			}
			else {
				dt.dropEffect = 'link';
				this.element.addClass('ui-state-accept').attr('dragenter', true);
			}
			event.preventDefault();
		},
		_dragleave: function(event) {
			this.element.removeClass('ui-state-accept ui-state-deny').removeAttr('dragenter');
			event.preventDefault();
		},
		_accept: function(file) {
			return $.inArray(file.type, this.options.accepts) != -1;
		},
		_ready: function() {
			return this.files.length > 0 && !this.process;
		},
		_refresh: function() {
			var disabled = !this._ready();
			this.clearButton[disabled ? 'addClass' : 'removeClass']('ui-state-disabled');
			this.uploadButton[disabled ? 'addClass' : 'removeClass']('ui-state-disabled');
			this.container[disabled ? 'hide' : 'show']();
		},
		_index: function(i) {
			return this.container.children('.ui-multiupload-file').eq(i);
		},
		_finalise: function() {
			this._cleanup();
			this.clear();
			this._trigger('complete', null);
		},
		_cleanup: function() {
			if (this.process && this.process.readyState !== 4) this.process.abort();
			this.process = undefined;
			
			this.input.removeAttr('disabled');
			
			$('.ui-multiupload-input', this.element).show();
			$('.ui-multiupload-status', this.element).hide();
			
			this._refresh();
		},
		_add: function(file) {
			var self = this;
			
			// don't allow adding files when uploading
			if (this.process) return;
			
			if (file instanceof FileList) {
				return $.each(file, function(i, f) { self._add(f); });
			}
			
			if (!this._accept(file)) return;
			
			var element = $('<div class="ui-multiupload-file" />'),
				remove = $('<a href="#" class="ui-multiupload-remove"><span class="ui-icon ui-icon-circle-minus">remove</span></a>').click(function() {
					var index = self.container.children('.ui-multiupload-file').index(element[0]);
					self.remove(index);
					return false;
				}),
				filename = $('<span class="ui-multiupload-filename" />').text(file.fileName),
				filesize = $('<span class="ui-multiupload-filesize" />').text(bytesToSize(file.fileSize, 0));
			if (this.options.thumbnails && this._isImage(file)) {
				element
					.append(this._thumbnail(file))
					.append($('<div />').append(remove).append(filename).append(filesize))
					.addClass('ui-multiupload-thumbnail');
			}
			else {
				element.append(remove).append(filename).append(filesize);
			}
			this.container.append(element);
			
			this.files.push(file);
			element.show(this.options.effects.add);
			
			this._refresh();
			
			this._trigger('added', null, {file: file, index: this.files.length - 1});
		},
		remove: function(index) {
			var self = this, file = this.files[index];
			
			// don't allow removing files when uploading
			if (this.process) return;
			
			this.files = $.grep(this.files, function(f, i) { return index != i; });
			this._index(index).hide(this.options.effects.remove)
				.queue(function() { self._refresh(); })
				.queue(function() { $(this).remove(); });
			
			this._trigger('removed', null, {file: file, index: index});
		},
		clear: function() {
			// don't allow removing files when uploading
			if (this.process) return;
			
			this.files = new Array();
			this.container
				.stop(false)
				.hide(this.options.effects.removeAll)
				.queue(function() {
					this.container.children('.ui-multiupload-file').remove();
					this._refresh(); 
				}.bindAsEventListener(this));
		},
		cancel: function() {
			this._cleanup();
		},
		upload: function() {
			if (!this._ready()) return;
			
			var queue = new Array(), 
					url = this.options.url, 
					self = this, 
					total = 0, 
					transfered = 0;
			
			this.progressbar.progressbar('value', 0);
			// a precaution so no external code tries to allow the use to select files to upload. I know, paranoid much.
			this.input.attr('disabled', true);
			
			$('.ui-multiupload-input', this.element[0]).hide();
			$('.ui-multiupload-status', this.element[0]).show();
			
			function progress(v, t) {
				var p = Math.round((v / t) * 100);
				self.progressbar.progressbar('value', p);
			}
			
			function upload(file, index) {
				self.process = $.ajax({
					url: url,
					type: 'POST',
					beforeSend: function(xhr) {
						xhr.upload.addEventListener('progress', function(e) {
							if (!e.lengthComputable) return;
							progress(transfered + e.loaded, total);
						}, false);
						
						xhr.setRequestHeader('Content-Type', file.type);
						xhr.setRequestHeader('Content-Disposition', 'form-data; filename="' + file.fileName + '"');
						
						
						xhr.sendAsBinary(file.getAsBinary());
					},
					complete: function(xhr, textStatus) {
						var element = self._index(index).removeClass('ui-multiupload-loading');
						if (xhr.status == 200) {
							element.addClass('ui-multiupload-complete');
							transfered = transfered + file.fileSize;
							
							progress(transfered, total);
							
							var next = queue.pop();
							next ? next() : self._finalise();
						}
						else {
							element.addClass('ui-multiupload-error');
							self.cancel();
						}
					}
				});
			}
			
			$.each(this.files, function(index, file) { 
				total = total + file.fileSize;
				queue.push(function() { upload(file, index); });
			});
			
			var first = queue.pop();
			first();
		}
	});
	
	$.extend($.ui.multiupload, {
		defaults: {
			accepts: null,
			complete: function() {
				$(this).multiupload('clear');
			},
			effects: {
				add: 'slideDown',
				remove: 'slideUp',
				removeAll: 'blindUp'
			},
			imagesOnly: false,
			thumbnails: true,
			url: document.location
		}
	});
})(jQuery);