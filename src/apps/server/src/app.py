import sys
import atexit
import threading
import asyncio
import socketio
import signal
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .utils.helpers import fifo_worker, delayed_exec, console, StoppableTask
from .utils.store import Store
from .utils.headset_sim_fn import generate_simulated_eeg
from .FlickTokModel import FlickTokModel

connected_clients = set()  # if we want to keep track of connected clients

# In-memory pub/sub store
store = Store(
    eeg_stream_is_available=False,
    # training_btn_state="",
    # training_status=None,
    # trial_complete=False,
    # prediction_btn_state="",
    # prediction_status=None,
    # prediction_complete=False,
    # action_detected=False,
)


async def on_startup(app: FastAPI):
    # Startup logic
    console.log(f"[cyan]Application is starting up...[/cyan]")


async def on_shutdown(app: FastAPI):
    # Shutdown logic
    console.log(f"[cyan]Application is shutting down...[/cyan]")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await on_startup(app)
    yield
    await on_shutdown(app)


fastapp = FastAPI(lifespan=lifespan)
fastapp.add_middleware(CORSMiddleware, allow_origins=["*"])

sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
app = socketio.ASGIApp(sio, other_asgi_app=fastapp)

# Models
flicktok_model = FlickTokModel(store, sio)


@sio.event  # called when a client connects
async def connect(sid, environ):
    console.log(f"[green]Client connected: {sid}[/green]")
    connected_clients.add(sid)
    await sio.emit("connected", {}, room=sid)


@sio.event  # called when a client disconnects
async def disconnect(sid):
    console.log(f"[red]Client disconnected: {sid}[/red]")
    connected_clients.remove(sid)


@sio.on("req:ping")
async def ping(sid, data={}):
    console.log(f"[yellow]Ping...[/yellow]")
    await sio.emit("fromPython", {"id": "res:pong", "data": {}})


@sio.on("run-fes-test")  # called when the client emits the 'run-fes-test' event
async def run_fes_test(sid, data):
    console.log(f"[cyan]Running FES test...[/cyan]")


# Healthcheck endpoint to verify the http server is running
@fastapp.get("/api/healthcheck")
async def healthcheck():
    return {"status": "ok"}


# region Simulated headset controls
@fastapp.get("/api/start-headset-simulator")
async def start_headset_simulator(background_tasks: BackgroundTasks):
    if not store.get("eeg_stream_is_available"):
        background_tasks.add_task(generate_simulated_eeg, store)
    return {"msg": "Simulating headset data..."}


@fastapp.get("/api/stop-headset-simulator")
async def stop_headset_simulator():
    store.publish("stop-headset-simulator")
    return {"msg": "Stopping simulated headset data..."}


# endregion


# region Listen for & notify clients of eeg stream availability changes
@sio.on("req:eeg-stream-availability")
async def req_eeg_stream_availability(sid, data):
    await sio.emit(
        "fromPython",
        {
            "id": "eeg-stream-availability-updated",
            "data": {"value": store.get("eeg_stream_is_available")},
        },
    )


def notify_client_of_eeg_stream_availability(payload):
    console.log(f"[green]eeg_stream_is_available: {payload}[/green]")
    asyncio.run(
        sio.emit(
            "fromPython",
            {
                "id": "eeg-stream-availability-updated",
                "data": {"value": payload.get("value")},
            },
        )
    )


store.on_change("eeg_stream_is_available", notify_client_of_eeg_stream_availability)
# endregion


@sio.on("set-training-btn-state")
async def set_training_btn_state(sid, value):
    if value == "start":
        await flicktok_model.start_training()
    elif value == "stop":
        await flicktok_model.stop_training()


@sio.on("set-prediction-btn-state")
async def set_prediction_btn_state(sid, value):
    # store.set("prediction_btn_state", value)  # "start" or "stop"
    if value == "start":
        await flicktok_model.start_predicting()
    elif value == "stop":
        await flicktok_model.stop_predicting()
