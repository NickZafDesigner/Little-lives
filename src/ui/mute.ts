import { Audio } from "../audio/AudioManager";

export function muteButtonHtml(): string {
  return `<button type="button" class="ll-mute" aria-label="Toggle mute">${Audio.isMuted() ? "Unmute" : "Mute"}</button>`;
}

export function wireMute(btn: HTMLElement) {
  const sync = () => {
    btn.textContent = Audio.isMuted() ? "Unmute" : "Mute";
    btn.setAttribute("aria-pressed", Audio.isMuted() ? "true" : "false");
  };
  sync();
  btn.addEventListener("click", () => {
    void Audio.unlock().then(() => {
      if (Audio.isMuted()) {
        Audio.toggleMute();
        Audio.sfx("confirm");
      } else {
        Audio.sfx("ui");
        Audio.toggleMute();
      }
      sync();
    });
  });
  return Audio.onMuteChange(sync);
}
