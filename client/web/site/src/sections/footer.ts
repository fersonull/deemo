// The one real action on the page. No public release APK exists yet (docs/HANDOFF.md: shipping one is still a
// pending step) — DOWNLOAD_URL starts empty and the button reads honestly instead of linking nowhere. Set it the day
// a signed release is hosted somewhere (e.g. a GitHub Releases asset) and this flips to a real download button.
const DOWNLOAD_URL = "";

export function initFooter() {
  const area = document.getElementById("download-area")!;
  area.innerHTML = DOWNLOAD_URL
    ? `<a class="btn btn--primary" href="${DOWNLOAD_URL}"><span class="icon" aria-hidden="true">download</span> Download the APK</a>`
    : `<button class="btn btn--primary" type="button" disabled>
         <span class="icon" aria-hidden="true">schedule</span> Android app — release coming soon
       </button>
       <p class="download-note">Not on the Play Store yet. Check back soon, or watch the defense deck below.</p>`;
}
