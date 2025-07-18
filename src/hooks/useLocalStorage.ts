import { useState, useEffect } from "react";

function getSavedValue<T>(key: string, initialValue: T | (() => T)): T {
  const savedValue = JSON.parse(localStorage.getItem(key) || "null");

  if (savedValue !== null) {
    return savedValue;
  }

  if (initialValue instanceof Function) {
    return initialValue();
  }

  return initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(() => {
    return getSavedValue<T>(key, initialValue);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value, key]);

  return [value, setValue] as const;
}
