(() => {
  const iframe = document.querySelector('#soundcloud-widget');
  const button = document.querySelector('#music-toggle');
  const status = document.querySelector('#music-status');
  if (!iframe || !button || !status || !window.SC?.Widget) {
    if (status) status.textContent = 'SoundCloud 无法加载';
    return;
  }

  const widget = SC.Widget(iframe);
  let ready = false;
  let playing = false;
  let wantsMusic = true;

  function paint(message) {
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
    status.textContent = message || (playing ? 'THEO · 播放中' : '点击播放');
  }

  function playMusic() {
    wantsMusic = true;
    if (!ready) {
      paint('正在连接 SoundCloud…');
      return;
    }
    widget.setVolume(40);
    widget.play();
    paint('正在尝试播放…');
    window.setTimeout(() => {
      if (!playing && wantsMusic) paint('点击页面播放音乐');
    }, 1600);
  }

  button.addEventListener('click', () => {
    if (!playing) playMusic();
    else {
      wantsMusic = false;
      widget.pause();
      paint('已暂停 · 点击播放');
    }
  });

  const unlock = event => {
    if (event.target.closest?.('#music-toggle')) return;
    if (!playing) playMusic();
  };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });

  widget.bind(SC.Widget.Events.READY, () => {
    ready = true;
    widget.setVolume(40);
    playMusic();
  });
  widget.bind(SC.Widget.Events.PLAY, () => {
    playing = true;
    paint('THEO · 播放中');
  });
  widget.bind(SC.Widget.Events.PAUSE, () => {
    playing = false;
    paint(wantsMusic ? '点击页面播放音乐' : '已暂停 · 点击播放');
  });
  widget.bind(SC.Widget.Events.FINISH, () => {
    playing = false;
    if (!wantsMusic) return;
    widget.seekTo(0);
    widget.play();
  });
  widget.bind(SC.Widget.Events.ERROR, () => {
    playing = false;
    paint('SoundCloud 音源暂时无法播放');
  });
})();
