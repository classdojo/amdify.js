var outcome     = require("outcome"),
step            = require("stepc"),
fs              = require("fs"),
async           = require("async"),
path            = require("path"),
_               = require("underscore"),
flatten         = require("flatten"),
initPathInfo = require("./pathInfo");


/**
 * scans the target entry for dependencies
 */

 module.exports = function(ops, callback) {

 	//include these entry points - .JS files, directories, whatever.
 	var entries = ops.entries,
 	pathInfo = initPathInfo(ops),
 	getPathInfo = pathInfo.getPathInfo,
	findPackagePath = pathInfo.findPackagePath,
	isMain          = pathInfo.isMain,  
	eachDir         = pathInfo.eachDir,
	loadPackage     = pathInfo.loadPackage,
	findFiles		    = pathInfo.findFiles,
	getPkgName      = pathInfo.getPackageName,
	mainScriptPath  = pathInfo.mainScriptPath;


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

 		//script is core, and platform is node?
 		if(script.core && ops.platform == "node") {
 			script.alias = script.moduleName;
 			return callback();
 		}

 		

 		use(script);

 		var on = outcome.e(function(e) {
 			callback(new Error("unable to include script " + script.path + " from " + script.source + ", " + e.stack))
 		});


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
					var script = this.script = pathInfo.getPathInfo(dirOrScript);
					includeScript(script, this);

				}
			}),

			/**
			 */

			on.s(function() {
				this(null, this.script);
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

		async.map(entries, includeEntry, on.s(function(entries) {

			var deps = __loaded.files;

			callback(null, { entries: entries, dependencies: deps });
		}));
	}


	init(entries, callback);
 



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
				var err;
				deps.forEach(function(dep) {
					dep.source = entry;
					if(dep.error) {
						err = dep.error;
					}
				});
				callback(err, deps);
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
		var required = getRequired(content, cwd);//String(content).match(/require\(["'].*?["']\)/g) || [],
		pathInfo = [];



		async.forEach(required, function(relPath, next) {


			var pi = getPathInfo(relPath, cwd);

			pathInfo.push(pi);

			next();

		}, function() {
			
			callback(null, pathInfo);
		})
	}

    function removeComments(str) {
        /*
         * cited from http://james.padolsey.com/javascript/javascript-comment-removal-revisted/
         */
        var uid = '_' + +new Date(),
            primatives = [],
            primIndex = 0;
     
        return (
            str
            /* Remove strings */
            .replace(/(['"])(\\\1|.)+?\1/g, function(match){
                primatives[primIndex] = match;
                return (uid + '') + primIndex++;
            })
     
            /* Remove Regexes */
            .replace(/([^\/])(\/(?!\*|\/)(\\\/|.)+?\/[gim]{0,3})/g, function(match, $1, $2){
                primatives[primIndex] = $2;
                return $1 + (uid + '') + primIndex++;
            })
     
            /*
            - Remove single-line comments that contain would-be multi-line delimiters
                E.g. // Comment /* <--
            - Remove multi-line comments that contain would be single-line delimiters
                E.g. /* // <-- 
           */
            .replace(/\/\/.*?\/?\*.+?(?=\n|\r|$)|\/\*[\s\S]*?\/\/[\s\S]*?\*\//g, '')
     
            /*
            Remove single and multi-line comments,
            no consideration of inner-contents
           */
            .replace(/\/\/.+?(?=\n|\r|$)|\/\*[\s\S]+?\*\//g, '')
     
            /*
            Remove multi-line comments that have a replaced ending (string/regex)
            Greedy, so no inner strings/regexes will stop it.
           */
            .replace(RegExp('\\/\\*[\\s\\S]+' + uid + '\\d+', 'g'), '')
     
            /* Bring back strings & regexes */
            .replace(RegExp(uid + '(\\d+)', 'g'), function(match, n){
                return primatives[n];
            })
        );
     
    }
    
	function contentFilter(content) {
	    //remove comments
	    content = removeComments(content);

	    /*
         * TODO:resolve problems caused by conditional require
	     *      module.exports = process.env.EXPRESS_COV
         *          ? require('./lib-cov/express')
         *          : require('./lib/express');
         */

	    return content;
    }

	function getRequired(content, cwd) {
	    
	    content = contentFilter(content);

		//for speed.
		var required = String(content).match(/require\(["'].*?["']\)/g) || [],
		pathInfo = [];

		return required.map(function(fn) {
			return fn.match(/["'](.*?)["']/)[1];
		});
	}
}

