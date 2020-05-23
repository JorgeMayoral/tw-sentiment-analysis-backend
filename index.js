const Twitter = require("twitter-lite");
const language = require("@google-cloud/language");
const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("build"));

const server = http.createServer(app);
const port = process.env.PORT;

const languageClient = new language.LanguageServiceClient();

const user = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
});

async function getSentiment(text, lang) {
  const document = {
    content: text,
    type: "PLAIN_TEXT",
    language: lang,
  };

  const [result] = await languageClient.analyzeSentiment({
    document: document,
  });
  const sentiment = result.documentSentiment;

  return sentiment.score;
}

async function analyzeTweet(searchTerm, lang) {
  try {
    let response = await user.getBearerToken();
    const app = new Twitter({
      bearer_token: response.access_token,
    });

    response = await app.get("/search/tweets", {
      q: searchTerm, // The search term
      lang: lang, // The tweets language
      count: 100, // Limit the results to 100 tweets
    });

    let allTweets = "";

    for (tweet of response.statuses) {
      allTweets += tweet.text + "\n";
    }

    const sentimentScore = await getSentiment(allTweets, lang);
    return {score: sentimentScore, tweets: response.statuses};
  } catch (e) {
    console.log("There was an error calling the Twitter API.");
    console.dir(e);
  }
}

app.post("/api/analyze", async (req, res) => {
  try {
    const searchTerm = req.body.searchTerm;
    const lang = req.body.language
    const response = await analyzeTweet(searchTerm, lang);
    res.json(response);
  } catch (e) {
    console.log(e);
  }
});

server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});
