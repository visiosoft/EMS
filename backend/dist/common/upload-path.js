"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadRoot = getUploadRoot;
const path_1 = require("path");
function getUploadRoot() {
    if (process.env.WEBSITE_INSTANCE_ID) {
        return '/home/uploads';
    }
    return (0, path_1.join)(process.cwd(), 'uploads');
}
//# sourceMappingURL=upload-path.js.map