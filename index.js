const core = require("@actions/core");
const fs = require("fs").promises;

const santize = (str) => {
  if (!str) return "";
  return str.replace(/("\.+\/|\.+\/|")/g, "");
};

const acceptableFiles = (file) => {
  return (
    ["js", "ts", "svelte"].filter((f) => file.includes(`.${f}`)).length > 0
  );
};

const ignoreable = (desc) =>
  ["semi-colon expected", "at-rule or selector expected"].some((ignore) =>
    desc.includes(ignore)
  );

const sepeartor = ",";
const checkForLiveErrors = (errorLogs, changedFiles) => {
  const liveErrors = [];
  for (const err of errorLogs.split(sepeartor)) {
    // Make sure we have error
    if (!err) continue;
    // Make sure it has 4 segments
    const errorFile = santize(err.split(" ")[2]);
    const errorFileName = errorFile.slice(errorFile.lastIndexOf("/") + 1);
    const errorPath = changedFiles
      .split(",")
      .filter((f) => f.includes(errorFileName))[0];

    const errorType = santize(err.split(" ")[1]);
    const location = santize(err.split(" ")[3]) || "0:0";
    const errorLine = santize(location.split(":")[0]);
    const errorDesc = santize(
      err.slice(err.indexOf(location) + location.length + 1)
    );

    if (
      changedFiles.includes(errorFileName) &&
      acceptableFiles(errorFileName) &&
      !ignoreable(errorDesc)
    ) {
      liveErrors.push({
        file: errorPath,
        title: errorType,
        line: +errorLine,
        message: errorDesc,
        annotation_level: errorType === "ERROR" ? "failure" : "warning",
        errorFileName,
      });
    }
  }
  return liveErrors;
};

const init = async () => {
  try {
    // Get changed files list
    // const changedFiles = core.getInput("changed_data", { required: true });
    const changedFiles = await fs.readFile("./changed_files.txt", "utf8");
    // Read errors logs from svelte-check
    var errorLogs = await fs.readFile("./log.txt", "utf8");

    // Process the errors and compare them to the changed files
    const liveErrors = checkForLiveErrors(errorLogs, changedFiles);

    console.log("LIVE ERRORS", liveErrors, liveErrors.length);
    // Write a summary about ther errors within our PR files
    core.summary
      .addHeading("Svelte TS Check Results")
      .addTable([
        [
          { data: "path", header: true },
          { data: "level", header: true },
          { data: "line", header: true },
          { data: "message", header: true },
        ],
        ...liveErrors.map((data) => Object.values(data).slice(0, 4)),
      ])
      .addLink("Ok Done!", "https://github.com")
      .write();

    fs.writeFile("./results.json", JSON.stringify(liveErrors));
    // Report if we have at least one error
    if (liveErrors.filter((f) => f.annotation_level == "failure").length > 0)
      core.setFailed(
        `Please fix ${liveErrors.length} TS errors in your PR before Merging`
      );
  } catch (error) {
    core.setFailed(error.message);
  }
};

init();
