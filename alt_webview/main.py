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
                print("Reels loaded...")
                webview.windows[0].evaluate_js("window.getCurrentReelInfoRequest()")
            case "set-current-reel-info":
                print("Setting current reel info...", data)
                self.reelInfo = data
                self.dispatch("loaded-new-reel")
            case "loaded-new-reel":
                print("Loaded new reel...")
                reelId, reel_duration, reel_current_time = (
                    self.reelInfo["id"],
                    self.reelInfo["duration"],
                    self.reelInfo["currentTime"],
                )
                print(reelId, reel_duration, reel_current_time)
                rand_break_time = np.random.uniform(
                    reel_current_time, reel_current_time + reel_duration
                )
                rand_break_time = min(rand_break_time, np.random.uniform(7, 10))
                webview.windows[0].evaluate_js(
                    "window.switchToNewReelAtTimeRequest({reelId:'%s', time:%s})"
                    % (reelId, rand_break_time)
                )
            case "url-changed":
                print("URL changed...", data)
                if (
                    "instagram.com/reels" in data
                    and data.split("/")[-1] != self.reelInfo["id"]
                ):
                    self.dispatch("reels-loaded")
            case _:
                print("Unknown message...", id)


def preload(window) -> None:
    helpers_js = open("helpers.js", "r").read()
    preload_js = open("preload.js", "r").read()
    window.evaluate_js(helpers_js)
    window.evaluate_js(preload_js)


def start() -> None:
    win = webview.create_window(
        "Instagram Reels", "https://instagram.com/reels", js_api=Api()
    )
    webview.start(preload, win, debug=False)


if __name__ == "__main__":
    start()
