"use strict";

const videoPlayer = document.getElementById('videoPlayer');

// Список видеофайлов
const playlist = [
  'videos/NewTone.MP4',
  'videos/Sojka.MP4',
  'videos/Masaz.mp4',
  'videos/Ser.mp4'
];

let currentIndex = 0;
let retryCount = 0;
const maxRetries = 5;
let preloadedVideo = null;
let lastCommitSHA = null;

// Воспроизведение видео с учётом старых WebView
function playVideo(index) {
  const videoSrc = playlist[index];
  console.log(`Playing video: ${videoSrc}`);
  videoPlayer.src = videoSrc;
  videoPlayer.load();

  try {
    const playPromise = videoPlayer.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          console.log(`Playback started successfully for ${videoSrc}`);
        })
        .catch((err) => {
          console.warn(`Playback error for ${videoSrc}. Retry #${retryCount + 1}:`, err);
          retryOrSkip(index);
        });
    } else {
      console.log('Playing without Promise support.');
    }
  } catch (err) {
    console.warn(`Immediate play() failure for ${videoSrc}. Retry #${retryCount + 1}:`, err);
    retryOrSkip(index);
  }
}

// Повтор или переход к следующему видео
function retryOrSkip(index) {
  retryCount++;
  if (retryCount >= maxRetries) {
    console.warn(`Skipping video after ${maxRetries} attempts.`);
    retryCount = 0;
    currentIndex = (currentIndex + 1) % playlist.length;
    playVideo(currentIndex);
    preloadNextVideo();
  } else {
    setTimeout(() => playVideo(index), 2000);
  }
}

// Предзагрузка следующего видео
function preloadNextVideo() {
  if (preloadedVideo) {
    document.body.removeChild(preloadedVideo);
    preloadedVideo = null;
  }

  preloadedVideo = document.createElement('video');
  preloadedVideo.src = playlist[(currentIndex + 1) % playlist.length];
  preloadedVideo.preload = "auto";
  preloadedVideo.style.display = "none";
  document.body.appendChild(preloadedVideo);
}

// Проверка на новую версию на GitHub
function checkForUpdateByCommitSHA() {
  const apiURL = 'https://api.github.com/repos/karima-st/video-playlist/commits/main';

  if (window.fetch) {
    fetch(apiURL, { cache: 'no-store' })
      .then(response => response.json())
      .then(data => handleCommitSHA(data.sha))
      .catch(err => {
        console.warn('GitHub update check failed (fetch):', err);
      });
  } else {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', apiURL, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            handleCommitSHA(data.sha);
          } catch (err) {
            console.warn('Failed to parse GitHub response:', err);
          }
        } else {
          console.warn('GitHub update check failed (XHR): HTTP ' + xhr.status);
        }
      }
    };
    xhr.send();
  }
}

function handleCommitSHA(latestSHA) {
  if (lastCommitSHA && latestSHA !== lastCommitSHA) {
    console.log('New version detected from GitHub. Reloading...');
    location.reload();
  }
  lastCommitSHA = latestSHA;
}

// Перезагрузка каждые 12 часов
setInterval(() => {
  console.log('12 hours passed. Reloading the page...');
  location.reload();
}, 43200000); // 12 часов

// Проверка обновлений раз в минуту
setInterval(checkForUpdateByCommitSHA, 60000);

// Обработка окончания видео
videoPlayer.addEventListener('ended', () => {
  retryCount = 0;
  currentIndex = (currentIndex + 1) % playlist.length;
  playVideo(currentIndex);
  preloadNextVideo();
});

// Старт
playVideo(currentIndex);
preloadNextVideo();
