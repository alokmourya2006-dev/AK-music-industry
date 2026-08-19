const express = require('express');
const cors = require('cors');
const ytSearch = require('yt-search');
const ytsearch = require('yt-search');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));

// Search YouTube for songs
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Search term missing' });

        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 12).map(video => ({
            id: video.videoId,
            title: video.title,
            artist: video.author.name,
            thumbnail: video.thumbnail
        }));

        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});


app.listen(PORT, () => {
    console.log(`App running at: http://localhost:${PORT}`);
});