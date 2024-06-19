import asyncio
import socketio
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from rich.console import Console

from .utils.store import Store
from .utils.headset_sim_fn import generate_simulated_eeg
from .FlickTokModel import FlickTokModel

console = Console()  # Prints colored text to the terminal

fastapp = FastAPI()
fastapp.add_middleware(CORSMiddleware, allow_origins=["*"])

sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
app = socketio.ASGIApp(sio, other_asgi_app=fastapp)

connected_clients = set()  # if we want to keep track of connected clients

# In-memory pub/sub store
store = Store(
    eeg_stream_is_available=False,
    raining_btn_state="",
    training_status=None,
    trial_complete=False,
)

# Models
flicktok_model = FlickTokModel(store, sio)


@sio.event  # called when a client connects
async def connect(sid, environ):
    console.log(f"[green]Client connected: {sid}[/green]")
    connected_clients.add(sid)


@sio.event  # called when a client disconnects
async def disconnect(sid):
    console.log(f"[red]Client disconnected: {sid}[/red]")
    connected_clients.remove(sid)


@sio.on("run-fes-test")  # called when the client emits the 'run-fes-test' event
async def run_fes_test(sid, data):
    console.log(f"[blue]Running FES test...[/blue]")


# Healthcheck endpoint to verify the http server is running
@fastapp.get("/api/healthcheck")
async def healthcheck():
    return {"status": "ok"}


@fastapp.get("/api/simulate-headset")
async def headset_simulator(background_tasks: BackgroundTasks):
    background_tasks.add_task(generate_simulated_eeg, store)
    return {"msg": "Simulating headset data..."}


@fastapp.get("/api/stop-simulated-headset")
async def stop_simulator():
    store.publish("stop-simulator")
    return {"msg": "Stopping simulated headset data..."}


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


# region Training state
@sio.on("set-training-btn-state")
def set_training_btn_state(sid, value):
    store.set("training_btn_state", value)  # "start" or "stop"


def training_btn_state_change_handler(payload):
    print(f"[green]training_btn_state: {payload}[/green]")
    value = payload.get("value")
    match value:
        case "start":
            flicktok_model.start_training()
        case "stop":
            flicktok_model.stop_training()
        case _:
            pass


store.on_change(
    "training_btn_state",
    training_btn_state_change_handler,
)


def notify_client_of_training_status(payload):
    console.log(f"[green]training_status: {payload}[/green]")
    data_to_send_clientside = {
        "id": "training-status-changed",
        "data": {
            "state": payload.get("value").state.name,
            "trials": payload.get("value").trials,
        },
    }
    asyncio.get_event_loop().create_task(
        sio.emit(
            "fromPython",
            data_to_send_clientside,
        )
    )
    # try:
    #     loop = asyncio.get_event_loop()
    #     if not loop.is_running():
    #         loop.run_until_complete(
    #             sio.emit(
    #                 "fromPython",
    #                 data_to_send_clientside,
    #             )
    #         )
    # except RuntimeError:
    #     asyncio.run(
    #         sio.emit(
    #             "fromPython",
    #             data_to_send_clientside,
    #         )
    #     )


store.on_change("training_status", notify_client_of_training_status)

# endregion
