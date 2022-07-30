const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs").promises;
const { resolve } = require("path");

console.log(fs.readdir("."));
const test = async () => {
  const s = await fs.readdir(".");
  const m = resolve(".");
  console.log(s, m);
};
test();
return;
const santize = (str) => {
  if (!str) return "";
  return str.replace(/("\.+\/|\.+\/|")/g, "");
};

const checkForLiveErrors = async (changedFiles) => {
  const liveErrors = [];
  var errorLogs = await fs.readFile("/tmp/log.txt", "utf8");
  console.log(`ERROR LOGS`, errorLogs);
  for (const err of errorLogs.split("____")) {
    console.log("Type of changedFiles is ", typeof changedFiles);
    console.log("Type of errorData is ", typeof errorLogs);
    // Make sure we have error
    if (!err) continue;
    // Make sure it has 4 segments
    if (err.split(" ".length < 4)) continue;

    const errorFile = santize(err.split(" ")[2]);
    const errorType = santize(err.split(" ")[1]);
    const location = santize(err.split(" ")[3]) || "0:0";
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
  const changedFiles = core.getInput("changed_data", { required: true });
  const errors = checkForLiveErrors(changedFiles);
  console.log(errors);
  core.setOutput("errors", JSON.stringify(errors, undefined, 2));
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
  core.summary
    .addHeading("Svelte TS Check Results")
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

  if (errors.length > 0)
    core.setFailed("Please fix TS errors in your PR before Merging");
} catch (error) {
  core.setFailed(error.message);
}
