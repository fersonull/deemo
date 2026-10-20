import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("layered buttons settle on press, block busy taps, flatten when disabled and preserve labels", () => {
  // Isolate native-module mocks so the live-engine tests keep their real React/runtime imports.
  const result = Bun.spawnSync([process.execPath, "--eval", `
    import assert from "node:assert/strict";
    import { mock } from "bun:test";
    const { colors } = await import("./src/colors.ts");
    const element = (type, props) => ({ type, props });
    let states = [], cursor = 0, effects = [], reduced = false, timings = [];
    const pressed = { value: 0, set(value) { this.value = value; } };
    mock.module("react", () => ({
      useId: () => "button",
      useState: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = value; }];
      },
      useEffect: fn => { effects.push(fn); },
    }));
    mock.module("react/jsx-runtime", () => ({ jsx: element, jsxs: element }));
    mock.module("react/jsx-dev-runtime", () => ({ jsxDEV: element }));
    mock.module("react-native", () => ({
      Pressable: "Pressable", View: "View", Text: "Text",
      StyleSheet: { create: value => value, absoluteFill: {} },
    }));
    mock.module("react-native-reanimated", () => ({
      default: { View: "AnimatedView" },
      useReducedMotion: () => reduced,
      useSharedValue: () => pressed,
      useAnimatedStyle: compute => ({ compute }),
      withTiming: (value, options) => { timings.push(options); return value; },
    }));
    mock.module("react-native-svg", () => ({
      default: "Svg", Defs: "Defs", LinearGradient: "Gradient", Rect: "Rect", Stop: "Stop",
    }));
    mock.module("@/theme", () => ({
      colors, radius: { pill: 29 }, type: { button: {} }, easeOut: "easeOut",
    }));
    const { PressableDepth } = await import("./src/components/pressable-depth.tsx");
    const { Button } = await import("./src/components/button.tsx");
    const render = (props = {}) => {
      cursor = 0;
      effects = [];
      const tree = PressableDepth({ children: "Continue", depthColor: colors.inkDepth, faceStyle: {}, ...props });
      effects.forEach(effect => effect());
      return tree;
    };
    const face = tree => tree.props.children[1];
    const offset = tree => face(tree).props.style.at(-1).compute().transform;
    let callbacks = 0;
    let tree = render({ onPressIn: () => callbacks++, onPressOut: () => callbacks++ });
    assert.equal(tree.props.disabled, false);
    tree.props.onPressIn({});
    assert.deepEqual(offset(tree), [{ translateX: 1 }, { translateY: 3 }]);
    tree.props.onPressOut({});
    assert.deepEqual(offset(tree), [{ translateX: 0 }, { translateY: 0 }]);
    assert.equal(callbacks, 2);
    tree.props.onFocus({});
    tree = render();
    assert.ok(tree.props.children[0], "keyboard focus has a visible ring");
    tree.props.onPressIn({});
    tree = render({ busy: true, disabled: true });
    assert.equal(tree.props.disabled, true);
    assert.deepEqual(tree.props.accessibilityState, { disabled: true, busy: true });
    assert.equal(tree.props.children[0], null, "blocked controls have no focus cue");
    assert.equal(tree.props.style.at(-1).backgroundColor, colors.inkDepth, "busy retains contrast and depth");
    assert.equal(pressed.value, 0, "becoming busy releases a held press");
    tree = render({ disabled: true });
    assert.equal(tree.props.style.at(-1).backgroundColor, colors.sand);
    assert.equal(face(tree).props.style.at(-2).bottom, 0, "disabled face is flat");
    reduced = true;
    tree = render();
    tree.props.onPressIn({});
    tree.props.onPressOut({});
    assert.equal(timings.at(-1).duration, 0);
    assert.equal(timings.at(-2).duration, 0);
    for (const variant of ["primary", "secondary", "premium"]) {
      const button = Button({ label: "Saving…", busy: true, disabled: true, variant, leading: "icon" });
      assert.equal(button.props.busy, true);
      assert.equal(button.props.children[1], null, "busy content is text only");
      assert.equal(button.props.children[2].props.children, "Saving…");
      assert.equal(button.props.children[2].props.style[1].color, variant === "secondary" ? colors.ink : variant === "premium" ? colors.goldLight : colors.paper);
      const disabled = Button({ label: "Continue", disabled: true, variant });
      assert.equal(disabled.props.children[0], null, "disabled Premium has no sheen");
      assert.equal(disabled.props.children[2].props.style[1].color, colors.inkMuted);
    }
  `], { cwd: fileURLToPath(new URL("../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  expect(result.exitCode, new TextDecoder().decode(result.stderr)).toBe(0);
});
