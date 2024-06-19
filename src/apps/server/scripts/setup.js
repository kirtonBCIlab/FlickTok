import { $ } from "bun";

// Read environment.yml
const environmentYML = await $`cat ./environment.yml`.text();
const condaEnvName = environmentYML.match(/name: (.*)/)[1];

// Get SHELL
const SHELL = process.env.SHELL;
// const SHELL = await $`echo $SHELL`.text();

// Check if conda is installed
if (!(await $`which conda`.text()))
  console.log("Conda not found. Please install conda and try again.") &&
    process.exit(1);

const conda = await $`which conda`.text();
// const condaActivate = conda.replace("/conda", "/activate");
// const condaActivate = "conda activate";

try {
  await $`${conda} env create -f ./environment.yml`;
} catch (err) {}

const pipPath = conda.replace('/bin/conda', '') + "/envs/" + condaEnvName + "/bin/pip";
// console.log(pipPath);
// const pip = await $`${pipPath}`.text();
await $`${pipPath} install .`;

// Activate conda environment
// await $`conda shell.${SHELL.split('/').at(-1)} activate ${condaEnvName} && pip install .`;

// await $`conda shell.${SHELL.split('/').at(-1)} deactivate`;

// Install dependencies
// await $`pip install uv && uv pip install .`;
