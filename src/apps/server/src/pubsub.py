class Store:

    @property
    def listeners(self) -> dict:
        return self._listeners

    def __init__(self, *args, **kwargs) -> None:
        self._listeners = {"*": []}

    def subscribe(self, key: str, listener: callable) -> None:
        self._listeners.setdefault(key, []).append(listener)

    def unsubscribe(self, key: str, listener: callable) -> None:
        if key in self._listeners and listener in self._listeners[key]:
            self._listeners[key].remove(listener)

    def publish(self, key: str, *args, **kwargs) -> None:
        if key not in self._listeners:
            return
        for listener in self._listeners.get(key, []) + self._listeners.get("*", []):
            listener(*args, **kwargs)

    def clear_listeners(self) -> None:
        self._listeners = {"*": []}

    # Aliases
    dispatch = publish
    on = subscribe
    off = unsubscribe
