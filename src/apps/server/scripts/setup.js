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
const condaActivate = conda.replace("/conda", "/activate");

try {
  await $`${conda} env create -f ./environment.yml`;
} catch (err) {}

// Activate conda environment
await $`${condaActivate} ${condaEnvName}`;

// Install dependencies
await $`pip install uv && uv pip install .`;
