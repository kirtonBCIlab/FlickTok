import { $ } from "bun";

// Read environment.yml
const environmentYML = await $`cat ./environment.yml`.text();
const condaEnvName = environmentYML.match(/name: (.*)/)[1];

// Get SHELL
const SHELL = process.env.SHELL;

// Check if conda is installed
if (!(await $`which conda`.text()))
  console.log("Conda not found. Please install conda and try again.") &&
    process.exit(1);

const conda = await $`which conda`.text();
// const condaActivate = conda.replace("/conda", "/activate");

// Activate conda environment
// await $`${condaActivate} ${condaEnvName}`;

const pythonPath = `${conda.replace("bin/conda", "")}/envs/${condaEnvName}/bin/python`;

await $`${pythonPath} main.py`

// await $`conda shell.${SHELL.split('/').at(-1)} activate ${condaEnvName} && python main.py`;

// Run dev
// await $`python main.py`;
