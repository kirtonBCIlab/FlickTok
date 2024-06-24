import { proxy, subscribe } from "valtio";
import { subscribeKey } from "valtio/utils";

let globalStore = proxy({
  connectedToServer: false,
  eegStreamIsAvailable: false,
  page: "index",
  ui: {
    trainingBtn: {
      text: "",
      state: "",
    },
    trainingState: {
      state: "stop",
      trialCount: 0,
      bgColors: {
        start: "bg-slate-500",
        stop: "bg-slate-500",
        rest: "bg-red-500",
        action: "bg-green-500",
        complete: "bg-slate-500",
      },
      text: {
        start: "Training starting",
        stop: "Training stopped",
        rest: "Rest",
        action: "Action",
        complete: "Training complete",
      },
    },

    predictionBtn: {
      text: "",
      state: "",
    },
    predictionState: {
      state: "stop",
      bgColors: {
        start: "bg-slate-500",
        stop: "bg-slate-500",
        rest: "bg-red-500",
        action: "bg-green-500",
        complete: "bg-slate-500",
      },
      text: {
        start: "Predictions starting",
        stop: "Predictions stopped",
        rest: "Rest",
        action: "Action",
        complete: "Predictions complete",
      },
    },
  },

  __fns: {},
});

globalStore.__fns.set = (key, value) => (globalStore[key] = value);
globalStore.__fns.get = (key) => globalStore[key];
globalStore.__fns.subscribeKey = (key, fn) =>
  subscribeKey(globalStore, key, fn);
globalStore.__fns.subscribe = (fn) => subscribe(globalStore, fn);
globalStore.__fns.send = (id, data) => {
  window.api.send("toMain", { id, data });
};

globalStore.__fns.initialize = () => {
  window.api.send("toMain", { id: "req:ping" });
  window.api.send("toMain", { id: "req:eeg-stream-availability" });
};

globalStore.__fns.subscribeKey("connectedToServer", (v) => {
  if (!v) {
    globalStore.eegStreamIsAvailable = false;
  }
});

if (window.api) {
  window.api.receive("fromMain", ({ id, data }) => {
    switch (id) {
      case "py:res:pong":
      case "py:connect":
        globalStore.connectedToServer = true;
        break;
      case "py:disconnect":
        globalStore.connectedToServer = false;
        break;
      case "py:eeg-stream-availability-updated":
        globalStore.eegStreamIsAvailable = data.value;
        break;
      case "py:set-training-status":
        globalStore.ui.trainingState.state = data.state;
        globalStore.ui.trainingState.trialCount = data.trialCount;
        break;
      case "py:set-prediction-status":
        globalStore.ui.predictionState.state = data.state;
        break;
    }
  });
}

export default globalStore;
