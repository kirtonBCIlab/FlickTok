import threading


def delayed_exec(delay, func):
    def wrapper():
        func()

    t = threading.Timer(delay, wrapper)
    t.start()
