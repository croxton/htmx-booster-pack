const event = (selector = null, requirement) => {
  return new Promise(resolve => {
    // get the topic provided
    let topic;
    if (requirement.indexOf('(') !== -1) {
      const topicStart = requirement.indexOf('(') + 1;
      topic = requirement.slice(topicStart, -1).trim();
    }
    if (topic) {
      const cleanup = () => {
        window.removeEventListener(topic, onEvent);
        window.removeEventListener("booster:detached", onDetach);
      };
      const onEvent = (event) => {
        cleanup();
        resolve();
      };
      window.addEventListener(topic, () => {
        resolve();
      }, { once: true });

      const onDetach = (event) => {
        if (event.detail.selector === selector) {
          cleanup();
          resolve(false);
        }
      }
      window.addEventListener("booster:detached", onDetach);

    } else {
      resolve(); // no topic provided, resolve immediately
    }
  });
};

export default event;