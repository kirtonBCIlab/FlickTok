import socketio
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rich.console import Console

console = Console()  # Prints colored text to the terminal

fastapp = FastAPI()
fastapp.add_middleware(CORSMiddleware, allow_origins=["*"])

sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
app = socketio.ASGIApp(sio, other_asgi_app=fastapp)

connected_clients = set()  # if we want to keep track of connected clients


@sio.event  # called when a client connects
async def connect(sid, environ):
    console.log(f"[green]Client connected: {sid}[/green]")
    connected_clients.add(sid)


@sio.event  # called when a client disconnects
async def disconnect(sid):
    console.log(f"[red]Client disconnected: {sid}[/red]")
    connected_clients.remove(sid)


@sio.on("loaded_new_reel")  # called when the client emits the 'loaded_new_reel' event
async def loaded_new_reel(sid, data):
    console.log(f"[purple]Client ({sid}) loaded new reel: {data}[/purple]")
    reel_info = data  # data sent by the client (in client/src/main.js)
    reelId, reel_duration, reel_current_time = (
        reel_info["id"],
        reel_info["duration"],
        reel_info["currentTime"],
    )
    # Pick a random time in the middle of the reel to switch to a new reel
    rand_break_time = np.random.uniform(
        reel_current_time, reel_current_time + reel_duration
    )
    rand_break_time = min(
        rand_break_time, np.random.uniform(7, 10)
    )  # Cap the break time at ~7-10 seconds for now (some reels are terribly long)
    await sio.emit(
        "switch_to_new_reel_at_time",
        {"reelId": reelId, "time": rand_break_time},
        room=sid,
    )


# Healthcheck endpoint to verify the http server is running (not needed)
@fastapp.get("/api/healthcheck")
async def healthcheck():
    return {"status": "ok"}
