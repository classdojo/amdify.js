require("structr").mixin(require("asyngleton"));

var analyzeDeps = require('./analyzeDeps'),
outcome         = require('outcome'),
_               = require("underscore"),
dependencies    = require("./dependencies"),
Bundle          = require("./bundle");

outcome.logAllErrors(true);

module.exports = function(ops, next) {


	/**
	 * first analyze the dependencies. This works a few ways:
	 *
	 * 1. dir specified, so scan ALL scripts, including third-party modules.
	 * 2. entry point specified, so scan ONLY scripts which are used ~ (look for require() stmts)
	 */

	var include = [ops.entry].concat(ops.include || []),
	buildId = ops.buildId || Date.now();


	analyzeDeps({ entries: include }, outcome.e(next).s(function(deps) {
		next(null, new Bundle(dependencies(deps)));
	}));
}

module.exports.transformers = require("./transformers");