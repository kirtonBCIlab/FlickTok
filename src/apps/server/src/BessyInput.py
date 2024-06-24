from pylsl import local_clock

from bci_essentials.io.sources import MarkerSource
from .BessyLSLMessenger import BessyLSLMessenger


class BessyInput(MarkerSource):
    """BessyInput is a MarkerSource object that feeds markers to Bessy.  Marker
    messages are queued up for Bessy to pop off and process.

    """

    def __init__(self):
        super().__init__()
        self.__reset_queue()
        self.__lsl_messenger = BessyLSLMessenger()

    def queue_marker(self, message):
        """Adds a message and timestamp to a queue for Bessy to read"""
        timestamp = local_clock()
        self.__timestamps.append(timestamp)
        self.__messages.append([message])

    """Implements MarkerSource.name property"""
    name = "BessyInput"

    def get_markers(self) -> tuple[list[list], list]:
        """Implements MarkerSource.get_markers()"""
        self.__lsl_messenger.send_markers(self.__messages, self.__timestamps)
        markers = [self.__messages, self.__timestamps]
        self.__reset_queue()
        return markers

    def time_correction(self) -> float:
        """Implements MarkerSource.time_correction()"""
        return 0.0

    def __reset_queue(self):
        """Reset the queue"""
        self.__messages = []
        self.__timestamps = []
