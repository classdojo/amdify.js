var outcome     = require("outcome"),
step            = require("stepc"),
fs              = require("fs"),
async           = require("async"),
path            = require("path"),
_               = require("underscore"),
utils           = require('./utils'),
flatten         = require("flatten"),
findPackagePath = utils.findPackagePath,
isMain          = utils.isMain,  
eachDir         = utils.eachDir,
loadPackage     = utils.loadPackage,
getPathInfo		= utils.getPathInfo,
findFiles		= utils.findFiles,
getPkgName      = utils.getPackageName,
mainScriptPath  = utils.mainScriptPath;


/**
 * scans the target entry for dependencies
 */

 module.exports = function(ops, callback) {

 	//include these entry points - .JS files, directories, whatever.
 	var entries = ops.entries;


 	//dependencies already found
 	var __loaded = { used: {}, files: [] };

 	/**
 	 */

 	var isUsed = function(script) {
 		return !!__loaded.used[script.alias];
 	}

 	/**
 	 */

 	var use = function(script) {
 		__loaded.used[script.alias] = true;
 		__loaded.files.push(script);
 	}


 	/**
 	 * finds all 
 	 */

 	var includeScript = function(script, callback) {

 		//script already used? skip.
 		if(isUsed(script) || !script.path) return callback();
 		

 		use(script);

 		var on = outcome.e(callback);


 		step(

 			/** 
 			 * first get the dependencies
 			 */

 			function() {

 				findDeps(script.path, this);

 			},

 			/**
 			 * deps found? load THOSE in!
 			 */

 			on.s(function(deps) {
 				script.dependencies = deps;
 				async.forEach(deps, includeScript, this);
 			}),


 			/**
 			 */

 			callback
 		)
 	}

 				
 	/**
	 * includes ALL scripts in the given directory
	 */

	var includeDir = exports.includeDir = function(dir, callback) {
		

		var on = outcome.error(callback);

		step(

			/**
			 * first scan for all the scripts in the given directory recursively 
			 */

			function() {
				var inc = [], self = this;

				findJsFiles(dir, this);
			},

			/**
			 * next include all the scripts loaded in 
			 */

			on.success(function(include) {

				//after 
				async.forEach(include, includeScript, this);

			}),

			/**
			 */

			callback
		)
	}
 	
 	/**
 	 entry point given
 	 */

 	var includeEntry = function(dirOrScript, callback) {
 		
 		var on = outcome.e(callback);

 		step(

 			/**
 			 */

			function() {

				fs.lstat(dirOrScript, this);

			},

			/**
			 */

			on.s(function(stats) {

				//dir specified? scan EVERYTHING
				if(stats.isDirectory()) {

					includeDir(dirOrScript, this);

				//otherwise scan for require() statements
				} else {

					includeScript(getPathInfo(dirOrScript), this);

				}
			}),

			/**
			 */

			callback
		)
 	}

	/**  
	 * recursively includes the entry points to scan
	 */

	var init = function(entries, callback) {
		

		var on = outcome.e(callback);

		async.forEach(entries, includeEntry, on.s(function() {
			callback(null, __loaded.files);
		}));
	}


	init(entries, callback);
}

 



/**
 * scans content for required dependencies
 */

 var findDeps = module.exports.findDeps = function(entry, callback) {
		
	//incase getPathInfo stuff is passed...
	if(entry.path) entry = entry.path;

	var cwd    = path.dirname(entry),
	on         = outcome.e(callback),
	content    = null;
	
	step(

		/**
		 */

		function() {
			fs.readFile(entry, "utf8", this);
		},

		/**
		 */

		on.s(function(cn) {

			content = cn;

			var next = this, d;

			scanRequired(content, cwd, on.s(function(deps) {
				scanInclude(content, cwd, on.s(function(incDeps) {
					next(null, deps.concat(incDeps));
				}));
			}));
		}),

		
		/**
		 */

		on.success(function(deps) {
			callback(null, deps);
		})
	);
}

function findJsFiles(entry, callback) {

	var inc = [];

	findFiles(entry, /\.js$/, function(file) {

		//the included dir MIGHT be a module, so make sure that's the starting point
		if(file.substr(file.indexOf(entry) + entry.length).indexOf('node_modules/') > -1) return;

		var script = getPathInfo(file);

		inc.push(script);

	}, function(err, success) {
		callback(null, inc);
	});
}

//scans for #include file.js or/path
function scanInclude(content, cwd, callback) {
	var include = String(content).match(/\/\/#include\s([^\n]+)/g) || [];

	step(
		function() {	

			var next = this;

			async.map(include, function(fn, next) {
				inc = fn.split(/\s+/g);
				inc.shift();
				
				async.map(inc, function(path, next) {
					findJsFiles(cwd+"/"+path, next);
				}, next);

			}, function(err, inc) {
				next(null, flatten(inc));
			});

		},
		callback
	)
}

function scanRequired(content, cwd, callback) {

	//for speed. 
	var required = String(content).match(/require\(["'].*?["']\)/g) || [],
	pathInfo = [];


	async.forEach(required, function(fn, next) {

		relPath = fn.match(/["'](.*?)["']/)[1]

		var pi = getPathInfo(relPath, cwd);

		pathInfo.push(pi);

		next();

	}, function() {
		
		callback(null, pathInfo);
	})
}

