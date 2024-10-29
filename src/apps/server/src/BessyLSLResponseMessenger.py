# Temporarily adding in stream information for PyLSL here to output markers to LSL instead of the console
from pylsl import StreamInfo, StreamOutlet


class BessyLSLResponseMessenger:
    """BessyLSLMessenger is a Messenger object that sends markers to LSL
    instead of the console.

    """

    def __init__(self):
        # super().__init__()
        try:
            info = StreamInfo(
                name="Python_LSL_Response_Messenger",
                type="LSL_Marker_Strings",
                channel_count=1,
                nominal_srate=0,
                channel_format="string",
                source_id="MyStreamID_Python1234",
            )
            self.__outlet = StreamOutlet(info)
            self.__outlet.push_sample(
                ["Python_LSL_Messenger is now sending markers to LSL"]
            )
        except Exception as e:
            print("Failed to create LSL stream: ", e)
            self.__outlet = None

    def send_markers(self, markers: list[list], timestamps: list):
        """Publish the array of markers (each marker is an array) along with the corresponding timestamps"""
        for marker, timestamp in zip(markers, timestamps):
            self.__outlet.push_sample(marker, timestamp)