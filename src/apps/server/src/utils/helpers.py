import threading
from rich.console import Console

console = Console()  # Prints colored text to the terminal


def delayed_exec(delay, func):
    def wrapper():
        func()

    t = threading.Timer(delay, wrapper)
    t.start()


async def fifo_worker(fastapp):
    while True:
        job = await fastapp.fifo_queue.get()
        try:
            await job()
        finally:
            fastapp.fifo_queue.task_done()


class StoppableTask:
    def __init__(self, fn):
        self._stop_event = threading.Event()
        self._fn = fn

    def stop(self):
        self._stop_event.set()

    def stopped(self):
        return self._stop_event.is_set()

    def run_task(self, *args, **kwargs):
        while not self.stopped():
            self._fn(*args, **kwargs)
