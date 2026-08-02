import { Audio } from "../audio/AudioManager";

export function muteButtonHtml(): string {
  return `<button type="button" class="ll-mute" aria-label="Toggle mute">${Audio.isMuted() ? "Unmute" : "Mute"}</button>`;
}

export function wireMute(btn: HTMLElement) {
  const sync = () => {
    btn.textContent = Audio.isMuted() ? "Unmute" : "Mute";
  };
  btn.addEventListener("click", () => {
    Audio.unlock();
    if (Audio.isMuted()) {
      Audio.toggleMute();
      Audio.sfx("ui");
    } else {
      Audio.sfx("ui");
      Audio.toggleMute();
    }
    sync();
  });
  return Audio.onMuteChange(sync);
}
