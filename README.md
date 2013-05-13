
Amdify converts your commonJS code (node.js) into browser-compatible code. Just point amdify to a node.js entry point:

```bash

# combine in a single file
amdify -e ./application/entry.js -o ./amd/output.js

# wrap the files, and copy them to their own directory
amdify -e ./application/entry.js -o ./amd
```
