"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = require("./app");
const githubApp_1 = require("./githubApp");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const githubApp = (0, githubApp_1.createGitHubApp)();
const app = (0, app_1.createApp)(githubApp);
app.listen(PORT, () => {
    console.log(`RedFlag CI listening on port ${PORT}`);
});
