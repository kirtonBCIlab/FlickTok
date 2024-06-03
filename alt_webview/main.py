from dotenv import load_dotenv

load_dotenv()

import webview
import numpy as np


class Api:
    def __init__(self) -> None:
        self.reelInfo = {
            "id": None,
            "duration": None,
            "currentTime": None,
        }

    def dispatch(self, id, data=None):
        match id:
            case "reels-loaded":
                webview.windows[0].evaluate_js("getCurrentReelInfoRequest()")
            case "set-current-reel-info":
                self.reelInfo = data
                self.dispatch("loaded-new-reel")
            case "loaded_new_reel":
                reelId, reel_duration, reel_current_time = (
                    self.reelInfo["id"],
                    self.reelInfo["duration"],
                    self.reelInfo["currentTime"],
                )
                rand_break_time = np.random.uniform(
                    reel_current_time, reel_current_time + reel_duration
                )
                rand_break_time = min(rand_break_time, np.random.uniform(7, 10))
                webview.windows[0].evaluate_js(
                    "switchToNewReelAtTime({reelId: {%s}, time: {%s}})".format(
                        reelId, rand_break_time
                    )
                )


def preload(window) -> None:
    helpers_js = open("helpers.js", "r").read()
    preload_js = open("preload.js", "r").read()
    print(helpers_js)
    window.evaluate_js(helpers_js)
    # window.evaluate_js(preload_js)


def start() -> None:
    win = webview.create_window(
        "Instagram", "https://instagram.com/reels", js_api=Api()
    )
    webview.start(preload, win, debug=True)


if __name__ == "__main__":
    start()
