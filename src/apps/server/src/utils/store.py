import asyncio


class Store:

    @property
    def listeners(self) -> dict:
        return self._listeners

    @property
    def data(self) -> dict:
        return self._data

    def __init__(self, *args, **kwargs) -> None:
        self._data = {}
        for arg in args:
            self._data.update(arg)
        self._data.update(kwargs)
        self._listeners = {"*": []}

    def set(self, key: str, value: any) -> None:
        prev_value = self._data.get(key)
        self._data[key] = value
        self.publish(
            key,
            {
                "value": value,
                "prev_value": prev_value,
                "action": "set",
                "changed": value != prev_value,
            },
        )

    def get(self, key: str) -> any:
        return self._data.get(key)

    def on_change(self, key: str, listener: callable) -> None:
        def on_change_listener(payload: dict) -> None:
            if key == "*" or key == key and payload.get("changed", False):
                listener(payload)

        self.subscribe(key, on_change_listener)
        return lambda: self.unsubscribe(key, on_change_listener)

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
            # if asyncio.iscoroutinefunction(listener):
            #     asyncio.create_task(listener(*args, **kwargs))
            # else:
            #     listener(*args, **kwargs)

    def clear_listeners(self) -> None:
        self._listeners = {"*": []}

    def clear_key_listeners(self, key: str) -> None:
        self._listeners[key] = []

    # Aliases
    dispatch = publish
    emit = publish
    on = subscribe
    off = unsubscribe
