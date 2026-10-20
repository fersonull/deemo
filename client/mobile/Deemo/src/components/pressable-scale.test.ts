import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("shared depth preserves native labels, card layout and disabled/busy/press transitions", () => {
  // Native mocks stay isolated; these assertions cover the tree and state, not Android pixels.
  const result = Bun.spawnSync([process.execPath, "--eval", `
    import assert from "node:assert/strict";
    import { mock } from "bun:test";
    const { colors } = await import("./src/colors.ts");
    const element = (type, props, key) => ({ type, props, key });
    const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean).map(flatten)) : value ?? {};
    let states = [], cursor = 0, effects = [], reduced = false, timings = [];
    const pressed = { value: 0, set(value) { this.value = value; } };
    const platform = { OS: "android", Version: 35 };
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
      Pressable: "Pressable", Text: "Text", Platform: platform,
      StyleSheet: { create: value => value, flatten, absoluteFill: {} },
    }));
    mock.module("react-native-reanimated", () => ({
      default: { View: "AnimatedView", createAnimatedComponent: () => "AnimatedPressable" },
      useReducedMotion: () => reduced,
      useSharedValue: () => pressed,
      useAnimatedStyle: compute => ({ compute }),
      withTiming: (value, options) => { timings.push(options); return value; },
    }));
    mock.module("react-native-svg", () => ({
      default: "Svg", Defs: "Defs", LinearGradient: "Gradient", Rect: "Rect", Stop: "Stop",
    }));
    mock.module("@/theme", () => ({ colors, radius: { pill: 29, md: 14 }, type: { button: {} }, easeOut: "easeOut" }));
    const { PressableScale } = await import("./src/components/pressable-scale.tsx");
    const { Button } = await import("./src/components/button.tsx");
    const label = element("Text", { children: "Continue" });
    const render = (props = {}) => {
      cursor = 0; effects = [];
      const component = PressableScale({ children: label, layered: true, ...props });
      const tree = component.type(component.props);
      effects.forEach(effect => effect());
      return tree;
    };
    const surface = tree => tree.props.style[1];
    const offset = tree => tree.props.style[2].compute().transform;
    let callbacks = 0;
    let tree = render({ onPressIn: () => callbacks++ });
    assert.equal(tree.type, "AnimatedPressable");
    assert.equal(tree.props.children, label, "the label is a direct native child");
    assert.equal(tree.props.collapsable, false);
    tree.props.onPressIn({});
    tree = render({ onPressOut: () => callbacks++ });
    assert.deepEqual(offset(tree), [{ translateX: 1 }, { translateY: 3 }]);
    assert.equal(surface(tree).boxShadow[0].offsetY, 1);
    tree.props.onPressOut({}); tree = render();
    assert.equal(callbacks, 2);
    assert.equal(surface(tree).boxShadow[0].offsetY, 4);
    tree.props.onFocus({}); tree = render({ accessibilityState: { selected: true } });
    assert.equal(surface(tree).outlineWidth, 2);
    assert.equal(tree.props.accessibilityState.selected, true);
    tree.props.onPressIn({}); tree = render({ busy: true, disabled: true });
    assert.equal(tree.props.disabled, true);
    assert.equal(tree.props.accessibilityState.busy, true);
    assert.equal(pressed.value, 0);
    assert.equal(surface(tree).boxShadow[0].offsetY, 4, "loading retains resting depth while blocking taps");
    assert.equal(surface(tree).outlineWidth, 0);
    tree = render({ disabled: true });
    assert.deepEqual(surface(tree).boxShadow, []);
    tree = render();
    assert.equal(tree.props.children, label);
    assert.equal(surface(tree).boxShadow[0].offsetY, 4, "re-enabling cannot restore a stale press");
    const card = { padding: 14, backgroundColor: colors.sand, transform: [{ translateY: -26 }] };
    tree = render({ style: card });
    assert.equal(tree.props.style[0], card);
    assert.equal(surface(tree).backgroundColor, colors.sand);
    assert.deepEqual(offset(tree)[0], { translateY: -26 });
    platform.Version = 27;
    assert.equal(surface(render()).elevation, 3);
    reduced = true; tree = render(); tree.props.onPressIn({}); tree.props.onPressOut({});
    assert.equal(timings.at(-1).duration, 0);
    assert.equal(timings.at(-2).duration, 0);
    reduced = false;
    tree = render({ layered: undefined, style: card });
    assert.equal(surface(tree).boxShadow, undefined, "ordinary cards/rows/links are flat by default");
    assert.equal(surface(tree).backgroundColor, undefined, "flat controls keep the caller's surface");
    assert.equal(surface(tree).marginBottom, undefined, "flat controls do not add space for a lower layer");
    assert.equal(surface(tree).elevation, undefined);
    tree.props.onPressIn({});
    assert.deepEqual(offset(tree)[0], { translateY: -26 }, "flat navigation keeps its existing transform");
    assert.equal(offset(tree).at(-1).scale, 0.97, "flat touch feedback scales instead of settling into depth");
    tree.props.onPressOut({});
    reduced = true;
    tree = render({ layered: false, style: { opacity: 0.5 } });
    tree.props.onPressIn({});
    assert.equal(offset(tree).at(-1).scale, 1);
    assert.equal(tree.props.style[2].compute().opacity, 0.5 * 0.85);
    tree.props.onPressOut({});
    for (const variant of ["primary", "secondary", "premium"]) {
      const disabled = Button({ label: "Continue", disabled: true, variant });
      const enabled = Button({ label: "Continue", variant });
      const busy = Button({ label: "Saving…", busy: true, disabled: true, variant, leading: "icon" });
      assert.equal(enabled.props.layered, true, "main buttons explicitly opt into depth");
      assert.equal(Button({ label: "Flat action", variant, layered: false }).props.layered, false);
      assert.equal(busy.props.children[1], null);
      assert.equal(busy.props.children[2].props.children, "Saving…");
      assert.notEqual(enabled.props.children[2].key, disabled.props.children[2].key, "color changes recreate native text");
      assert.notEqual(enabled.props.children[2].key, busy.props.children[2].key, "loading recreates native text");
      assert.equal(disabled.props.children[2].props.style[1].color, colors.inkMuted);
      assert.equal(enabled.props.children[2].props.style[1].color, variant === "secondary" ? colors.ink : variant === "premium" ? colors.goldLight : colors.paper);
      assert.equal(render(enabled.props).props.children, enabled.props.children);
    }
  `], { cwd: fileURLToPath(new URL("../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  expect(result.exitCode, new TextDecoder().decode(result.stderr)).toBe(0);
});
