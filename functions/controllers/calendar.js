const express = require('express');
const moment = require("moment");
const env = require("../env.js");
const {google} = require("googleapis");
const router = express.Router();
const calendarApi = require("../model/calendar");


router.get('/', (req, res) => {
	calendarApi.authorizeAsync(env.googleCalendar.getCredentials())
		.then((value) => {
			// ** show it if authorized
			res.render('pages/calendar.ejs')
		},
		(reason) => {
			// ** redirect to authorize
			res.render('pages/calendar-not-connected.ejs')
		});
});


router.get('/connected', (req, res) => {
	res.render('pages/calendar-connected.ejs');
});


router.get('/link', (req,res) => {
	calendarApi.authorizeAsync(env.googleCalendar.getCredentials())
		.then((value) => {
				console.log('authorized');
				res.render('pages/calendar-connected.ejs')
			},
			(reason) => {
				console.log('unauthorized');

				const {client_secret, client_id, redirect_uris} = env.googleCalendar.getCredentials().installed;
				const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
				const authUrl = oAuth2Client.generateAuthUrl({access_type: 'offline', scope: calendarApi.SCOPES,});

				res.writeHead(302, {
					'Location': authUrl
				});

				res.end();
			});
});

router.get('/token/set', (req, res) => {
	const {client_secret, client_id, redirect_uris} = env.googleCalendar.getCredentials().installed;
	const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

	let code = req.query.code.toString();
	if (!code) {
		res.status(400).send('No authentication code provided in query string');
		return;
	}


	oAuth2Client.getToken(code, (err, token) => {
		if (err) {
			console.error('Error retrieving access token', err);
			res.status(500).send('Unable to set access token');
			return;
		}

		oAuth2Client.setCredentials(token);

		calendarApi.storeToken(  token, "get").then(
			(result) => {
				res.writeHead(302, {
					'Location': '/calendar/connected'
				});
				res.end();
			},
			(error) => {
				console.log(error);

				res.render('pages/error.ejs', {code: 500, message: error});
			}
		);

	});
});

router.use(express.json());

module.exports = router;