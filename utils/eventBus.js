const listeners = {}; 

export default {
  on: (event, cb) => {
    if (!listeners[event]) listeners[event] = new Set();
    listeners[event].add(cb);
    return () => listeners[event].delete(cb);
  },
  emit: (event, payload) => {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try { cb(payload); } catch (e) { console.error('eventBus handler error', e); }
    });
  },
};
