## FlickTok Prototype

### Requirements

- [conda](https://www.anaconda.com/download/success) & pip (tested w/ python v3.11.5 but any 3.x should work to get started)
- [node & npm](https://nodejs.org/)
- [bun](https://bun.sh/)

**NOTE:** Would recommend using `bun` on Linux, macOS or [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) if its native Windows version does not work.

### Setup & Usage

```bash
git clone https://github.com/arazzz/flicktok_testing.git && cd flicktok_testing && git switch new/prototype-uv-async
bun install
bun dev # or `bun run dev` (concurrently runs the Electron app & Python server)

# Can also start the Electron app & Python server separately:
# cd src/apps/server && bun dev # or `conda actviate flicktok_server && python main.py`
# cd src/apps/client && bun dev

# Start/stop simulated headset:
curl localhost:8000/api/start-headset-simulator
curl localhost:8000/api/stop-headset-simulator
```

- Can also use `bun start` to start the app without watching for changes ([hot-reloading](https://preview.redd.it/hot-reloading-edit-and-continue-for-flask-v0-pv9ldkgmijr81.gif?width=702&auto=webp&s=2912b0ce833a01871ed941eae514cf1e7388b4d5) / auto restart is enabled by default **for both the Electron app & Python server**).
- Running the app will simultaneously start the Electron app and the Python server. The real-time communication between them is handled via the [socket.io](https://socket.io/) & [python-socketio](https://python-socketio.readthedocs.io/en/stable/) libraries for websockets. The project structure follows a typical monorepo setup using [Turbo](https://turbo.build/). The front-end (what Electron loads up) is written with the [Astro](https://astro.build/) framework.
- To stop the app, press `Ctrl+C` in the terminal.

### Overview

![overview](https://github.com/arazzz/fliktok_testing/assets/33709341/81a025d1-3cd1-42d2-a421-50ccbac643c5)

- The app consists of two parts: an Electron app (apps/client) and a Python server (apps/server).
- Looks something like this at the time of writing:


https://github.com/arazzz/flicktok_testing/assets/33709341/879fae93-9a43-49a8-96e7-ae18bed93977



https://github.com/arazzz/flicktok_testing/assets/33709341/dd6623be-0868-497b-ad23-e1be29c1ca30


### Troubleshooting

If there are conda-related issues with installation, can try setting up and running the JS / Python projects separately:

```bash
# Set up Python side
cd src/apps/server
conda env create -f environment.yml
conda activate flicktok_server
pip install .
python main.py

# Set up JS side
cd src/apps/client
bun install
bun dev
```
