# Web app for WompWomp (Oct 2015 - Jun 2016)

## Intro
Wompwomp was an Android app and web app for viewing video and image memes. This repo is for the web app codebase. The Android app was on the Play Store. The web app was hosted at https://wompwomp.co and was used mainly for uploading memes to the database.

## Usage
After installing the Android app, users could view memes without needing to sign in. The web app had a sign in for admin users. An admin could sign in and upload memes to the database. These memes would be served to Android app users on a set schedule.

## Tech Stack
* Express(Node.js) server
* Meme media files were uploaded to AWS S3
* Meme entries were saved on a MongoDB instance
* A cron job was set up to release new memes to users

## User base
WompWomp had 10K installs and hosted over 3000 pictures and video memes.

## Challenges
* poor retention
* no path forward — just an entertainment app
* not a solution to any pain point as such

### How to use the codebase ###
* Clone this git repo
* npm install
* npm start
