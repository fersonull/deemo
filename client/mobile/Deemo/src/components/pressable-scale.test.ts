import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("lit controls keep native labels and light through disabled/busy/press states", () => {
  // Native mocks stay isolated; these assertions cover the tree and state, not Android pixels.
  const result = Bun.spawnSync([process.execPath, "--eval", `
    import assert from "node:assert/strict";
    import { mock } from "bun:test";
    const { colors } = await import("./src/colors.ts");
    const React = await import("react");
    const element = (type, props, key) => React.createElement(type, { ...props, key });
    const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean).map(flatten)) : value ?? {};
    let states = [], cursor = 0, effects = [], reduced = false, timings = [];
    const pressed = { value: 0, set(value) { this.value = value; } };
    const platform = { OS: "android", Version: 35 };
    mock.module("react", () => ({
      ...React,
      useId: () => "button",
      useState: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = value; }];
      },
      useEffect: fn => { effects.push(fn); },
    }));
    mock.module("react/jsx-runtime", () => ({ jsx: element, jsxs: element, Fragment: React.Fragment }));
    mock.module("react/jsx-dev-runtime", () => ({ jsxDEV: element, Fragment: React.Fragment }));
    mock.module("react-native", () => ({
      Pressable: "Pressable", Text: "Text", Platform: platform,
      StyleSheet: { create: value => value, flatten, absoluteFill: {} },
    }));
    mock.module("react-native-reanimated", () => ({
      default: { View: "AnimatedView", Text: "AnimatedText", createAnimatedComponent: () => "AnimatedPressable" },
      Easing: { bezier: () => "ease" },
      useReducedMotion: () => reduced,
      useSharedValue: () => pressed,
      useAnimatedStyle: compute => ({ compute }),
      withTiming: (value, options) => { timings.push(options); return value; },
      withSpring: value => value,
    }));
    mock.module("expo-linear-gradient", () => ({ LinearGradient: "LinearGradient" }));
    mock.module("react-native-svg", () => ({
      default: "Svg", Defs: "Defs", LinearGradient: "Gradient", Rect: "Rect", Stop: "Stop",
    }));
    const theme = await import("./src/theme.ts");
    mock.module("@/theme", () => ({ colors, lit: theme.lit, radius: { pill: 29, md: 14 }, type: { button: {} }, easeOut: "easeOut" }));
    const { PressableScale } = await import("./src/components/pressable-scale.tsx");
    const { Button } = await import("./src/components/button.tsx");
    const label = element("Text", { children: "Continue" });
    const render = (props = {}) => {
      cursor = 0; effects = [];
      const component = PressableScale({ children: label, lit: true, ...props });
      const tree = component.type(component.props);
      effects.forEach(effect => effect());
      return tree;
    };
    const surface = tree => tree.props.style[1];
    const lit = tree => surface(tree).boxShadow;
    let callbacks = 0;
    const ink = { height: 58, backgroundColor: colors.ink };
    let tree = render({ style: ink, onPressIn: () => callbacks++ });
    assert.equal(tree.type, "AnimatedPressable");
    assert.equal(tree.props.children, label, "the label is a direct native child");
    assert.equal(tree.props.collapsable, false);
    assert.equal(lit(tree).length, 2, "lit: a top highlight and a soft glow");
    assert.ok(lit(tree).every((s) => s.inset), "all the light stays inside the control");
    tree.props.onPressIn({});
    tree = render({ style: ink, onPressOut: () => callbacks++ });
    assert.equal(lit(tree), undefined, "held down, the light goes out");
    assert.equal(tree.props.style[0], ink, "pressing never moves or restyles the face");
    tree.props.onPressOut({}); tree = render({ style: ink });
    assert.equal(callbacks, 2);
    assert.equal(lit(tree).length, 2);
    tree.props.onFocus({}); tree = render({ style: ink, accessibilityState: { selected: true } });
    assert.equal(surface(tree).outlineWidth, 2);
    assert.equal(tree.props.accessibilityState.selected, true);
    tree.props.onPressIn({}); tree = render({ style: ink, busy: true, disabled: true });
    assert.equal(tree.props.disabled, true);
    assert.equal(tree.props.accessibilityState.busy, true);
    assert.equal(lit(tree).length, 2, "loading keeps its light while blocking taps");
    assert.equal(surface(tree).outlineWidth, 0);
    assert.equal(lit(render({ style: ink, disabled: true })), undefined, "disabled controls are unlit");
    tree = render({ style: ink });
    assert.equal(lit(tree).length, 2, "re-enabling cannot restore a stale press");
    assert.ok(lit(render({ style: { height: 44, backgroundColor: colors.sand } }))[0].color.includes("0.7"), "light faces take a stronger highlight");
    const card = { padding: 14, backgroundColor: colors.sand, transform: [{ translateY: -26 }] };
    tree = render({ lit: undefined, style: card, onPressIn: () => callbacks++, onPressOut: () => callbacks++ });
    assert.equal(tree.props.style[0], card, "plain controls keep the caller's style");
    assert.equal(lit(tree), undefined, "plain cards, rows and links get no light of their own");
    tree.props.onPressIn({}); tree.props.onPressOut({});
    assert.equal(callbacks, 4, "custom press callbacks still run");
    const regular = element("Text", { style: { fontWeight: "500", color: colors.ink }, children: "Course" });
    const heavy = element("AnimatedText", { style: { fontWeight: "800" }, children: "Score" });
    const icon = element(() => null, { name: "edit" });
    const content = element("View", { children: [regular, heavy, icon] });
    tree = render({ lit: false, children: content });
    tree.props.onPressIn({});
    tree = render({ lit: false, children: content });
    assert.equal(tree.props.children, content, "flat text is unchanged while pressed");
    assert.equal(flatten(tree.props.children.props.children[0].props.style).fontWeight, "500");
    tree.props.onPressOut({});
    assert.equal(render({ lit: false, children: content }).props.children, content);
    tree.props.onPressIn({});
    assert.equal(render({ lit: false, children: content, busy: true }).props.children, content);
    tree = render({ style: ink, children: content });
    tree.props.onPressIn({});
    assert.equal(render({ style: ink, children: content }).props.children, content, "lit content does not become bold");
    tree.props.onPressOut({});
    for (const variant of ["primary", "secondary", "premium"]) {
      const disabled = Button({ label: "Continue", disabled: true, variant });
      const enabled = Button({ label: "Continue", variant });
      const busy = Button({ label: "Saving…", busy: true, disabled: true, variant, leading: "icon" });
      assert.equal(enabled.props.lit, true, "main buttons are lit");
      assert.equal(Button({ label: "Flat action", variant, lit: false }).props.lit, false);
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
