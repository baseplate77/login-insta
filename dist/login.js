"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
const instagram_private_api_1 = require("instagram-private-api");
// Return logged in user object
(() => __awaiter(void 0, void 0, void 0, function* () {
    const credentials = yield inquirer_1.default.prompt([
        {
            type: "input",
            name: "username",
            message: "Enter your Instagram username:",
        },
        {
            type: "password",
            name: "password",
            message: "Enter your Instagram password:",
            mask: "*",
        },
    ]);
    console.log("crediential :", credentials);
    const ig = new instagram_private_api_1.IgApiClient();
    try {
        ig.state.generateDevice(credentials.username);
        ig.state.proxyUrl = "http://206.189.135.6:3128";
        yield ig.simulate.preLoginFlow();
        console.log("pre login");
        const loggedInUser = yield ig.account.login(credentials.username, credentials.password);
        console.log("login complete ;", loggedInUser.pk);
        process.nextTick(() => __awaiter(void 0, void 0, void 0, function* () { return yield ig.simulate.postLoginFlow(); }));
        console.log("post login flow");
        const session = yield ig.state.serialize(); // This returns an object with cookies and other session-related info
        delete session.constants; // Remove unnecessary data
        fs_1.default.writeFileSync("./session.json", JSON.stringify(session));
        console.log("complete");
        ("login complete");
    }
    catch (error) {
        if (error instanceof instagram_private_api_1.IgCheckpointError) {
            console.log("Challenge required. Handling challenge...");
            yield handleChallenge(ig, error);
            console.log("challenge");
            ("challenge");
        }
        else if (error instanceof instagram_private_api_1.IgLoginTwoFactorRequiredError) {
            console.log("Two-factor authentication required.");
            yield handleTwoFactorAuth(ig, error);
            console.log("2fa");
            ("2fa");
        }
        else {
            console.log("Error during login:", error.message);
            console.log("error:", error);
            ("error");
        }
    }
    // Initiate Instagram API client
    // Perform usual login
    // If 2FA is enabled, IgLoginTwoFactorRequiredError will be thrown
}))();
function handleChallenge(ig, error) {
    return __awaiter(this, void 0, void 0, function* () {
        const { api } = error;
        //   await ig.challenge.auto(true); // Requesting the challenge (true means automatic selection)
        const challengeChoices = yield inquirer_1.default.prompt([
            {
                type: "list",
                name: "method",
                message: "Select a challenge method:",
                choices: [
                    { name: "Email", value: "1" },
                    { name: "Phone", value: "0" },
                ],
            },
        ]);
        // Submitting the selected challenge option (email or phone)
        yield ig.challenge.selectVerifyMethod(challengeChoices.method);
        const codePrompt = yield inquirer_1.default.prompt([
            {
                type: "input",
                name: "code",
                message: "Enter the verification code you received:",
            },
        ]);
        // Submitting the verification code
        yield ig.challenge.sendSecurityCode(codePrompt.code);
        console.log("Challenge handled successfully!");
    });
}
function handleTwoFactorAuth(ig, error) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username } = error;
        const twoFactorPrompt = yield inquirer_1.default.prompt([
            {
                type: "input",
                name: "code",
                message: "Enter the two-factor authentication code:",
            },
        ]);
        yield ig.account.twoFactorLogin({
            username,
            verificationCode: twoFactorPrompt.code,
            twoFactorIdentifier: error.response.body.two_factor_info.two_factor_identifier,
            verificationMethod: "1", // Assuming 1 is SMS
            trustThisDevice: "1",
        });
        console.log("Logged in with two-factor authentication successfully!");
    });
}
