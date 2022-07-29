const core = require("@actions/core");
const github = require("@actions/github");

const santize = (str) => {
  return str.replace(/("\.+\/|\.+\/|")/g, "");
};
const checkForLiveErrors = (errorLogs, changedFiles) => {
  const liveErrors = [];

  for (const err of errorLogs.split("\n")) {
    console.log("Type of changedFiles is ", typeof changedFiles);
    console.log("Type of errorData is ", typeof errorLogs);

    const errorFile = santize(err.split(" ")[2]);
    const errorType = santize(err.split(" ")[1]);
    const location = santize(err.split(" ")[3]);
    const errorLine = santize(location.split(":")[0]);
    const errorCol = santize(location.split(":")[1]);
    const errorDesc = santize(
      err.slice(err.indexOf(location) + location.length + 1)
    );

    if (changedFiles.includes(errorFile)) {
      liveErrors.push({
        errorFile,
        errorType,
        errorLine,
        errorCol,
        errorDesc,
      });
    }
  }
  return liveErrors;
};

try {
  // `who-to-greet` input defined in action metadata file
  const errorLogs = core.getInput("error_data", { required: true });
  const changedFiles = core.getInput("changed_data", { required: true });
  const errors = checkForLiveErrors(errorLogs, changedFiles);
  console.log(errors);
  core.setOutput("errors", JSON.stringify(errors, undefined, 2));
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
  core.summary
    .addHeading("Svelte TS Check Results")
    .addCodeBlock(generateTestResults(), "js")
    .addTable([
      [
        { data: "errorFile", header: true },
        { data: "errorType", header: true },
        { data: "errorLine", header: true },
        { data: "errorCol", header: true },
        { data: "errorDesc", header: true },
      ],
      ...errors.map((data) => Object.values(data)),
    ])
    .addLink("Ok Done!", "https://github.com")
    .write();
} catch (error) {
  core.setFailed(error.message);
}
