Amdify converts your node.js code into browser-compatible code. For example

```javascript
var events = require("events"),
EventEmitter = require("events").EventEmitter;

var em = new EventEmitter();
em.emit("hello", "world!");
```

Would be converted to:

```javascript
define(["events"], function() {
  var events = require("events"),
  EventEmitter = require("events").EventEmitter;

  var em = new EventEmitter();
  em.emit("hello", "world!");
});
```


You can also include files:


```javascript
var amdify = require("amdify"),
template   = amdify.require("template.mu");
console.log(template); //<h1>hello world!</h1>

```

Would be converted to:

```javascript
define(["amdify", "template.mu"], function() {
  
  var amdify = require("amdify"),
  template   = amdify.require("template.mu");
  console.log(template); //<h1>hello world!</h1>
});
```


