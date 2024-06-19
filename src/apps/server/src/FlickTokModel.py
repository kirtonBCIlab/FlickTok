import threading
import time
import asyncio

from enum import Enum
from dataclasses import dataclass

from pylsl import resolve_byprop

from .Bessy import Bessy
from .EmotivEegSource import EmotivEegSource

from .utils.helpers import delayed_exec


class TrainingLabels(Enum):
    Rest = 0
    Action = 1


class TrainingState(Enum):
    Stop = 1
    Start = 2
    Rest = 3
    Action = 4
    Complete = 5


@dataclass
class TrainingStatus:
    state: TrainingState
    trials: int


class PredictionState:
    Stop = 1
    Rest = 2
    Action = 3


class FlickTokModel:

    eeg_stream_is_available = False

    def __init__(self, store, sio):
        super().__init__()

        self.store = store
        self.sio = sio

        # settings
        self.eeg_scan_seconds = 1
        self.preroll_seconds = 1
        self.rest_seconds = 2
        self.action_seconds = 2
        self.number_of_trials = 3
        self.prediction_seconds = 1

        self.__initialize_eeg_scanning()
        self.__initialize_bessy()

    def __check_for_eeg_streams(self):
        streams = resolve_byprop("type", "EEG", 0, 0.1)
        self.eeg_stream_is_available = len(streams) > 0
        self.store.set("eeg_stream_is_available", self.eeg_stream_is_available)
        # Restart the timer for continuous checking
        self.__initialize_eeg_scanning()

    def __initialize_eeg_scanning(self):
        self.eeg_scan_timer = threading.Timer(
            self.eeg_scan_seconds, self.__check_for_eeg_streams
        )
        self.eeg_scan_timer.start()

    def start_training(self):
        # Initialize Bessy and connect an Eeg source (note - init freezes if stream not available).
        # TODO - place a guard here to cancel training if EEG stream not available.
        # TODO - replace EmotivEegSource with whatever we're using for FlickTok
        self.__bessy.connect_eeg_source(EmotivEegSource())
        self.__bessy.start_eeg_processing()
        self.__bessy.start_training_session()

        # Kick off state machine that runs training sequence
        self.__training_state = TrainingState.Start
        self.__trial_count = 0
        # asyncio.get_event_loop().create_task(self.__perform_training_step())
        self.__perform_training_step()

    def stop_training(self):
        self.__training_state = TrainingState.Stop
        self.__bessy.stop_eeg_processing()
        self.__send_training_status()

    def delayed_call(self, delay):
        time.sleep(delay)
        self.__perform_training_step()
        # await asyncio.sleep(delay)
        # await self.__perform_training_step()

    def __perform_training_step(self):
        # This is a state machine that alternately marks rest and action classes.
        # When marking is complete, Bessy replies with a trial_complete signal.
        # We use this signal to call this function again, thereby creating a loop.
        match self.__training_state:

            case TrainingState.Start:
                self.__send_training_status()
                self.__trial_count = 0
                self.__training_state = TrainingState.Rest
                # QTimer.singleShot(self.preroll_seconds * 1000, self.__perform_training_step)
                # delayed_exec(self.preroll_seconds, self.__perform_training_step)
                self.delayed_call(self.preroll_seconds)
                # asyncio.get_event_loop().create_task(
                #     self.delayed_call(self.preroll_seconds)
                # )

            case TrainingState.Rest:
                if self.__trial_count < self.number_of_trials:
                    self.__trial_count += 1
                    self.__send_training_status()
                    self.__bessy.mark_trial(
                        TrainingLabels.Rest.value, self.rest_seconds
                    )
                    self.__training_state = TrainingState.Action
                else:
                    self.__training_state = TrainingState.Complete
                    self.__send_training_status()
                    self.__bessy.end_training_session()

            case TrainingState.Action:
                self.__send_training_status()
                self.__bessy.mark_trial(
                    TrainingLabels.Action.value, self.action_seconds
                )
                self.__training_state = TrainingState.Rest

    def __send_training_status(self):
        status = TrainingStatus(self.__training_state, self.__trial_count)
        self.store.set("training_status", status)
        # self.training_status_changed.emit(status)

    def __initialize_bessy(self):
        self.__trial_count = 0
        self.__training_state = TrainingState.Stop
        self.__prediction_state = PredictionState.Stop
        self.__bessy = Bessy(num_classes=len(TrainingLabels), store=self.store)
        self.store.on_change(
            "trial_complete",
            lambda payload: asyncio.run(self.__perform_training_step()),
        )
        # self.__bessy.output.trial_complete.connect(self.__perform_training_step)
        # self.__bessy.output.prediction_complete.connect(self.__process_prediction)
