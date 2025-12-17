// hook for detecting clicks outside of a referenced element
// used for closing dropdowns when clicking elsewhere

import { useEffect, useRef } from "react";

export function useClickOutside(callback) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [callback]);

  return ref;
}

export default useClickOutside;
