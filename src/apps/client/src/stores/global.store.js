import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";

let globalStore = proxy({
  eegStreamIsAvailable: undefined,
  ui: {
    trainingBtn: {},
  },

  __fns: {},
});

globalStore.__fns.set = (key, value) => (globalStore[key] = value);
globalStore.__fns.get = (key) => globalStore[key];
globalStore.__fns.subscribe = (key, fn) => subscribeKey(globalStore, key, fn);
globalStore.__fns.send = (id, data) => {
  window.api.send("toMain", { id, data });
};

globalStore.__fns.initialize = () => {
  window.api.send("toMain", { id: "req:eeg-stream-availability" });
};

if (window.api) {
  window.api.receive("fromMain", ({ id, data }) => {
    switch (id) {
      case "py:eeg-stream-availability-updated":
        globalStore.eegStreamIsAvailable = data.value;
        break;
    }
  });
}

export default globalStore;
