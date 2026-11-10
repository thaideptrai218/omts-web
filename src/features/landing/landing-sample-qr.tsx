/** Hình mã QR minh họa (không quét được): ba ô định vị cộng các ô dữ liệu sinh theo công thức cố định, nên render máy chủ luôn giống nhau. */
const N = 21;
const finders = [[0, 0], [N - 7, 0], [0, N - 7]] as const;

function inFinder(x: number, y: number) {
  return finders.some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
}

const cells: Array<[number, number]> = [];
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (!inFinder(x, y) && ((x * 7 + y * 13 + x * y * 3) % 5 < 2)) cells.push([x, y]);
  }
}

export function SampleQr() {
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false">
      {finders.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`}>
          <path fillRule="evenodd" d={`M${fx} ${fy}h7v7h-7zM${fx + 1} ${fy + 1}v5h5v-5z`} />
          <rect x={fx + 2} y={fy + 2} width="3" height="3" />
        </g>
      ))}
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
    </svg>
  );
}
