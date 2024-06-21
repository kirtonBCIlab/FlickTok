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
