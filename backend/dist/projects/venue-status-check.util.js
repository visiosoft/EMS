"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStringLiteralsFromCheckDefinition = parseStringLiteralsFromCheckDefinition;
function parseStringLiteralsFromCheckDefinition(definition) {
    const out = new Set();
    const re = /N?'((?:''|[^'])*)'/g;
    let m;
    while ((m = re.exec(definition)) !== null) {
        const raw = m[1].replace(/''/g, "'");
        if (raw.length > 0)
            out.add(raw);
    }
    return [...out];
}
//# sourceMappingURL=venue-status-check.util.js.map