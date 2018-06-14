#!/usr/bin/env node

var _ = require('lodash');
var Twit = require('twit');
var credentials = require('./credentials').live;
var wordfilter = require('wordfilter');
var promise = require('bluebird');

var T = new Twit(credentials);

// Take array of phrases, or them together, return a Promise
function phraseSearch(phrases) {
  phrases = phrases.join(" OR ");
  params = {q: phrases, count: 100};
  return T.get('search/tweets', params);
}

function tweetFilter(tweet) {
  // console.log("In tweetFilter looking at:", tweet.text);
  var noGood = wordfilter.blacklisted(tweet.text) || tweet.text.indexOf('@') > -1 || tweet.text.length > 150;
  return !noGood
}

function cleanupCandidates(tweets) {
  var cleanTweets = _.filter(tweets, tweetFilter);
  cleanTweets = _.map(cleanTweets, function(tweet) {return tweet.text;});
  return cleanTweets;
}

function pickAndSubstitute(statuses) {
  console.log("Working with", statuses.length, "tweets pre-filter");
  var cleanTweets = cleanupCandidates(statuses);
  console.log("Working with", cleanTweets.length, "tweets post-filter");
  var statusToUse = _.sample(cleanTweets);

  var subStart = statusToUse.toLowerCase().indexOf("when") + 5;
  // TODO: Truncate at end of sentence or line
  // TODO: Replace ending with : or ... or random emoji
  var textToUse = "mfw " + statusToUse.slice(subStart).replace(/ \#[A-z1-9]+|https:\S+/g, "");

  return textToUse;
}

function getFaceUrl(statuses) {
    var faceTweet = _.sample(statuses);
    var faceUrl = faceTweet.entities.media[0].url;
    console.log("using face img:", faceUrl);
    return faceUrl;
}

function searchFace() {
  // return T.get('search/tweets', {q: "from:TVFaceBot", count: 75});
  return T.get('statuses/user_timeline', {screen_name: "tvfacebot", trim_user:true, exclude_replies: true, count: 75});
}

function composeTweet(text, url) {
  return _.unescape(text) + " " + url;
}

// Search for tweets containing "I love when" or "I hate when"
// get a picture of a face (probably)
// tweet them out together
var text = phraseSearch(['"i love when"', '"i hate when"']);
var url = searchFace();

promise.all([text, url]).then(function(responses) {
  // console.log("Working with responses:", responses);
  var text = pickAndSubstitute(responses[0].data.statuses);
  var url = getFaceUrl(responses[1].data);
  console.log("working with text/url:", text, url);
  var toTweet = composeTweet(text, url);
  T.post('statuses/update', {status: toTweet})
    .then(function(res) {
      console.log("MFW twote!");
      console.log("\t", res.data.text);
    });
});
