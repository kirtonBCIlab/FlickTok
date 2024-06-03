from dotenv import load_dotenv
load_dotenv()

import webview

def start() -> None:
    webview.create_window('Instagram', 'https://instagram.com/reels')
    webview.start()


if __name__ == "__main__":
    start()
