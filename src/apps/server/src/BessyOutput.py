import asyncio
from bci_essentials.io.messenger import Messenger
from bci_essentials.classification.generic_classifier import Prediction

from .utils.helpers import console


class BessyOutput(Messenger):
    """BessyOutput is a Messenger object that converts output from Bessy
    into Qt signals (ie: events)

    """

    def __init__(self, store, perform_training_step, process_prediction):
        super().__init__()
        self.__ping_count = 0
        self.store = store
        self.perform_training_step = perform_training_step
        self.process_prediction = process_prediction

    # TODO - find a way to have Bessy class emit these instead of bessy.output.signal
    # bessy_ping_received = Signal(int)
    # trial_complete = Signal(int)
    # prediction_complete = Signal(int, list)

    def ping(self):
        """Implements Messenger.ping()"""
        self.__ping_count += 1
        # self.bessy_ping_received.emit(self.__ping_count)
        self.store.set("ping_count", self.__ping_count)

    def marker_received(self, marker):
        """Implements Messenger.marker_received()"""
        # received format is the same as what's sent on input side:
        # "command_string" or "mi,label_count,label,window_length"
        info = marker.split(",")

        # handle mi marker reply, send when trial complete.  if the label
        # is -1, then this is a reply to a predcition request, which we ignore
        if len(info) == 4:
            label = int(info[2])
            if label >= 0:
                console.log(f"[green]trial-complete: {label}[/green]")
                asyncio.create_task(self.perform_training_step())
                # asyncio.run(self.perform_training_step())
                # self.store.set("trial_complete", label)
                # self.trial_complete.emit(label)

    # HERE IS WHERE PROCESS PREDICTION IS CALLED
    def prediction(self, prediction: Prediction):
        """Implements Messenger.prediction()"""
        # Prediction supports multiple predictions, organized as follows:
        # labels: list[int]               <--- predicted class labels
        # predictions: list[list[float]]  <--- probabilities of labels (one list per predicion)
        for label, probabilities in zip(prediction.labels, prediction.probabilities):
            # self.prediction_complete.emit(int(label), probabilities)
            # self.store.set("prediction_complete", (int(label), probabilities))
            try:
                asyncio.create_task(self.process_prediction(label, probabilities))
                # asyncio.run(self.process_prediction(label, probabilities))
            except ValueError:
                # TODO - double check this; process_prediction(label, probabilities) doesn't always return a coroutine?
                pass
