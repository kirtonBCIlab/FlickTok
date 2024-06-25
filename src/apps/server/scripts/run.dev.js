import { $ } from "bun";
import os from "os";

const platform = os.platform[Symbol.toPrimitive]();
const isWindows = platform === "win32";
// const SHELL = process.env.SHELL;

if (isWindows) {
  
  // Read environment.yml
  const environmentYML = await $`cat ./environment.yml`.text();
  const condaEnvName = environmentYML.match(/name: (.*)/)[1];

  // Check if conda is installed
  if (!(await $`where.exe conda`.text()))
    console.log("Conda not found. Please install conda and try again.") &&
      process.exit(1);

  const conda = await $`where.exe conda`.text();
  const condaPath = conda.split("\n").find((line) => line.includes("Scripts") && line.includes("conda.exe")).split("conda.exe")[0].trim();
  const condaEnvPath = condaPath.replace("\\Scripts\\", "\\envs\\") + condaEnvName + "\\";
  const pythonExecPath = condaEnvPath + "python.exe";

  await $`${pythonExecPath} main.py`

} else {

  // Read environment.yml
  const environmentYML = await $`cat ./environment.yml`.text();
  const condaEnvName = environmentYML.match(/name: (.*)/)[1];
  
  // Check if conda is installed
  if (!(await $`which conda`.text()))
    console.log("Conda not found. Please install conda and try again.") &&
      process.exit(1);
  
  const conda = await $`which conda`.text();
  
  const pythonPath = `${conda.replace("bin/conda", "")}/envs/${condaEnvName}/bin/python`;
  
  await $`${pythonPath} main.py`

}

