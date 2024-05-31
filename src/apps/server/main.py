import os
import yaml
import uvicorn
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file
mono_config = {}
with open("../../packages/config/base.yml", "r") as file:
    mono_config = yaml.safe_load(file)  # Load monorepo config file

def start() -> None:

    HOST = os.getenv("HOST") or mono_config["server"]["host"] or "0.0.0.0"
    PORT = os.getenv("PORT") or mono_config["server"]["port"] or 8000

    uvicorn.run("server.src.app:app", host=HOST, port=PORT, loop="asyncio")


if __name__ == "__main__":
    start()
