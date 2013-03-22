templates = require("../templates"),
path      = require("path");

module.exports = require("./base").extend({

  /**
   */

  "__construct": function(pathNameOrRenderer) {
    if(typeof pathNameOrRenderer === "function") {
      this.render = pathNameOrRenderer;
    } else {
      this.render = templates[pathNameOrRenderer] || templates.renderer(pathNameOrRenderer);
    }
  },

  /**
   */

  "write": function(dep, callback) {

    var options = {
      __dirname: path.dirname(dep.alias),
      __filename: dep.alias,
      name: dep.isMain ? dep.moduleName : dep.alias,
      dependencies: dep.dependencies,
      content: dep.content()
    };

    dep.content(this.render(options));
    callback();
  }
});