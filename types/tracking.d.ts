declare module 'tracking' {
  export class ColorTracker {
    constructor(colors: string[]);
    setMinDimension(dimension: number): void;
    setMinGroupSize(size: number): void;
    on(event: string, callback: (event: any) => void): void;
    removeAllListeners(): void;
  }

  export class TrackerTask {
    constructor(tracker: ColorTracker);
    on(event: string, callback: (event: any) => void): void;
    run(): void;
  }

  export function track(selector: string, tracker: ColorTracker, options?: any): TrackerTask;

  export namespace ColorTracker {
    function registerColor(name: string, predicate: (r: number, g: number, b: number) => boolean): void;
  }
} 