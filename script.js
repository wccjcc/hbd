// 소원과 화면 상태는 메모리에서만 관리하고 외부로 전송하지 않습니다.
const effects = document.querySelector('#effects');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const sections = [...document.querySelectorAll('.scene')];
const navLinks = [...document.querySelectorAll('.section-nav a')];
const wishAudio = document.querySelector('#wish-audio');
const audioButton = document.querySelector('#wish-audio-toggle');
const videos = [...document.querySelectorAll('.site-video')];
let wishActive = false;
let audioPausedByUser = false;
let audioUnavailable = false;
let framePending = false;

function updateAudioButton() {
  audioButton.textContent = wishAudio.paused ? '▶' : 'Ⅱ';
  audioButton.setAttribute('aria-label', wishAudio.paused ? '음성 재생' : '음성 일시정지');
}

function playWishAudio() {
  if (!wishActive || audioUnavailable) return;
  if (!wishAudio.hasAttribute('src')) wishAudio.src = wishAudio.dataset.src;
  wishAudio.play().catch(error => {
    // 자동 재생을 막는 브라우저에서는 버튼으로 시작할 수 있습니다.
    if (error.name === 'NotAllowedError' && !audioUnavailable) audioButton.hidden = false;
  });
}

wishAudio.addEventListener('loadedmetadata', () => { audioButton.hidden = false; });
wishAudio.addEventListener('play', updateAudioButton);
wishAudio.addEventListener('pause', updateAudioButton);
wishAudio.addEventListener('error', () => {
  audioUnavailable = true;
  audioButton.hidden = true;
});
audioButton.addEventListener('click', () => {
  audioPausedByUser = !wishAudio.paused;
  if (audioPausedByUser) wishAudio.pause();
  else playWishAudio();
});

function updateSection() {
  framePending = false;
  const middle = window.innerHeight / 2;
  const active = sections.find(section => {
    const rect = section.getBoundingClientRect();
    return rect.top <= middle && rect.bottom > middle;
  });
  for (const link of navLinks) {
    if (link.hash === `#${active?.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  for (const video of videos) {
    if (!video.paused && (document.hidden || !active?.contains(video))) video.pause();
  }
  const nextWishActive = active?.id === 'wish' && !document.hidden;
  if (wishActive === nextWishActive) return;
  wishActive = nextWishActive;
  if (!wishActive) wishAudio.pause();
  else if (!audioPausedByUser) playWishAudio();
}

function scheduleSectionUpdate() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(updateSection);
}

window.addEventListener('scroll', scheduleSectionUpdate, { passive: true });
window.addEventListener('resize', scheduleSectionUpdate);
window.addEventListener('pageshow', scheduleSectionUpdate);
document.addEventListener('visibilitychange', updateSection);
scheduleSectionUpdate();

const input = document.querySelector('#wish-input');
const wishButton = document.querySelector('#wish-submit');
const wishStatus = document.querySelector('#wish-status');
input.addEventListener('input', () => {
  input.setCustomValidity('');
});
document.querySelector('#wish-form').addEventListener('submit', event => {
  event.preventDefault();
  const wish = input.value.trim();
  if (!wish) {
    input.setCustomValidity('소원을 입력하세요.');
    input.reportValidity();
    return;
  }
  wishButton.disabled = true;
  wishStatus.textContent = '전송 중';
  const rect = input.getBoundingClientRect();
  const card = document.createElement('div');
  card.className = 'wish-flight';
  card.textContent = `✦ ${wish}`;
  card.style.left = `${rect.left + rect.width / 2}px`;
  card.style.top = `${rect.top}px`;
  effects.append(card);
  window.setTimeout(() => {
    card.remove();
    input.value = '';
    wishStatus.textContent = '전송 완료';
    wishButton.disabled = false;
  }, reducedMotion.matches ? 100 : 1800);
});

const candleSection = document.querySelector('#candles');
const blowButton = document.querySelector('#blow-button');
const candleVideo = document.querySelector('#candle-video');
const candleStatus = document.querySelector('#candle-status');

function setCandleButton(label, icon) {
  const symbol = document.createElement('span');
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = icon;
  blowButton.replaceChildren(label + ' ', symbol);
}

function setCandlePlaying(playing) {
  blowButton.setAttribute('aria-disabled', String(playing));
  if (playing) setCandleButton('재생 중', '▶');
}

let candleFrame = null;

function darkenCandleScene(time) {
  if (time < 0.4 || candleSection.classList.contains('is-blown')) return;
  candleSection.classList.add('is-blown');
  candleStatus.textContent = '초가 꺼졌습니다.';
}

function watchCandleFrame() {
  if (candleFrame !== null || !candleVideo.requestVideoFrameCallback ||
      candleVideo.paused || candleSection.classList.contains('is-blown')) return;
  candleFrame = candleVideo.requestVideoFrameCallback((_, frame) => {
    candleFrame = null;
    if (candleVideo.paused) return;
    darkenCandleScene(frame.mediaTime);
    watchCandleFrame();
  });
}

candleVideo.addEventListener('play', () => {
  setCandlePlaying(true);
  watchCandleFrame();
});
candleVideo.addEventListener('pause', () => {
  setCandlePlaying(false);
  if (!candleVideo.ended) setCandleButton('이어서 보기', '▶');
});
candleVideo.addEventListener('timeupdate', () => {
  // 프레임 단위 확인을 지원하지 않는 브라우저에서도 암전이 동작합니다.
  darkenCandleScene(candleVideo.currentTime);
});
candleVideo.addEventListener('ended', () => {
  setCandlePlaying(false);
  setCandleButton('다시 보기', '↺');
});
blowButton.addEventListener('click', async () => {
  if (!candleVideo.paused || blowButton.getAttribute('aria-disabled') === 'true') return;
  setCandlePlaying(true);
  try {
    if (candleVideo.ended) {
      candleVideo.currentTime = 0;
      candleSection.classList.remove('is-blown');
      candleStatus.textContent = '';
    }
    await candleVideo.play();
  } catch (error) {
    if (error.name === 'AbortError') return;
    setCandlePlaying(false);
    setCandleButton('다시 시도', '↺');
    candleStatus.textContent = '영상을 재생할 수 없습니다.';
  }
});
