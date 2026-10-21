import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("shared depth preserves native labels, card layout and disabled/busy/press transitions", () => {
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
    assert.deepEqual(offset(tree), [{ translateY: 3 }], "the face sinks straight down onto its layer");
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
    platform.Version = 35;
    reduced = true; tree = render(); tree.props.onPressIn({});
    assert.equal(timings.at(-1).duration, 0);
    tree.props.onPressOut({});
    assert.equal(pressed.value, 0, "reduced motion releases instantly, without the spring");
    reduced = false;
    // Controls (a set height) are lit: top highlight, the lower layer, a soft ambient shadow and a light layer.
    const big = { height: 58, borderRadius: 29, backgroundColor: colors.ink };
    tree = render({ style: big });
    const lit = surface(tree).boxShadow;
    assert.equal(lit.length, 3);
    assert.equal(lit[0].inset, true);
    assert.equal(lit[1].offsetY, 5, "big actions sit higher");
    assert.ok(lit[2].blurRadius > 0);
    assert.equal(tree.props.children.props.children[0].type, "LinearGradient");
    assert.equal(tree.props.children.props.children[1], label, "the label stays a direct native child");
    assert.equal(surface(render({ style: { height: 34, backgroundColor: colors.sand } })).boxShadow[1].offsetY, 3, "chips sit lower");
    // Cards (no set height) keep a plain lower layer: no ambient shadow, no light layer.
    tree = render({ style: card });
    assert.equal(surface(tree).boxShadow.length, 1);
    assert.equal(tree.props.children, label);
    const flatTimings = timings.length;
    tree = render({ layered: undefined, style: card, onPressIn: () => callbacks++, onPressOut: () => callbacks++ });
    assert.equal(surface(tree).boxShadow, undefined, "ordinary cards/rows/links are flat by default");
    assert.equal(surface(tree).backgroundColor, undefined, "flat controls keep the caller's surface");
    assert.equal(surface(tree).marginBottom, undefined, "flat controls do not add space for a lower layer");
    assert.equal(surface(tree).elevation, undefined);
    tree.props.onPressIn({});
    assert.deepEqual(offset(tree), card.transform, "pressing flat controls preserves their original transform");
    tree.props.onPressOut({});
    assert.deepEqual(offset(tree), card.transform);
    assert.equal(callbacks, 4, "custom press callbacks still run");
    assert.equal(timings.length, flatTimings, "flat controls schedule no press animation");
    reduced = true;
    tree = render({ layered: false, style: { opacity: 0.5 } });
    tree.props.onPressIn({});
    assert.deepEqual(offset(tree), []);
    assert.equal(tree.props.style[2].compute().opacity, 0.5, "reduced motion does not dim flat controls");
    tree.props.onPressOut({});
    assert.equal(tree.props.style[2].compute().opacity, 0.5);
    assert.equal(timings.length, flatTimings);
    const regular = element("Text", { style: { fontWeight: "500", color: colors.ink }, children: "Course" });
    const heavy = element("AnimatedText", { style: { fontWeight: "800" }, children: "Score" });
    const icon = element(() => null, { name: "edit" });
    const content = element("View", { children: [regular, heavy, icon] });
    tree = render({ layered: false, children: content });
    tree.props.onPressIn({});
    tree = render({ layered: false, children: content });
    assert.equal(tree.props.children, content, "flat text is unchanged while pressed");
    assert.equal(flatten(tree.props.children.props.children[0].props.style).fontWeight, "500");
    tree.props.onPressOut({});
    assert.equal(render({ layered: false, children: content }).props.children, content);
    tree.props.onPressIn({});
    assert.equal(render({ layered: false, children: content, busy: true }).props.children, content);
    tree = render({ children: content });
    tree.props.onPressIn({});
    assert.equal(render({ children: content }).props.children, content, "layered content does not become bold");
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
      assert.equal(render(enabled.props).props.children.props.children[1], enabled.props.children);
    }
  `], { cwd: fileURLToPath(new URL("../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  expect(result.exitCode, new TextDecoder().decode(result.stderr)).toBe(0);
});
