mkdirp = require("mkdirp"),
fs = require("fs"),
path = require("path")

/**
 * copies the dependencies from one directory to another
 */

module.exports = require("./decor").extend({

  /**
   */

  "override __construct": function(options, target) {
    this.output = options.output;
    this._super(target);
  },

  /**
   */

  "_write": function(dep, next) {

    var self = this, fp = path.join(self.output, dep.alias), dir = path.dirname(fp);
    
    mkdirp(dir, function() {
      fs.writeFile(fp, dep.content(), next);
    });
  }
});