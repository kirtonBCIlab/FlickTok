import time
import threading
import numpy as np

from pylsl import StreamInfo, StreamOutlet

from .helpers import console


def simulate_eeg(store):

    terminate = False

    def stop_simulator():
        nonlocal terminate
        terminate = True

    store.subscribe("stop-headset-simulator", stop_simulator)

    # This is what comes from an Emotiv EPOC+ headset LSL streamed via EmotivPro
    # Using a lower rate to be nice to network, the sim just sends dummy data so this shouldn't matter
    fsample = 10
    psample = 1.0 / fsample
    channel_names = [
        "Timestamp",
        "Counter",
        "Interpolate",
        "AF3",
        "F7",
        "F3",
        "FC5",
        "T7",
        "P7",
        "O1",
        "O2",
        "P8",
        "T8",
        "FC6",
        "F4",
        "F8",
        "AF4",
        "HardwareMarker",
        "Markers",
    ]
    n_channels = len(channel_names)

    # Create the outlet StreamInfo with extended data
    # https://github.com/sccn/xdf/wiki/EEG-Meta-Data
    stream_info = StreamInfo(
        "Headset Sim", "EEG", n_channels, fsample, "float32", "EmotivSimEEG"
    )
    channel_info = stream_info.desc().append_child("channels")
    for label in channel_names:
        ch = channel_info.append_child("channel")
        ch.append_child_value("label", label)
        ch.append_child_value("unit", "microvolts")
        ch.append_child_value("type", "EEG")

    outlet = StreamOutlet(stream_info)

    published_to_store = False

    console.log("[blue]Starting headset simulator...[/blue]")

    # Spew out random samples
    while True:
        sample = np.random.uniform(0.0, 1.0, n_channels)
        outlet.push_sample(sample)

        time.sleep(psample)
        if terminate:
            console.log("[red]Stopping headset simulator...[/red]")
            store.unsubscribe("stop-headset-simulator", stop_simulator)
            break

        if not published_to_store:
            store.publish("headset-simulator-started")
            published_to_store = True


def generate_simulated_eeg(store):
    thread = threading.Thread(target=simulate_eeg, args=(store,))
    thread.daemon = True  # Die when parent dies
    thread.start()
