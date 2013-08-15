mkdirp = require("mkdirp"),
fs = require("fs"),
path = require("path"),
step = require("stepc"),
outcome = require("outcome");

/**
 * copies the dependencies from one directory to another
 */

module.exports = require("./decor").extend({

  /**
   */

  "override __construct": function(options, target) {
    this.output = options.output;
    this.prefix = options.prefix;
    this._super(target);
  },

  /**
   */

  "filter": function(value) {
    this._filter = value;
  },

  /**
   */

  "_write": function(dep, next) {

    if(this._filter) {
      if(!this._filter(dep)) return next();
    }

    var self = this, 
    fp = path.join(self.output, dep.alias.replace(new RegExp("^" + this.prefix), "")), 
    dir = path.dirname(fp),
    o = outcome.e(next);

    step(

      /**
       */

      function() {
        mkdirp(dir, this);
      },

      /**
       */

      function() {

        if(!dep.isMain) return this();


        var pkg = path.join(self.output, dep.baseDir, "package.json"),
        oldPkg = dep.pkgPath ? JSON.parse(fs.readFileSync(dep.pkgPath, "utf8")) : {
          name: dep.moduleName,
          version: "0.0.0"
        };


        oldPkg.main = dep.pathFromPkg;
        oldPkg.description = oldPkg.description || oldPkg.name;

        try {
          fs.unlinkSync(pkg)
        } catch(e) {
          
        }

        fs.writeFile(pkg, JSON.stringify(oldPkg, null, 2), this);
      },


      /**
       */

      function() {
        try {
          fs.unlinkSync(fp)
        } catch(e) { }
        fs.writeFile(fp, dep.content(), this);
      },

      /**
       */

      next
    );

  }
});