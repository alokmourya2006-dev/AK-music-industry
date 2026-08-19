const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');

// Player Elements
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const playerImg = document.getElementById('playerImg');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const volumeBar = document.getElementById('volumeBar');
const volIcon = document.getElementById('volIcon');
const shareCurrentBtn = document.getElementById('shareCurrentBtn');
const themeSelect = document.getElementById('themeSelect');

let favoriteSongs = JSON.parse(localStorage.getItem('myFavorites')) || [];
let recentHistory = JSON.parse(localStorage.getItem('recentHistory')) || [];
let currentPlaylist = [];
let currentSongIndex = -1;
let player = null;
let isPlaying = false;
let updateInterval = null;

// 1. YouTube API Load
window.onYouTubeIframeAPIReady = function() {
    player = new YT.Player('ytPlayer', {
        height: '1',
        width: '1',
        playerVars: { 'autoplay': 1, 'controls': 0 },
        events: { 'onStateChange': onPlayerStateChange }
    });
};

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        startTimer();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        stopTimer();
    } else if (event.data === YT.PlayerState.ENDED) {
        isPlaying = false;
        playNextSong();
    }
}

// 2. Play Song & History Tracker
function playSongAtIndex(index) {
    if (index < 0 || index >= currentPlaylist.length) return;
    
    currentSongIndex = index;
    const song = currentPlaylist[index];

    songTitle.innerText = song.title;
    songArtist.innerText = song.artist || 'YouTube Music';
    playerImg.src = song.thumbnail;

    // History me Add karein (Duplicates remove karke)
    recentHistory = recentHistory.filter(s => s.id !== song.id);
    recentHistory.unshift(song);
    if (recentHistory.length > 20) recentHistory.pop();
    localStorage.setItem('recentHistory', JSON.stringify(recentHistory));

    if (player && player.loadVideoById) {
        player.loadVideoById(song.id);
    }
}

function playNextSong() {
    if (currentPlaylist.length === 0) return;
    let nextIndex = (currentSongIndex + 1) % currentPlaylist.length;
    playSongAtIndex(nextIndex);
}

function playPrevSong() {
    if (currentPlaylist.length === 0) return;
    let prevIndex = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playSongAtIndex(prevIndex);
}

// 3. Timer & Seek Bar
function startTimer() {
    stopTimer();
    updateInterval = setInterval(() => {
        if (player && player.getCurrentTime && player.getDuration) {
            const currentTime = player.getCurrentTime() || 0;
            const duration = player.getDuration() || 0;

            if (duration > 0) {
                progressBar.value = (currentTime / duration) * 100;
                currentTimeEl.innerText = formatTime(currentTime);
                totalTimeEl.innerText = formatTime(duration);
            }
        }
    }, 500);
}

function stopTimer() {
    if (updateInterval) clearInterval(updateInterval);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

progressBar.addEventListener('input', () => {
    if (player && player.getDuration) {
        const duration = player.getDuration();
        player.seekTo((progressBar.value / 100) * duration, true);
    }
});

volumeBar.addEventListener('input', () => {
    if (player && player.setVolume) {
        const vol = volumeBar.value;
        player.setVolume(vol);
        volIcon.className = vol == 0 ? 'fa-solid fa-volume-xmark' : (vol < 50 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high');
    }
});

playPauseBtn.addEventListener('click', () => {
    if (!player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
});

nextBtn.addEventListener('click', playNextSong);
prevBtn.addEventListener('click', playPrevSong);

// 4. KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
    // Search Box me type karte waqt shortcuts mat chalao
    if (document.activeElement === searchInput) return;

    if (e.code === 'Space') {
        e.preventDefault();
        playPauseBtn.click();
    } else if (e.code === 'ArrowRight') {
        if (player && player.getCurrentTime) {
            player.seekTo(player.getCurrentTime() + 5, true);
        }
    } else if (e.code === 'ArrowLeft') {
        if (player && player.getCurrentTime) {
            player.seekTo(player.getCurrentTime() - 5, true);
        }
    } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        volumeBar.value = Math.min(100, parseInt(volumeBar.value) + 10);
        volumeBar.dispatchEvent(new Event('input'));
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        volumeBar.value = Math.max(0, parseInt(volumeBar.value) - 10);
        volumeBar.dispatchEvent(new Event('input'));
    }
});

// 5. Share & Theme Switcher
function shareSong(songId, title) {
    const songUrl = `https://www.youtube.com/watch?v=${songId}`;
    navigator.clipboard.writeText(songUrl).then(() => {
        alert(`Link copied for "${title}"!`);
    });
}

shareCurrentBtn.addEventListener('click', () => {
    if (currentSongIndex !== -1 && currentPlaylist[currentSongIndex]) {
        shareSong(currentPlaylist[currentSongIndex].id, currentPlaylist[currentSongIndex].title);
    }
});

themeSelect.addEventListener('change', (e) => {
    document.body.className = '';
    if (e.target.value !== 'red') document.body.classList.add(`theme-${e.target.value}`);
});

// 6. Search & Render
async function fetchSongs(query) {
    resultsDiv.innerHTML = '<p style="color: #aaa;">Searching music...</p>';
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const songs = await res.json();
        currentPlaylist = songs;
        renderSongs(songs);
    } catch (error) {
        resultsDiv.innerHTML = '<p style="color: red;">Error loading songs!</p>';
    }
}

function renderSongs(songs) {
    resultsDiv.innerHTML = '';
    if (!songs || songs.length === 0) {
        resultsDiv.innerHTML = '<p style="color: #aaa;">No songs found.</p>';
        return;
    }

    songs.forEach((song, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        const isFav = favoriteSongs.some(f => f.id === song.id);

        card.innerHTML = `
            <img src="${song.thumbnail}" alt="${song.title}">
            <h4>${song.title}</h4>
            <div class="card-actions">
                <span style="font-size: 11px; color: #888;">${song.artist || 'Music'}</span>
                <div>
                    <i class="fa-solid fa-share-nodes share-btn" style="margin-right: 12px;" title="Share"></i>
                    <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart fav-btn" 
                       style="color: ${isFav ? 'var(--primary)' : '#aaa'};"></i>
                </div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('fav-btn') || e.target.classList.contains('share-btn')) return;
            playSongAtIndex(index);
        });

        card.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(song, e.target);
        });

        card.querySelector('.share-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            shareSong(song.id, song.title);
        });

        resultsDiv.appendChild(card);
    });
}

function toggleFavorite(song, btnIcon) {
    const index = favoriteSongs.findIndex(f => f.id === song.id);
    if (index === -1) {
        favoriteSongs.push(song);
        btnIcon.classList.replace('fa-regular', 'fa-solid');
        btnIcon.style.color = 'var(--primary)';
    } else {
        favoriteSongs.splice(index, 1);
        btnIcon.classList.replace('fa-solid', 'fa-regular');
        btnIcon.style.color = '#aaa';
    }
    localStorage.setItem('myFavorites', JSON.stringify(favoriteSongs));
}

// 7. Navigation Listeners
document.querySelectorAll('.nav-menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-menu li').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const opt = item.querySelector('span').innerText;
        if (opt === 'Home') fetchSongs('Latest Songs');
        else if (opt === 'Explore') fetchSongs('Trending Music');
        else if (opt === 'Favorites') {
            currentPlaylist = favoriteSongs;
            renderSongs(favoriteSongs);
        } else if (opt === 'Library') {
            currentPlaylist = recentHistory;
            renderSongs(recentHistory);
        }
    });
});

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        fetchSongs(chip.dataset.genre);
    });
});

searchBtn.addEventListener('click', () => {
    if (searchInput.value.trim()) fetchSongs(searchInput.value.trim());
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) fetchSongs(searchInput.value.trim());
});

fetchSongs('Trending Songs');