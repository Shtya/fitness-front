const { useRef } = require("react");

export function InlineVideo({ src }) {
  const ref = useRef(null);
  return <video muted ref={ref} src={src} className='w-full h-full object-contain bg-black' playsInline controls  />;
}