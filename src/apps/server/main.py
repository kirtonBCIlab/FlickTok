import os
import yaml
import uvicorn
import signal
from dotenv import load_dotenv

from src.app import app

load_dotenv()  # Load environment variables from .env file
mono_config = {}
with open("../../packages/config/base.yml", "r") as file:
    mono_config = yaml.safe_load(file)  # Load monorepo config file


def start() -> None:

    HOST = os.getenv("HOST") or mono_config["server"]["host"] or "0.0.0.0"
    PORT = os.getenv("PORT") or mono_config["server"]["port"] or 8000

    config = uvicorn.Config(app, host=HOST, port=PORT, loop="asyncio", reload=False)
    server = uvicorn.Server(config=config)

    signals = (
        [signal.SIGINT, signal.SIGBREAK]
        if os.name == "nt"
        else [signal.SIGTERM, signal.SIGINT]
    )
    for sig in signals:
        signal.signal(sig, server.should_exit)

    server.run()


if __name__ == "__main__":
    start()
