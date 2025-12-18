// hook for detecting clicks outside of a referenced element
// used for closing dropdowns when clicking elsewhere

import { useEffect, useRef } from "react";

export function useClickOutside(callback) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // check if click target is outside the referenced element
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    // listen for mousedown events (fires before click)
    document.addEventListener("mousedown", handleClickOutside);
    // cleanup: remove listener when component unmounts
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [callback]);

  return ref; // return ref to attach to element
}
