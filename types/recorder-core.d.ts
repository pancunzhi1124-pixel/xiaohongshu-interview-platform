declare module "recorder-core" {
  type OpenSuccess = () => void;
  type OpenFail = (message: string, isUserNotAllow: boolean) => void;
  type StopSuccess = (blob: Blob) => void;
  type StopFail = (message: string) => void;

  export type RecorderOptions = {
    type: "wav";
    sampleRate: number;
    bitRate: number;
    onProcess?: () => void;
  };

  export type RecorderInstance = {
    open: (success: OpenSuccess, fail: OpenFail) => void;
    start: () => void;
    stop: (success: StopSuccess, fail: StopFail) => void;
    close: () => void;
  };

  export default function Recorder(options: RecorderOptions): RecorderInstance;

  namespace Recorder {
    export type RecorderInstance = import("recorder-core").RecorderInstance;
  }
}

declare module "recorder-core/src/engine/wav";
