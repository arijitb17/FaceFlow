// components/ui/loader.tsx
"use client";

import * as Progress from "@radix-ui/react-progress";

export default function Loader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-30">
      <Progress.Root
        className="relative w-16 h-16 rounded-full bg-gray-200"
        value={100}
      >
        <Progress.Indicator
          className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-blue-600 border-b-blue-200 animate-spin"
          style={{ transformOrigin: "center" }}
        />
      </Progress.Root>
      <p className="mt-4 text-white text-lg font-medium">{message}</p>
    </div>
  );
}
