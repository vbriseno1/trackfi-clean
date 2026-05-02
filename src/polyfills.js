if (typeof Promise.allSettled !== "function") {
  Promise.allSettled = function allSettled(iterable) {
    return Promise.all(
      Array.from(iterable, (item) =>
        Promise.resolve(item).then(
          (value) => ({ status: "fulfilled", value }),
          (reason) => ({ status: "rejected", reason })
        )
      )
    );
  };
}

if (typeof globalThis.queueMicrotask !== "function") {
  globalThis.queueMicrotask = (cb) => Promise.resolve().then(cb);
}
