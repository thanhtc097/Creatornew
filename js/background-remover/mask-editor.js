export function createMaskState() {
  return { strokes: [], version: 0 };
}

export function addStroke(state, stroke) {
  const normalized = {
    operation: stroke.operation === "erase" ? "erase" : "add",
    radius: Math.min(0.2, Math.max(0.002, stroke.radius)),
    points: stroke.points.map(({ x, y }) => ({ x: clamp(x), y: clamp(y) })),
  };
  state.strokes.push(normalized);
  state.version += 1;
  return normalized;
}

export function maskBounds(state) {
  if (!state.strokes.length) return null;
  let left = 1; let top = 1; let right = 0; let bottom = 0;
  for (const stroke of state.strokes) {
    if (stroke.operation === "erase") continue;
    for (const point of stroke.points) {
      left = Math.min(left, point.x - stroke.radius);
      top = Math.min(top, point.y - stroke.radius);
      right = Math.max(right, point.x + stroke.radius);
      bottom = Math.max(bottom, point.y + stroke.radius);
    }
  }
  return right > left && bottom > top
    ? { left: clamp(left), top: clamp(top), right: clamp(right), bottom: clamp(bottom) }
    : null;
}

export function renderMask(state, canvas) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of state.strokes) {
    context.globalCompositeOperation = stroke.operation === "erase" ? "destination-out" : "source-over";
    context.strokeStyle = "rgba(238, 68, 102, 0.72)";
    context.lineWidth = stroke.radius * 2 * Math.min(canvas.width, canvas.height);
    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (index) context.lineTo(x, y); else context.moveTo(x, y);
    });
    context.stroke();
  }
  context.globalCompositeOperation = "source-over";
}

export function attachMaskEditor(canvas, state, { getOperation, getRadius, onChange }) {
  let points = null;
  const position = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  };
  const start = (event) => {
    points = [position(event)];
    canvas.setPointerCapture?.(event.pointerId);
  };
  const move = (event) => {
    if (!points) return;
    points.push(position(event));
    const preview = { ...state, strokes: [...state.strokes, { operation: getOperation(), radius: getRadius(), points }] };
    renderMask(preview, canvas);
  };
  const finish = () => {
    if (!points) return;
    if (points.length === 1) points.push({ ...points[0], x: clamp(points[0].x + 0.0001) });
    addStroke(state, { operation: getOperation(), radius: getRadius(), points });
    points = null;
    renderMask(state, canvas);
    onChange?.(state);
  };
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  return () => {
    canvas.removeEventListener("pointerdown", start);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", finish);
    canvas.removeEventListener("pointercancel", finish);
  };
}

function clamp(value) { return Math.min(1, Math.max(0, value)); }
