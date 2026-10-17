// Push notifications for notices (hooks/use-push-notices.ts), set up at prebuild:
// - the status-bar icon: a white owl silhouette (assets/notification/, cut from android-icon-monochrome.png) instead
//   of the full-color app icon, which Android would flatten into a blob;
// - the accent color behind it, dusk (colors.ts). firebase.json points RN Firebase's own color meta-data at it;
// - the channel's name in Android settings. FCM puts notices in its fallback channel, labelled "Miscellaneous" unless
//   this string is set. A named channel of our own would need native code to create it; this needs none.
const fs = require("fs");
const path = require("path");
const { withAndroidColors, withAndroidManifest, withDangerousMod, withStringsXml, AndroidConfig } = require("expo/config-plugins");

const DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
const ICON_META = "com.google.firebase.messaging.default_notification_icon";

module.exports = function withNoticeNotifications(config, { color = "#5A66C7", channelName = "Notices from DEEMO" } = {}) {
  config = withDangerousMod(config, [
    "android",
    (c) => {
      const res = path.join(c.modRequest.platformProjectRoot, "app/src/main/res");
      for (const d of DENSITIES) {
        fs.mkdirSync(path.join(res, `drawable-${d}`), { recursive: true });
        fs.copyFileSync(
          path.join(c.modRequest.projectRoot, `assets/notification/notification_icon-${d}.png`),
          path.join(res, `drawable-${d}/notification_icon.png`),
        );
      }
      return c;
    },
  ]);
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, ICON_META, "@drawable/notification_icon", "resource");
    return c;
  });
  config = withAndroidColors(config, (c) => {
    c.modResults = AndroidConfig.Colors.assignColorValue(c.modResults, { name: "notification_icon_color", value: color });
    return c;
  });
  config = withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: "fcm_fallback_notification_channel_label" }, _: channelName }],
      c.modResults,
    );
    return c;
  });
  return config;
};
