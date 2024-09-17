import threading
import asyncio

from enum import Enum
from dataclasses import dataclass

# from pylsl import resolve_byprop
from pylsl import ContinuousResolver

from .Bessy import Bessy
from .EmotivEegSource import EmotivEegSource
from .FesDevice import FesDevice

from .utils.helpers import console


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
        self.eeg_scan_seconds = 5
        self.preroll_seconds = 1
        self.rest_seconds = 4
        self.action_seconds = 4
        self.number_of_trials = 20
        self.prediction_seconds = 1
        self.prediction_rest_seconds = 7

        self.__initialize_eeg_scanning()
        self.__initialize_fes_device()
        self.__initialize_bessy()

    def __check_for_eeg_streams(self):
        # streams = resolve_byprop("type", "EEG", 0, 0.1)
        streams = self.__eeg_stream_resolver.results()
        self.eeg_stream_is_available = len(streams) > 0
        self.store.set("eeg_stream_is_available", self.eeg_stream_is_available)
        # Restart the timer for continuous checking
        self.__initialize_eeg_scanning()

    def __initialize_eeg_scanning(self):
        self.__eeg_stream_resolver = ContinuousResolver("type", "EEG")
        self.eeg_scan_timer = threading.Timer(
            self.eeg_scan_seconds, self.__check_for_eeg_streams
        )
        self.eeg_scan_timer.start()

    def __initialize_fes_device(self):
        self.__fes_device = FesDevice()

    async def perform_fes_swipe(self):
        await self.__fes_device.swipe()

    async def start_training(self):
        # Initialize Bessy and connect an Eeg source (note - init freezes if stream not available).
        # TODO - place a guard here to cancel training if EEG stream not available.
        # TODO - replace EmotivEegSource with whatever we're using for FlickTok
        self.__bessy.connect_eeg_source(EmotivEegSource())
        self.__bessy.start_eeg_processing()
        self.__bessy.start_training_session()

        # Kick off state machine that runs training sequence
        self.__training_state = TrainingState.Start
        self.__trial_count = 0
        await self.__perform_training_step()

    async def stop_training(self):
        self.__training_state = TrainingState.Stop
        self.__bessy.stop_eeg_processing()
        await self.__send_training_status()

    async def start_async_fn_with_delay(self, fn, delay_seconds):
        await asyncio.sleep(delay_seconds)
        await fn()

    async def __perform_training_step(self):
        # This is a state machine that alternately marks rest and action classes.
        # When marking is complete, Bessy replies with a trial_complete signal.
        # We use this signal to call this function again, thereby creating a loop.

        match self.__training_state:

            case TrainingState.Start:
                await self.__send_training_status()
                self.__trial_count = 0
                self.__training_state = TrainingState.Rest
                # self.start_fn_with_delay(
                #     self.__perform_training_step, self.preroll_seconds
                # )
                await self.start_async_fn_with_delay(
                    self.__perform_training_step, self.preroll_seconds
                )

            case TrainingState.Rest:
                if self.__trial_count < self.number_of_trials:
                    self.__trial_count += 1
                    await self.__send_training_status()
                    self.__bessy.mark_trial(
                        TrainingLabels.Rest.value, self.rest_seconds
                    )
                    self.__training_state = TrainingState.Action
                else:
                    self.__training_state = TrainingState.Complete
                    await self.__send_training_status()
                    self.__bessy.end_training_session()
                    self.__bessy.train_classifier()

            case TrainingState.Action:
                await self.__send_training_status()
                self.__bessy.mark_trial(
                    TrainingLabels.Action.value, self.action_seconds
                )
                self.__training_state = TrainingState.Rest

    async def __send_training_status(self):
        status = TrainingStatus(self.__training_state, self.__trial_count)
        console.log("[purple]set-training-status[/purple]")
        await self.sio.emit(
            "fromPython",
            {
                "id": "set-training-status",
                "data": {
                    "state": status.state.name.lower(),
                    "trialCount": status.trials,
                },
            },
        )
        # self.store.set("training_status", status)
        # self.training_status_changed.emit(status)

    # prediction_status_changed = Signal(PredictionState)
    # action_detected = Signal(bool)

    async def start_predicting(self):
        # Kick off state machine that starts prediction sequence
        self.__prediction_state = PredictionState.Rest
        await self.__perform_prediction_step()

    async def stop_predicting(self):
        self.__prediction_state = PredictionState.Stop
        await self.__send_prediction_status()

    async def restart_predicting(self):
        if self.__prediction_state == PredictionState.Action:
            self.__prediction_state = PredictionState.Rest
            await self.__send_prediction_status()

    async def __perform_prediction_step(self):
        # This state machine transitions from rest to action state where it will periodically
        # ask Bessy for predicitons.  It will stay in the action state until Bessy predicts the
        # action label.  Bessy provides predictions via the prediction_complete signal which
        # is processed by by __process_prediction() below
        while True:
            match self.__prediction_state:
                case PredictionState.Rest:
                    await self.__send_prediction_status()
                    self.__prediction_state = PredictionState.Action
                    await asyncio.sleep(self.prediction_rest_seconds)
                    # await self.start_async_fn_with_delay(
                    #     self.__perform_prediction_step, self.rest_seconds
                    # )
                    # self.start_fn_with_delay(
                    #     self.__perform_prediction_step, self.rest_seconds
                    # )
                    # QTimer.singleShot(self.rest_seconds * 1000, self.__perform_prediction_step)

                case PredictionState.Action:
                    await self.__send_prediction_status()
                    self.__bessy.make_prediction(self.prediction_seconds)
                    await asyncio.sleep(self.action_seconds)
                    # await self.start_async_fn_with_delay(
                    #     self.__perform_prediction_step, self.action_seconds
                    # )
                    # self.start_fn_with_delay(
                    #     self.__perform_prediction_step, self.action_seconds
                    # )
                    # QTimer.singleShot(self.action_seconds * 1000, self.__perform_prediction_step)

                case PredictionState.Stop:
                    break

    async def __process_prediction(self, label: int, probabilities: list):
        if label == TrainingLabels.Action.value:
            # self.action_detected.emit(True)
            # self.store.emit("action_detected", True)
            await self.perform_fes_swipe()
            await self.sio.emit(
                "fromPython", {"id": "action-detected", "data": {"value": True}}
            )
            self.__prediction_state = PredictionState.Rest

    async def __send_prediction_status(self):
        # self.prediction_status_changed.emit(self.__prediction_state)
        pred_state_reverse_mapping = {
            value: key
            for key, value in vars(PredictionState).items()
            if not key.startswith("_")
        }
        console.log("[purple]set-prediction-status[/purple]")
        await self.sio.emit(
            "fromPython",
            {
                "id": "set-prediction-status",
                "data": {
                    "state": pred_state_reverse_mapping.get(
                        self.__prediction_state
                    ).lower()
                },
            },
        )

    def __initialize_bessy(self):
        self.__trial_count = 0
        self.__training_state = TrainingState.Stop
        self.__prediction_state = PredictionState.Stop
        self.__bessy = Bessy(
            num_classes=len(TrainingLabels),
            store=self.store,
            perform_training_step=self.__perform_training_step,
            process_prediction=self.__process_prediction,
        )
        # self.store.subscribe(
        #     "trial_complete",
        #     lambda payload: self.__perform_training_step(),
        # )
        # self.store.subscribe(
        #     "prediction_complete",
        #     lambda payload: self.__process_prediction(
        #         payload.get("value")[0], payload.get("value")[1]
        #     ),
        # )
        # self.__bessy.output.trial_complete.connect(self.__perform_training_step)
        # self.__bessy.output.prediction_complete.connect(self.__process_prediction)
