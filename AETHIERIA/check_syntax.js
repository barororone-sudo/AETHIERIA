const fs = require('fs');
const path = 'js/Player.js';

try {
    const code = fs.readFileSync(path, 'utf8');
    // Simple parse check
    try {
        new Function(code);
        console.log("Syntax OK (Note: new Function wraps in function, so 'case' outside switch might pass if inside that wrapper function?? No, syntax error is syntax error)");
    } catch (e) {
        console.error("Syntax Error found by JS Parser:");
        console.error(e.message);
        // We can't easily get line number from new Function error in node sometimes, but let's try.
        if (e.stack) console.log(e.stack);
    }
} catch (err) {
    console.error("File read error:", err);
}
