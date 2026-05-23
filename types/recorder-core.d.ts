declare module "recorder-core" {
  export type RecorderFactoryOptions = {
    type?: string;
    sampleRate?: number;
    bitRate?: number;
    numChannels?: number;
    onProcess?: () => void;
  };

  export type RecorderCoreInstance = {
    open: (
      onSuccess: () => void,
      onError: (message: string, isUserNotAllow?: boolean) => void
    ) => void;
    start: () => void;
    stop: (
      onSuccess: (blob: Blob, duration: number) => void,
      onError: (message: string) => void
    ) => void;
    close: () => void;
  };

  const Recorder: (options: RecorderFactoryOptions) => RecorderCoreInstance;
  export default Recorder;
}

declare module "recorder-core/src/engine/wav" {}
