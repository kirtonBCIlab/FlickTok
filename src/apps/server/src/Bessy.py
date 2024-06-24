import time
import threading
import asyncio
from bci_essentials.eeg_data import EegData
from bci_essentials.classification.mi_classifier import MiClassifier
from bci_essentials.io.lsl_sources import EegSource

from .BessyInput import BessyInput
from .BessyOutput import BessyOutput

from .utils.store import Store


class Bessy:
    """Bessy is a wrapper class for bci_essentilas.EegData that makes it compatible
    with Qt signals and slots (ie: event system).

    After creating the object, use Bessy.connect_eeg_source() to provide a
    source of EEG data to Bessy.  Start processing eeg with Bessy.start_eeg_processing().
    The remaining public functions control what Bessy does, ex: train / predict.

    Output from Bessy is provided as Qt signals.  See BessyOutput for more information.

    """

    def __init__(self, num_classes: int, store: Store = None):
        super().__init__()

        self.__num_classes = num_classes
        self.__bessy_step_msec = 200

        # TODO - find a way to have the output signals in this classs to avoid having to make
        # the BessyOutput public.  That way we can do: bessy.some_signal.connect(my_slot) instead
        # of bessy.output.some_signal.connect(my_slot)
        self.output = BessyOutput(store)
        self.__input = BessyInput()

        self.__bessy = None
        self.__eeg_source = None

    def connect_eeg_source(self, eeg: EegSource):
        self.__eeg_source = eeg

    def start_eeg_processing(self):
        if self.__bessy is None and self.__eeg_source is not None:
            self.__setup_bessy()

    def stop_eeg_processing(self):
        if self.__bessy is not None:
            self.__kill_bessy()

    def save_data(self, file_path: str):
        if self.__bessy is not None:
            self.__bessy.save_trials_as_npz(file_path)

    def start_training_session(self):
        """Mark the start of a training data set"""
        self.__input.queue_marker("Trial Started")

    def end_training_session(self):
        """Mark the end of the training data set"""
        # TODO - bessy will crash if we end trial without marking anything
        self.__input.queue_marker("Trial Ends")

    def mark_trial(self, label: int, duration: int):
        """Mark a trial in the data set"""
        # paradigm (mi = motor imagery), num options, label, length
        message = "mi,{0},{1},{2}".format(self.__num_classes, label, duration)
        self.__input.queue_marker(message)

    def train_classifier(self):
        """Tell Bessy to train the classifier using available data set"""
        self.__input.queue_marker("Update Classifier")

    def make_prediction(self, duration: int = 2):
        """Tell Bessy to make a prediction from current data using currently trained classifier"""
        label = -1
        # paradigm (mi = motor imagery), num options, label, length
        # where a label of -1 triggers a prediction
        message = "mi,{0},{1},{2}".format(self.__num_classes, label, duration)
        self.__input.queue_marker(message)

    # training_loop_stop_event = threading.Event()

    # def __training_loop(self):
    #     while not self.training_loop_stop_event.is_set():
    #         self.__bessy_step()
    #         time.sleep(self.__bessy_step_msec / 1000)

    training_loop_task = None

    async def __training_loop(self):
        while True:
            self.__bessy_step()
            await asyncio.sleep(self.__bessy_step_msec / 1000)

    def start_training_loop(self):
        self.training_loop_task = asyncio.get_event_loop().create_task(
            self.__training_loop()
        )
        # self.training_loop_task = asyncio.create_task(self.__training_loop())

    def __setup_bessy(self):
        # Set up Bessy with motor imagery classifier, not really sure about options
        classifier = MiClassifier()
        classifier.set_mi_classifier_settings(n_splits=3, type="TS", random_seed=35)

        # Create an EegData and initialize for online training
        self.__bessy = EegData(classifier, self.__eeg_source, self.__input, self.output)
        self.__bessy.setup(online=True, training=True, pp_type=None)

        # Start a periodic timer to process messages from bessy.
        # self.__loop_timer.timeout.connect(self.__bessy_step)
        # self.__loop_timer.start(self.__bessy_step_msec)

        # thread = threading.Thread(target=self.__training_loop)
        # thread.daemon = True  # Die when parent dies
        # thread.start()
        self.start_training_loop()

    def __kill_bessy(self):
        # Stop the loop timer and free bessy
        # self.__loop_timer.stop()
        # self.__loop_timer.timeout.disconnect()
        # self.training_loop_stop_event.set()
        if self.training_loop_task:
            self.training_loop_task.cancel()
            self.training_loop_task = None
        self.__bessy = None

    # This runs one loop of bessy, aka EegData
    # @Slot()
    def __bessy_step(self):
        self.__bessy.step()