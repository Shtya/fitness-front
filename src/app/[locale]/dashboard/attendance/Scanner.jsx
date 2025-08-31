"use client";

import { useEffect, useRef, useState } from "react";

// Optional (fallback): npm i @zxing/browser
let ZXING = null;

const FORMATS = ["qr_code", "ean_13", "code_128", "code_39", "ean_8", "upc_a", "upc_e"];

export default function Scanner({ onDetected, facingMode="environment", className="" }) {
  const videoRef = useRef(null);
  const [err, setErr] = useState("");
  const [running, setRunning] = useState(false);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const zxingRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // camera
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (!mounted) return;
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();

        // Native detector first
        if ("BarcodeDetector" in window) {
          detectorRef.current = new window.BarcodeDetector({ formats: FORMATS });
          setRunning(true);
          loopNative();
        } else {
          // fallback to ZXing
          try {
            ZXING = ZXING || (await import("@zxing/browser"));
            zxingRef.current = new ZXING.BrowserMultiFormatReader();
            setRunning(true);
            loopZXing();
          } catch (e) {
            setErr("No scanner available on this device/browser.");
          }
        }
      } catch (e) {
        setErr("Camera permission denied or not available.");
      }
    })();
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      try { streamRef.current?.getTracks()?.forEach(t=>t.stop()); } catch {}
      try { zxingRef.current?.reset(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const loopNative = async () => {
    if (!detectorRef.current || !videoRef.current) return;
    try {
      const detections = await detectorRef.current.detect(videoRef.current);
      if (detections?.length) {
        const code = detections[0].rawValue;
        onDetected?.(code);
      }
    } catch {}
    rafRef.current = requestAnimationFrame(loopNative);
  };

  const loopZXing = async () => {
    if (!zxingRef.current || !videoRef.current) return;
    try {
      const v = videoRef.current;
      const result = await zxingRef.current.decodeOnceFromVideoElement(v);
      if (result?.text) onDetected?.(result.text);
    } catch {
      // continue looping
    }
    rafRef.current = requestAnimationFrame(loopZXing);
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-3 ${className}`}>
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      </div>
      <div className="mt-2 text-xs text-slate-600">
        {running ? "Scanner ready — point a QR/barcode at the camera." : err || "Starting camera…"}
      </div>
    </div>
  );
}
