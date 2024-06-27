import { proxy, subscribe } from "valtio";
import { subscribeKey } from "valtio/utils";

let globalStore = proxy({
  connectedToServer: false,
  eegStreamIsAvailable: false,
  page: "index",
  settings: {
    selected: {
      socialMedia: "instagram",
      movement: "none",
    },
    options: {
      socialMedia: {
        instagram: {
          url: "https://instagram.com/reels",
          title: "Instagram Reels",
        },
        youtube: {
          url: "https://youtube.com/shorts",
          title: "YouTube Shorts",
        },
      },
      movement: {
        thumbAviduction: "Thumb Aviduction",
        flexion: "Flexion",
        wristExtension: "Wrist Extension",
        none: "None",
      }
    },
  },
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
      icon: {
        start: "thumb-avi-rest",
        stop: "thumb-avi-rest",
        rest: "thumb-avi-rest",
        action: "thumb-avi-action",
        complete: "celebrate",
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
        actionDetected: "bg-blue-500",
        complete: "bg-slate-500",
      },
      text: {
        start: "Predictions starting",
        stop: "Predictions stopped",
        rest: "Rest",
        action: "Action",
        actionDetected: "Yay!",
        complete: "Predictions complete",
      },
      icon: {
        start: "thumb-avi-rest-small",
        stop: "thumb-avi-rest-small",
        rest: "thumb-avi-rest-small",
        action: "thumb-avi-action-small",
        actionDetected: "celebrate-small",
      },
    },
  },

  __fns: {},
});

globalStore.__fns.set = (key, value) => (globalStore[key] = value);
globalStore.__fns.get = (key) => globalStore[key];
globalStore.__fns.subscribeKeyValtio = subscribeKey;
globalStore.__fns.subscribeKey = (key, fn) =>
  subscribeKey(globalStore, key, fn);
globalStore.__fns.subscribe = (fn) => subscribe(globalStore, fn);
globalStore.__fns.send = (id, data) => {
  window.api.send("toMain", { id, data });
};

// Define icon mappings
const movementIcons = {
  thumbAviduction: {
    training: {
      start: "thumb-avi-rest",
      stop: "thumb-avi-rest",
      rest: "thumb-avi-rest",
      action: "thumb-avi-action",
      complete: "celebrate",
    },
    prediction: {
      start: "thumb-avi-rest-small",
      stop: "thumb-avi-rest-small",
      rest: "thumb-avi-rest-small",
      action: "thumb-avi-action-small",
      actionDetected: "celebrate-small",
    },
  },
  flexion: {
    training: {
      start: "extension-flexion-rest",
      stop: "extension-flexion-rest",
      rest: "extension-flexion-rest",
      action: "flexion-action",
      complete: "celebrate",
    },
    prediction: {
      start: "extension-flexion-rest-small",
      stop: "extension-flexion-rest-small",
      rest: "extension-flexion-rest-small",
      action: "flexion-action-small",
      actionDetected: "celebrate-small",
    },
  },
  wristExtension: {
    training: {
      start: "extension-flexion-rest",
      stop: "extension-flexion-rest",
      rest: "extension-flexion-rest",
      action: "extenstion-action",
      complete: "celebrate",
    },
    prediction: {
      start: "extension-flexion-rest-small",
      stop: "extension-flexion-rest-small",
      rest: "extension-flexion-rest-small",
      action: "extenstion-action-small",
      actionDetected: "celebrate-small",
    },
  },
  none: {
    training: {
      start: "empty",
      stop: "empty",
      rest: "empty",
      action: "empty",
      complete: "celebrate",
    },
    prediction: {
      start: "empty",
      stop: "empty",
      rest: "empty",
      action: "empty",
      actionDetected: "celebrate-small",
    },
  },
};

// Function to update icons based on selected movement
globalStore.__fns.updateIcons = (movement) => {
  const icons = movementIcons[movement] || movementIcons.none;
  globalStore.ui.trainingState.icon = icons.training;
  globalStore.ui.predictionState.icon = icons.prediction;
};

// Subscribe to changes in the movement value
globalStore.__fns.subscribeKey("settings.selected.movement", (movement) => {
  globalStore.__fns.updateIcons(movement);
});

globalStore.__fns.initialize = () => {
  if (window.api) {
    window.api.send("toMain", { id: "init" });
    window.api.send("toMain", { id: "req:eeg-stream-availability" });
  }
  if (localStorage.getItem("selected-settings")) {
    globalStore.settings.selected = JSON.parse(
      localStorage.getItem("selected-settings")
    );
  }
  // Initialize icons based on the current movement
  globalStore.__fns.updateIcons(globalStore.settings.selected.movement);
};

globalStore.__fns.subscribeKey("connectedToServer", (v) => {
  if (!v) {
    globalStore.eegStreamIsAvailable = false;
  }
});

globalStore.__fns.subscribe((v) => {
  if (["settings", "selected"].some((k) => v[0][1].includes(k))) {
    localStorage.setItem(
      "selected-settings",
      JSON.stringify(globalStore.settings.selected)
    );
  }
});

globalStore.__fns.subscribeKey("settings.selected.movement", (movement) => {
  globalStore.__fns.updateIcons(movement);
});

if (window.api) {
  window.api.receive("fromMain", ({ id, data }) => {
    switch (id) {
      case "py:init":
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
      case "py:action-detected":
        globalStore.ui.predictionState.state = "actionDetected";
        break;
    }
  });
}

export default globalStore;
