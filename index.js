const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs").promises;

const santize = (str) => {
  if (!str) return "";
  return str.replace(/("\.+\/|\.+\/|")/g, "");
};

const checkForLiveErrors = async (errorLogs, changedFiles) => {
  const liveErrors = [];
  for (const err of errorLogs.split("____")) {
    // Make sure we have error
    if (!err) continue;
    // Make sure it has 4 segments
    const errorFile = santize(err.split(" ")[2]);
    const errorFileName = errorFile
      .slice(errorFile.lastIndexOf("\\"))
      .replace("\\", "");

    const errorType = santize(err.split(" ")[1]);
    const location = santize(err.split(" ")[3]) || "0:0";
    const errorLine = santize(location.split(":")[0]);
    const errorCol = santize(location.split(":")[1]);
    const errorDesc = santize(
      err.slice(err.indexOf(location) + location.length + 1)
    );

    if (changedFiles.includes(errorFileName) && errorFile.includes("\\")) {
      liveErrors.push({
        errorFile,
        errorType,
        errorLine,
        errorCol,
        errorDesc,
      });
    }
  }
  console.log("ERRS", liveErrors.length, errorLogs.length);
  return liveErrors;
};

const init = async () => {
  try {
    // Get changed files list
    const changedFiles = core.getInput("changed_data", { required: true });
    // const changedFiles = await fs.readFile("./files.txt", "utf8");
    // Read errors logs from svelte-check
    var errorLogs = await fs.readFile("./log.txt", "utf8");
    // Process the errors and compare them to the changed files
    const liveErrors = await checkForLiveErrors(errorLogs, changedFiles);
    // Write a summary about ther errors within our PR files
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
        ...liveErrors
          .filter((f) => f.errorType == "ERROR")
          .map((data) => Object.values(data)),
      ])
      .addLink("Ok Done!", "https://github.com")
      .write();

    // Report if we have at least one error
    if (liveErrors.filter((f) => f.errorType == "ERROR").length > 0)
      core.setFailed(
        `Please fix ${liveErrors.length} TS errors in your PR before Merging`
      );
  } catch (error) {
    core.setFailed(error.message);
  }
};

init();
