import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ConfettiExplosion from "react-confetti-explosion";

const reactConfettiProps = {
  force: 1.0,
  duration: 750,
  particleCount: 250,
  width: 1600,
};

export default function IconOverly() {
  // Option 1) Load imgSrc from URL
  // const urlSearchParams = new URLSearchParams(window.location.search);
  // const params = Object.fromEntries(urlSearchParams.entries());
  // const { imgSrc } = params; // e.g., imgSrc: `/images/${globalStore.ui.predictionState.icon[movementSelected][predictionState]}.png`,

  // Option 2) Load imgSrc from window.api
  const [imgSrc, setImgSrc] = useState(null);
  useEffect(() => {
    window.api.receive("fromMain", ({ id, data }) => {
      if (id === "req:load-overlay") {
        if (!data.imgSrc.includes("empty")) setImgSrc(data.imgSrc);
        else setImgSrc(null);
      }
    });

    return () => {
      // Cleanup
      setImgSrc(null);
      // window.api.removeAllListeners("fromMain");
    };
  }, []);

  return (
    imgSrc && (
      <motion.div
        className="p-24 rounded-box shadow-2xl bg-blue-500 bg-opacity-75 backdrop-blur-sm flex justify-center"
        initial={{ opacity: 0, scale: 0.15 }}
        animate={{ opacity: 1, scale: 0.75 }}
      >
        <ConfettiExplosion {...reactConfettiProps} />
        <img id="celebrate-image" src={imgSrc} className="invert w-[95%]" />
      </motion.div>
    )
  );
}
