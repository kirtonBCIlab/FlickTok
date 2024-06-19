import socketio
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rich.console import Console

from .pubsub import Store
from .headset_sim_fn import generate_simulated_eeg

console = Console()  # Prints colored text to the terminal

fastapp = FastAPI()
fastapp.add_middleware(CORSMiddleware, allow_origins=["*"])

sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
app = socketio.ASGIApp(sio, other_asgi_app=fastapp)

connected_clients = set()  # if we want to keep track of connected clients

# In-memory store
store = Store()


@sio.event  # called when a client connects
async def connect(sid, environ):
    console.log(f"[green]Client connected: {sid}[/green]")
    connected_clients.add(sid)


@sio.event  # called when a client disconnects
async def disconnect(sid):
    console.log(f"[red]Client disconnected: {sid}[/red]")
    connected_clients.remove(sid)


@sio.on("run-fes-test")  # called when the client emits the 'run-fes-test' event
async def loaded_new_reel(sid, data):
    # console.log(f"[purple]Client ({sid}) sent data: {data}[/purple]")
    console.log(f"[blue]Running FES test...[/blue]")


# Healthcheck endpoint to verify the http server is running (not needed)
@fastapp.get("/api/healthcheck")
async def healthcheck():
    return {"status": "ok"}


@fastapp.get("/api/simulate-headset")
async def headset_simulator():
    generate_simulated_eeg(store)
    return {"msg": "Simulating headset data..."}


@fastapp.get("/api/stop-simulated-headset")
async def stop_simulator():
    store.publish("stop-simulator")
    return {"msg": "Stopping simulated headset data..."}
