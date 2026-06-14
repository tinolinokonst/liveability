export default function BackgroundDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, #f9731622 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-[40vh] -left-60 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, #f9731614 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, #ffffff08 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  )
}
