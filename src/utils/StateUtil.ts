import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useCallback, useEffect, useState } from 'react';
import { deepEqual } from '@/lib/utils';
import { JSONValue } from '@/lib/internaltypes';


/**
 * Custom state hook that only updates when values are deeply different
 * @param initialValue The initial state value
 * @returns A stateful value and a function to update it
 */
export function useDeepState<T extends JSONValue | Map<unknown, unknown> | Set<unknown> | undefined | null>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);

  const setStateWithDeepComparison = useCallback((newValue: React.SetStateAction<T>) => {
    setState(prevState => {
      const resolvedNewValue = typeof newValue === 'function'
        ? (newValue as (prevState: T) => T)(prevState)
        : newValue;
      if (deepEqual(prevState, resolvedNewValue)) {
        return prevState;
      }
      console.log('State changed, updating');
      return resolvedNewValue;
    });
  }, []);

  return [state, setStateWithDeepComparison];
}



/**
 * Set a value only if it has changed
 * @param initialValue 
 * @returns 
 */
export function useSyncedState<T>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const [lastInitial, setLastInitial] = useState<T>(initialValue);

  useEffect(() => {
    if (!deepEqual(initialValue, lastInitial)) {
      setValue(initialValue);
      setLastInitial(initialValue);
    }
  }, [initialValue, lastInitial]);

  return [value, setValue];
}

export function useSyncedStateFunc<T>(initialValue: string, parseValue: (value: string) => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(parseValue(initialValue));
  const [lastInitial, setLastInitial] = useState<string>(initialValue);

  useEffect(() => {
    if (!deepEqual(initialValue, lastInitial)) {
      setValue(parseValue(initialValue));
      setLastInitial(initialValue);
    }
  }, [initialValue, lastInitial, parseValue]);

  return [value, setValue];
}

interface DataStore<T> {
  data: T | undefined;
  setData: (data: T) => void;
}

export const createDataStore = <T>() => {
  return create<DataStore<T>>()((set) => ({
    data: undefined,
    setData: (data) => set({ data }),
  }));
};

export const createDataStoreWithDef = <T>(default_data: T) => {
  return create<DataStore<T>>()((set) => ({
    data: default_data,
    setData: (data) => set({ data }),
  }));
}
type CommandState = {
  output: Record<string, string | string[]>;
  setOutput: (key: string, value: string) => void;
};
export function createCommandStore() {
  return create<CommandState>()(
    subscribeWithSelector((set) => ({
      output: {},
      setOutput: (key, value) => set((state) => {
        const copy = { ...state.output };
        if (value) copy[key] = value;
        else delete copy[key];
        return { output: copy };
      }),
    }))
  );
}

export function createCommandStoreWithDef(default_values: { [key: string]: string | string[] }) {
  return create<CommandState>()(
    subscribeWithSelector((set) => ({
      output: { ...default_values },
      setOutput: (key, value) => set((state) => {
        const copy = { ...state.output };
        if (value) copy[key] = value;
        else delete copy[key];
        return { output: copy };
      }),
    }))
  );
}

export type CommandStoreType = ReturnType<typeof createCommandStore>;


// export function limitConcurrency(funcs, limit) {
//   let active = 0;
//   let i = 0;
//   const results = new Array(funcs.length);
//   return new Promise((resolve, reject) => {
//       const run = async () => {
//           if (i === funcs.length) {
//               if (active === 0) resolve(results);
//               return;
//           }
//           const index = i++;
//           const func = funcs[index];
//           results[index] = await func();
//           active--;
//           run();
//       };
//       while (active < limit && i < funcs.length) {
//           active++;
//           run();
//       }
//   });
// }
// export function runInWorker(func: (...args: unknown[]) => void, ...args: unknown[]) {
//   return new Promise((resolve, reject) => {
//       // Convert the function to a string of JavaScript code
//       const funcStr = `(${func.toString()})(${args.map(JSON.stringify).join(',')})`;

//       // Create a blob from the function string
//       const blob = new Blob([funcStr], { type: 'text/javascript' });

//       // Create a URL for the blob
//       const url = URL.createObjectURL(blob);

//       // Create a new worker with the blob URL
//       const worker = new Worker(url);

//       // Listen for messages from the worker
//       worker.onmessage = (event) => {
//           // Resolve the promise with the result from the worker
//           resolve(event.data);

//           // Terminate the worker
//           worker.terminate();
//       };

//       // Listen for errors from the worker
//       worker.onerror = (error) => {
//           // Reject the promise with the error from the worker
//           reject(error);

//           // Terminate the worker
//           worker.terminate();
//       };
//   });
// }

export const EMPTY_OBJECT = Object.freeze({});