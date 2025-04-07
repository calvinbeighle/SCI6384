// React types
declare module "react" {
  export type MouseEvent<T = Element> = React.SyntheticEvent<T> & {
    clientX: number;
    clientY: number;
  };

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: ReadonlyArray<any>
  ): void;
  export function useRef<T>(initialValue: T): { current: T };
}

// JSX types
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Next.js Script type
declare module "next/script" {
  const Script: any;
  export default Script;
}

// GazePoint type
export interface GazePoint {
  x: number;
  y: number;
  timestamp?: number;
}
