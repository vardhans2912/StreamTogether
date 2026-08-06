import { useEffect, useRef } from "react";

/**
 * Declarative setInterval. Pass delay=null to pause.
 * The latest callback is always used without resetting the timer.
 */
export default function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || delay === undefined) return undefined;
    const id = setInterval(() => savedCallback.current?.(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
