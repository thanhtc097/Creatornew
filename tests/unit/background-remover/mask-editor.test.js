import { describe, expect, it } from "vitest";
import { addStroke, createMaskState, maskBounds } from "../../../js/background-remover/mask-editor.js";

describe("mask state", () => {
  it("normalizes strokes and calculates bounds", () => {
    const state = createMaskState();
    addStroke(state, { operation: "add", radius: .1, points: [{ x: -.5, y: .5 }, { x: .5, y: 2 }] });
    expect(state.strokes[0].points[0].x).toBe(0);
    expect(maskBounds(state)).toEqual({ left: 0, top: .4, right: .6, bottom: 1 });
  });

  it("ignores erase-only strokes for positive bounds", () => {
    const state = createMaskState();
    addStroke(state, { operation: "erase", radius: .1, points: [{ x: .5, y: .5 }, { x: .6, y: .5 }] });
    expect(maskBounds(state)).toBeNull();
  });
});
