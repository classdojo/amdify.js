var structr = require("structr"),
_ = require("underscore"),
asyngleton = require("asyngleton"),
fs = require("fs"),
outcome = require("outcome");

var Dependency = structr({

  /**
   */

  "__construct": function(data) {
    _.extend(this, data);
  },

  /**
   */

  "content": function(value) {
    if(arguments.length) this._content = value;
    if(this._content == null) {
      this._content = fs.readFileSync(this.path, "utf8");

      // remove shebang
      this._content = this._content.replace(/^\#\!.*/, '');
    }
    return this._content;
  }
});


module.exports = function(source) {
  var used = {};
  return source.map(function(item) {
    return new Dependency(item);
  }) 
}
