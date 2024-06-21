import asyncio
import socketio
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .utils.helpers import fifo_worker, delayed_exec, console
from .utils.store import Store
from .utils.headset_sim_fn import generate_simulated_eeg
from .FlickTokModel import FlickTokModel

connected_clients = set()  # if we want to keep track of connected clients

# In-memory pub/sub store
store = Store(
    eeg_stream_is_available=False,
    training_btn_state="",
    training_status=None,
    trial_complete=False,
)


async def on_startup(app: FastAPI):
    # Startup logic
    asyncio.create_task(fifo_worker())


async def on_shutdown(app: FastAPI):
    # Shutdown logic
    store.publish("stop-headset-simulator")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await on_startup(app)
    yield
    await on_shutdown(app)


fastapp = FastAPI()
fastapp.add_middleware(CORSMiddleware, allow_origins=["*"])
fastapp.fifo_queue = (
    asyncio.Queue()
)  # can use via `await fastapp.fifo_queue.put(lambda: ...)`

sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
app = socketio.ASGIApp(sio, other_asgi_app=fastapp)

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
    console.log(f"[cyan]Running FES test...[/cyan]")


# Healthcheck endpoint to verify the http server is running
@fastapp.get("/api/healthcheck")
async def healthcheck():
    return {"status": "ok"}


@fastapp.get("/api/start-headset-simulator")
async def start_headset_simulator(background_tasks: BackgroundTasks):
    background_tasks.add_task(generate_simulated_eeg, store)
    return {"msg": "Simulating headset data..."}


@fastapp.get("/api/stop-headset-simulator")
async def stop_headset_simulator():
    store.publish("stop-headset-simulator")
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
