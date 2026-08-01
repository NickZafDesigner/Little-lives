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
    Audio.toggleMute();
    sync();
  });
  return Audio.onMuteChange(sync);
}
