// Great Minds Creating — app.js
// All functionality: Firebase auth, admin system, polls, drops, music player, slider

// ============================================
// ADMIN CONFIG
// ============================================

var ADMIN_USERS = {
  'torrancegreen22@yahoo.com': { role: 'super_admin', access: ['all'] },
  'jaybandz635@gmail.com':     { role: 'artist_admin', access: ['Jay Bando Baby'] },
  'beats4bblazo@gmail.com':    { role: 'artist_admin', access: ['B Blazo'] }
};

var currentUser = null;
var currentUserRole = null;
var currentRelease = null;
var playerSpotifyLink = 'https://open.spotify.com';
var playerAudio = null;
var playerIsPlaying = false;
var currentSlide = 0;

// ============================================
// FIREBASE AUTH
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(user) {
      currentUser = user;
      if (user) {
        handleUserLoggedIn(user);
      } else {
        handleUserLoggedOut();
      }
    });
  }

  initSlider();
  initBottomPlayer();
  loadRecentDrops();
  loadPolls();
  loadTopPlayer();
  checkFanSignupCookie();
});

// ============================================
// LOGIN / LOGOUT
// ============================================

function handleLogin(e) {
  e.preventDefault();
  var email = document.getElementById('loginEmail').value;
  var password = document.getElementById('loginPassword').value;
  var btn = document.getElementById('loginSubmitBtn');
  var errorEl = document.getElementById('loginError');

  if (!firebase || !firebase.auth) {
    showLoginError('Firebase not configured.');
    return;
  }

  btn.textContent = 'Logging in...';
  btn.disabled = true;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(function() {
      closeLoginModal();
      document.getElementById('loginForm').reset();
    })
    .catch(function(error) {
      showLoginError(error.message);
      btn.textContent = 'Login';
      btn.disabled = false;
    });
}

function handleLogout() {
  if (!firebase || !firebase.auth) return;
  firebase.auth().signOut();
}

function showLoginError(msg) {
  var el = document.getElementById('loginError');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function handleUserLoggedIn(user) {
  var email = user.email ? user.email.toLowerCase() : '';
  var adminData = ADMIN_USERS[email];

  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'inline-block';

  var mobileBtn = document.getElementById('mobileProfileBtn');
  if (mobileBtn) {
    mobileBtn.querySelector('span').textContent = 'logout';
    mobileBtn.onclick = handleLogout;
  }

  if (adminData) {
    currentUserRole = adminData.role;
    showAdminControls();
  } else {
    currentUserRole = 'fan';
  }
}

function handleUserLoggedOut() {
  document.getElementById('loginBtn').style.display = 'inline-block';
  document.getElementById('logoutBtn').style.display = 'none';
  currentUserRole = null;
  hideAdminControls();

  var mobileBtn = document.getElementById('mobileProfileBtn');
  if (mobileBtn) {
    mobileBtn.querySelector('span').textContent = 'account_circle';
    mobileBtn.onclick = openLoginModal;
  }
}

// ============================================
// ADMIN CONTROLS
// ============================================

function showAdminControls() {
  var adminEls = document.querySelectorAll('.admin-only');
  for (var i = 0; i < adminEls.length; i++) {
    adminEls[i].classList.add('admin-visible');
  }
  var inlineEls = document.querySelectorAll('.btn-admin-inline');
  for (var j = 0; j < inlineEls.length; j++) {
    inlineEls[j].classList.add('admin-visible');
  }
}

function hideAdminControls() {
  var adminEls = document.querySelectorAll('.admin-only, .btn-admin-inline');
  for (var i = 0; i < adminEls.length; i++) {
    adminEls[i].classList.remove('admin-visible');
  }
}

// ============================================
// MODAL CONTROLS
// ============================================

function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
  var errEl = document.getElementById('loginError');
  if (errEl) errEl.classList.add('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function closeFanModal() {
  document.getElementById('fanSignupModal').classList.add('hidden');
  // Set cookie so it doesn't show again for 30 days
  var d = new Date();
  d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
  document.cookie = 'fanSignupSeen=true; expires=' + d.toUTCString() + '; path=/';
}

function checkFanSignupCookie() {
  if (document.cookie.indexOf('fanSignupSeen') === -1) {
    setTimeout(function() {
      var modal = document.getElementById('fanSignupModal');
      if (modal) modal.classList.remove('hidden');
    }, 4000);
  }
}

// ============================================
// FAN SIGNUP
// ============================================

function handleFanSignup(e) {
  e.preventDefault();
  var data = {
    name: document.getElementById('fanName').value,
    phone: document.getElementById('fanPhone').value,
    favoriteArtist: document.getElementById('fanFavoriteArtist').value,
    signupDate: new Date().toISOString(),
    type: 'fan'
  };

  if (typeof firebase !== 'undefined' && firebase.firestore) {
    firebase.firestore().collection('fans').add(data)
      .then(function() {
        closeFanModal();
      })
      .catch(function() {
        closeFanModal();
      });
  } else {
    closeFanModal();
  }
}

// ============================================
// MOBILE MENU
// ============================================

function toggleMobileMenu() {
  var menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('hidden');
}

// ============================================
// HERO SLIDER
// ============================================

function initSlider() {
  var slides = document.querySelectorAll('.slide');
  var dotsContainer = document.getElementById('sliderDots');
  if (!slides.length || !dotsContainer) return;

  for (var i = 0; i < slides.length; i++) {
    var dot = document.createElement('div');
    dot.className = 'w-2 h-2 rounded-full bg-on-surface-variant/40 cursor-pointer transition-all hover:bg-primary';
    if (i === 0) dot.className = 'w-6 h-2 rounded-full bg-primary cursor-pointer transition-all';
    dot.setAttribute('data-index', i);
    dot.addEventListener('click', function() {
      goToSlide(parseInt(this.getAttribute('data-index')));
    });
    dotsContainer.appendChild(dot);
  }

  setInterval(function() {
    var total = document.querySelectorAll('.slide').length;
    goToSlide((currentSlide + 1) % total);
  }, 5000);
}

function shiftSlide(direction) {
  var total = document.querySelectorAll('.slide').length;
  goToSlide((currentSlide + direction + total) % total);
}

function goToSlide(n) {
  var slides = document.querySelectorAll('.slide');
  var dots = document.querySelectorAll('#sliderDots div');
  if (!slides.length) return;

  slides[currentSlide].classList.remove('active');
  currentSlide = n;
  slides[currentSlide].classList.add('active');

  for (var i = 0; i < dots.length; i++) {
    if (i === currentSlide) {
      dots[i].className = 'w-6 h-2 rounded-full bg-primary cursor-pointer transition-all';
    } else {
      dots[i].className = 'w-2 h-2 rounded-full bg-on-surface-variant/40 cursor-pointer transition-all hover:bg-primary';
    }
  }
}

// ============================================
// TOP MUSIC PLAYER
// ============================================

function loadTopPlayer() {
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    setTopPlayerFallback();
    return;
  }

  firebase.firestore()
    .collection('songs')
    .orderBy('releaseDate', 'desc')
    .limit(1)
    .get()
    .then(function(snapshot) {
      if (snapshot.empty) {
        setTopPlayerFallback();
        return;
      }
      var release = snapshot.docs[0].data();
      currentRelease = release;

      var titleEl = document.getElementById('topPlayerTitle');
      var artistEl = document.getElementById('topPlayerArtist');
      var coverEl = document.getElementById('topPlayerCover');
      var linkEl = document.getElementById('topPlayerSpotifyLink');

      if (titleEl) titleEl.textContent = release.title || 'Latest Release';
      if (artistEl) artistEl.textContent = release.artist || 'Great Minds Creating';

      if (coverEl && release.coverImage) {
        coverEl.classList.remove('skeleton');
        coverEl.innerHTML = '<img src="' + release.coverImage + '" alt="Cover" class="w-full h-full object-cover"/>';
      } else if (coverEl) {
        coverEl.classList.remove('skeleton');
      }

      if (linkEl && release.spotifyLink) {
        linkEl.href = release.spotifyLink;
        playerSpotifyLink = release.spotifyLink;
      }

      // Also update hero with latest drop info
      updateHeroWithRelease(release);
      // Also sync bottom player
      updateBottomPlayer(release);
    })
    .catch(function() {
      setTopPlayerFallback();
    });
}

function setTopPlayerFallback() {
  var titleEl = document.getElementById('topPlayerTitle');
  var coverEl = document.getElementById('topPlayerCover');
  if (titleEl) titleEl.textContent = 'Latest Release';
  if (coverEl) coverEl.classList.remove('skeleton');
}

function updateHeroWithRelease(release) {
  var heroTitle = document.getElementById('heroTitle');
  var heroSub = document.getElementById('heroSubtitle');
  var heroBtn = document.getElementById('heroListenBtn');
  if (heroTitle && release.title) heroTitle.textContent = release.title.toUpperCase();
  if (heroSub && release.artist) {
    heroSub.textContent = 'The latest from ' + release.artist + '. Available now on all platforms.';
  }
  if (heroBtn && release.spotifyLink) heroBtn.href = release.spotifyLink;
}

// ============================================
// BOTTOM MUSIC PLAYER
// ============================================

function initBottomPlayer() {
  // Player is initialized after loadTopPlayer populates data
}

function updateBottomPlayer(release) {
  var titleEl = document.getElementById('bottomPlayerTitle');
  var coverEl = document.getElementById('bottomPlayerCover');
  var linkEl = document.getElementById('bottomSpotifyLink');

  if (titleEl) titleEl.textContent = (release.artist || 'GMC') + ' — ' + (release.title || 'Latest Drop');
  if (coverEl && release.coverImage) {
    coverEl.classList.remove('skeleton');
    coverEl.innerHTML = '<img src="' + release.coverImage + '" alt="Cover" class="w-full h-full object-cover rounded"/>';
  } else if (coverEl) {
    coverEl.classList.remove('skeleton');
  }
  if (linkEl && release.spotifyLink) linkEl.href = release.spotifyLink;

  // Wire direct audio if available
  if (release.audioUrl) {
    playerAudio = new Audio(release.audioUrl);
    playerAudio.addEventListener('timeupdate', updateProgressBar);
    playerAudio.addEventListener('ended', function() {
      playerIsPlaying = false;
      updatePlayButton(false);
      resetProgressBar();
    });
  }

  if (release.spotifyLink) playerSpotifyLink = release.spotifyLink;
}

function handlePlayerClick() {
  if (playerAudio) {
    if (playerIsPlaying) {
      playerAudio.pause();
      playerIsPlaying = false;
      updatePlayButton(false);
    } else {
      playerAudio.play().then(function() {
        playerIsPlaying = true;
        updatePlayButton(true);
      }).catch(function() {
        window.open(playerSpotifyLink, '_blank');
      });
    }
  } else {
    window.open(playerSpotifyLink, '_blank');
  }
}

function updatePlayButton(playing) {
  var btn = document.getElementById('bottomPlayBtn');
  if (!btn) return;
  var icon = btn.querySelector('span');
  if (icon) icon.textContent = playing ? 'pause_circle' : 'play_circle';
  var fill = document.getElementById('progressFill');
  if (fill) {
    if (playing) fill.classList.add('playing');
    else fill.classList.remove('playing');
  }
}

function updateProgressBar() {
  if (!playerAudio || playerAudio.duration === 0) return;
  var pct = (playerAudio.currentTime / playerAudio.duration) * 100;
  var fill = document.getElementById('progressFill');
  if (fill) fill.style.width = pct + '%';
}

function resetProgressBar() {
  var fill = document.getElementById('progressFill');
  if (fill) fill.style.width = '0%';
}

// ============================================
// RECENT DROPS
// ============================================

function loadRecentDrops() {
  var container = document.getElementById('latestDrops');
  if (!container) return;

  if (typeof firebase === 'undefined' || !firebase.firestore) {
    showPlaceholderDrops(container);
    return;
  }

  firebase.firestore()
    .collection('songs')
    .orderBy('releaseDate', 'desc')
    .limit(3)
    .get()
    .then(function(snapshot) {
      if (snapshot.empty) {
        showPlaceholderDrops(container);
        return;
      }
      container.innerHTML = '';
      snapshot.forEach(function(doc) {
        var release = doc.data();
        container.appendChild(createDropCard(release));
      });
    })
    .catch(function() {
      showPlaceholderDrops(container);
    });
}

function createDropCard(release) {
  var card = document.createElement('div');
  card.className = 'bg-surface-container-high rounded-xl overflow-hidden shadow-2xl transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,107,53,0.15)]';

  if (release.spotifyLink) {
    // Convert share link to embed link
    var spotifyId = '';
    var parts = release.spotifyLink.split('/');
    var last = parts[parts.length - 1];
    spotifyId = last.split('?')[0];
    var embedType = release.spotifyLink.indexOf('/album/') !== -1 ? 'album' : 'track';
    var embedSrc = 'https://open.spotify.com/embed/' + embedType + '/' + spotifyId + '?utm_source=generator&theme=0';

    card.innerHTML = '<iframe style="border-radius:12px" src="' + embedSrc + '" width="100%" height="152" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>' +
      '<div class="p-4"><p class="font-bebas text-lg text-on-surface">' + (release.title || 'Untitled') + '</p>' +
      '<p class="font-label text-xs uppercase tracking-widest text-primary mt-1">' + (release.artist || '') + '</p></div>';
  } else {
    card.innerHTML = '<div class="h-36 bg-surface-container flex items-center justify-center"><span class="material-symbols-outlined text-4xl text-on-surface-variant/30">music_note</span></div>' +
      '<div class="p-4"><p class="font-bebas text-lg text-on-surface">' + (release.title || 'Untitled') + '</p>' +
      '<p class="font-label text-xs uppercase tracking-widest text-primary mt-1">' + (release.artist || '') + '</p></div>';
  }
  return card;
}

function showPlaceholderDrops(container) {
  // Show a single real Spotify embed as fallback (MIND > MATTER EP)
  container.innerHTML =
    '<div class="bg-surface-container-high rounded-xl overflow-hidden shadow-2xl">' +
    '<iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/6wUYfAEUysLOeR0uK5I7w1?utm_source=generator&theme=0" width="100%" height="352" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>' +
    '<div class="p-4"><p class="font-bebas text-lg text-on-surface">MIND &gt; MATTER</p>' +
    '<p class="font-label text-xs uppercase tracking-widest text-primary mt-1">Great Minds Creating</p></div></div>' +
    '<div class="bg-surface-container-high rounded-xl h-48 skeleton"></div>' +
    '<div class="bg-surface-container-high rounded-xl h-48 skeleton"></div>';
}

// ============================================
// FAN POLLS
// ============================================

var SAMPLE_POLLS = [
  {
    id: 'poll1',
    question: 'Favorite Artist of the Month',
    options: ['casshcreate', 'B Blazo', 'Jay Bando Baby'],
    votes: {}
  },
  {
    id: 'poll2',
    question: 'What Should Drop Next?',
    options: ['New EP', 'Music Video', 'Merch Drop', 'Live Event'],
    votes: {}
  },
  {
    id: 'poll3',
    question: 'What Merch Drop Should Be Next?',
    options: ['Oversized Hoodies', 'Limited Vinyl Box', 'Track Jacket', 'Cargo Set'],
    votes: {}
  }
];

function loadPolls() {
  var container = document.getElementById('pollsContainer');
  if (!container) return;

  if (typeof firebase === 'undefined' || !firebase.firestore) {
    renderPolls(SAMPLE_POLLS, container);
    return;
  }

  firebase.firestore()
    .collection('polls')
    .where('active', '==', true)
    .get()
    .then(function(snapshot) {
      var polls = [];
      if (!snapshot.empty) {
        snapshot.forEach(function(doc) {
          polls.push(Object.assign({ id: doc.id }, doc.data()));
        });
        renderPolls(polls, container);
      } else {
        renderPolls(SAMPLE_POLLS, container);
      }
    })
    .catch(function() {
      renderPolls(SAMPLE_POLLS, container);
    });
}

function renderPolls(polls, container) {
  container.innerHTML = '';
  polls.forEach(function(poll) {
    container.appendChild(createPollCard(poll));
  });
}

function createPollCard(poll) {
  var card = document.createElement('div');
  card.className = 'bg-surface-container-high rounded-xl p-6 border border-outline-variant/20';
  card.setAttribute('data-poll-id', poll.id);

  var votedOption = localStorage.getItem('poll_' + poll.id);
  var totalVotes = 0;
  var voteCounts = {};

  if (poll.votes && typeof poll.votes === 'object') {
    var keys = Object.keys(poll.votes);
    for (var i = 0; i < keys.length; i++) {
      voteCounts[keys[i]] = poll.votes[keys[i]] || 0;
      totalVotes += voteCounts[keys[i]];
    }
  }

  var optionsHTML = '';
  for (var k = 0; k < poll.options.length; k++) {
    var option = poll.options[k];
    var count = voteCounts[option] || 0;
    var pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    var isVoted = votedOption === option;
    var hasVoted = votedOption !== null;

    optionsHTML += '<div class="poll-option border border-outline-variant/30 px-4 py-3 mb-2 rounded ' +
      (isVoted ? 'voted' : '') + '" ' +
      (hasVoted ? '' : 'onclick="castVote(\'' + poll.id + '\', \'' + option.replace(/'/g, "\\'") + '\')"') + '>' +
      '<div class="flex justify-between items-center mb-1">' +
      '<span class="font-label text-sm text-on-surface">' + option + '</span>' +
      (hasVoted ? '<span class="font-label text-xs text-on-surface-variant">' + pct + '%</span>' : '') +
      '</div>' +
      (hasVoted ? '<div class="poll-bar rounded-full"><div class="poll-bar ' + (isVoted ? 'bg-primary-container' : 'bg-surface-bright') + ' h-full rounded-full" style="width:' + pct + '%"></div></div>' : '') +
      '</div>';
  }

  card.innerHTML =
    '<p class="font-label text-xs uppercase tracking-[0.3em] text-primary mb-4">Fan Poll</p>' +
    '<h3 class="font-bebas text-2xl text-on-surface mb-4">' + poll.question + '</h3>' +
    '<div class="space-y-1">' + optionsHTML + '</div>' +
    (totalVotes > 0 ? '<p class="font-label text-xs text-on-surface-variant/50 mt-3 uppercase tracking-widest">' + totalVotes + ' votes cast</p>' : '');

  return card;
}

function castVote(pollId, option) {
  var hasVoted = localStorage.getItem('poll_' + pollId);
  if (hasVoted) return;

  localStorage.setItem('poll_' + pollId, option);

  // Write to Firestore if logged in
  if (typeof firebase !== 'undefined' && firebase.firestore && currentUser) {
    var voteData = {
      pollId: pollId,
      userId: currentUser.uid,
      option: option,
      votedAt: new Date().toISOString()
    };
    firebase.firestore().collection('votes').add(voteData).catch(function() {});

    // Increment vote count on poll document
    var increment = firebase.firestore.FieldValue.increment(1);
    var update = {};
    update['votes.' + option] = increment;
    firebase.firestore().collection('polls').doc(pollId).update(update).catch(function() {});
  }

  // Re-render polls
  loadPolls();
}

// ============================================
// GLOBAL EXPORTS (callable from HTML)
// ============================================

window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.handleFanSignup = handleFanSignup;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.closeFanModal = closeFanModal;
window.toggleMobileMenu = toggleMobileMenu;
window.shiftSlide = shiftSlide;
window.handlePlayerClick = handlePlayerClick;
window.castVote = castVote;
window.currentUser = currentUser;
