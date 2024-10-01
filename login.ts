import inquirer from "inquirer";
import fs from "fs";
import {
  IgApiClient,
  IgCheckpointError,
  IgLoginTwoFactorRequiredError,
} from "instagram-private-api";

// Return logged in user object
(async () => {
  const credentials = await inquirer.prompt([
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

  const ig = new IgApiClient();
  try {
    ig.state.generateDevice(credentials.username);
    // ig.state.proxyUrl = "http://206.189.135.6:3128";

    await ig.simulate.preLoginFlow();
    console.log("pre login");

    const loggedInUser = await ig.account.login(
      credentials.username,
      credentials.password
    );
    console.log("login complete ;", loggedInUser.pk);
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    console.log("post login flow");
    const session = await ig.state.serialize(); // This returns an object with cookies and other session-related info
    delete session.constants; // Remove unnecessary data
    fs.writeFileSync("./session.json", JSON.stringify(session));

    console.log("complete");
    ("login complete");
  } catch (error: any) {
    if (error instanceof IgCheckpointError) {
      console.log("Challenge required. Handling challenge...");
      await handleChallenge(ig, error);
      console.log("challenge");
      ("challenge");
    } else if (error instanceof IgLoginTwoFactorRequiredError) {
      console.log("Two-factor authentication required.");
      await handleTwoFactorAuth(ig, error);
      console.log("2fa");
      ("2fa");
    } else {
      console.log("Error during login:", error.message);
      console.log("error:", error);
      ("error");
    }
  }
  // Initiate Instagram API client

  // Perform usual login
  // If 2FA is enabled, IgLoginTwoFactorRequiredError will be thrown
})();

async function handleChallenge(ig: IgApiClient, error: any) {
  const { api } = error;
  //   await ig.challenge.auto(true); // Requesting the challenge (true means automatic selection)

  const challengeChoices = await inquirer.prompt([
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
  await ig.challenge.selectVerifyMethod(challengeChoices.method);

  const codePrompt = await inquirer.prompt([
    {
      type: "input",
      name: "code",
      message: "Enter the verification code you received:",
    },
  ]);

  // Submitting the verification code
  await ig.challenge.sendSecurityCode(codePrompt.code);

  console.log("Challenge handled successfully!");
}

async function handleTwoFactorAuth(ig: IgApiClient, error: any) {
  const { username } = error;
  const twoFactorPrompt = await inquirer.prompt([
    {
      type: "input",
      name: "code",
      message: "Enter the two-factor authentication code:",
    },
  ]);

  await ig.account.twoFactorLogin({
    username,
    verificationCode: twoFactorPrompt.code,
    twoFactorIdentifier:
      error.response.body.two_factor_info.two_factor_identifier,
    verificationMethod: "1", // Assuming 1 is SMS
    trustThisDevice: "1",
  });

  console.log("Logged in with two-factor authentication successfully!");
}
